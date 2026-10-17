// One-off backfill for existing data. Safe to re-run (idempotent).
//
//   sales.expiresAt     = createdAt + 3 years   (needed before enabling the TTL policy)
//   products.nameLower       = lower-case product name
//   products.searchPrefixes  = word prefixes of the name (used by the product picker search)
//
// Dry run (default, writes nothing):
//   node backfill.mjs --project <projectId>
//
// Apply to the local emulator:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 node backfill.mjs --project <projectId> --apply
//
// Apply to production (uses `gcloud auth application-default login`):
//   node backfill.mjs --project <projectId> --apply
//
// Only documents that are missing the field are touched, so the cost is
// one read per document plus one write per document that needs it.

import { randomUUID } from 'node:crypto';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const RETENTION_YEARS = 3;
const BATCH_SIZE = 400;
const PAGE_SIZE = 1000;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const projectIndex = args.indexOf('--project');
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : process.env.GCLOUD_PROJECT;

if (!projectId) {
  console.error('Missing --project <projectId>');
  process.exit(1);
}

initializeApp({
  projectId,
  credential: applicationDefault(),
  storageBucket: `${projectId}.firebasestorage.app`
});
const db = getFirestore();

const target = process.env.FIRESTORE_EMULATOR_HOST
  ? `EMULATOR ${process.env.FIRESTORE_EMULATOR_HOST}`
  : `PRODUCTION project ${projectId}`;
console.log(`${apply ? 'APPLY' : 'DRY RUN'} against ${target}`);

function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Must match buildSearchPrefixes() in product.service.ts
function buildSearchPrefixes(name) {
  const words = String(name ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  const prefixes = new Set();
  for (const word of words) {
    for (let length = 1; length <= Math.min(word.length, 10); length++) {
      prefixes.add(word.slice(0, length));
    }
  }
  return [...prefixes];
}

function sameList(a, b) {
  return Array.isArray(a) && a.length === b.length && b.every(value => a.includes(value));
}

function toDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function backfill(collectionName, buildUpdate) {
  let scanned = 0;
  let changed = 0;
  let last = null;
  let batch = db.batch();
  let pending = 0;

  for (;;) {
    let query = db.collection(collectionName).orderBy('__name__').limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      scanned++;
      const update = buildUpdate(doc.data(), doc.id);
      if (!update) continue;
      changed++;
      if (apply) {
        batch.update(doc.ref, update);
        pending++;
        if (pending >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
    }
    last = snap.docs[snap.docs.length - 1];
  }

  if (apply && pending > 0) await batch.commit();
  console.log(`${collectionName}: scanned ${scanned}, ${apply ? 'updated' : 'would update'} ${changed}`);
}

await backfill('sales', (data) => {
  if (data.expiresAt) return null;
  const created = toDate(data.createdAt);
  if (!created) return null;
  const expiry = new Date(created);
  expiry.setFullYear(expiry.getFullYear() + RETENTION_YEARS);
  return { expiresAt: expiry };
});

const stockByProduct = new Map();
const inventorySnapshot = await db.collection('inventory').get();
for (const entry of inventorySnapshot.docs) {
  const data = entry.data();
  const productId = data.productId;
  if (!productId) continue;
  stockByProduct.set(
    productId,
    (stockByProduct.get(productId) ?? 0) + Number(data.quantity ?? 0)
  );
}

const categoryActive = new Map();
const categorySnapshot = await db.collection('categories').get();
for (const entry of categorySnapshot.docs) {
  categoryActive.set(entry.id, entry.data().isActive !== false);
}

function stockState(data, totalQuantity) {
  const categoryIsActive = data.categoryId
    ? categoryActive.get(data.categoryId) !== false
    : data.categoryIsActive !== false;
  if (data.isActive === false || !categoryIsActive) return 'inactive';
  return totalQuantity > 0 ? 'active' : 'out';
}

await backfill('products', (data, id) => {
  const nameLower = normalizeName(data.name);
  const searchPrefixes = buildSearchPrefixes(data.name);
  const totalQuantity = stockByProduct.get(id) ?? 0;
  const categoryIsActive = data.categoryId
    ? categoryActive.get(data.categoryId) !== false
    : true;
  const state = stockState(data, totalQuantity);
  if (
    data.nameLower === nameLower &&
    sameList(data.searchPrefixes, searchPrefixes) &&
    data.totalQuantity === totalQuantity &&
    data.categoryIsActive === categoryIsActive &&
    data.stockState === state
  ) {
    return null;
  }
  return {
    nameLower,
    searchPrefixes,
    totalQuantity,
    categoryIsActive,
    stockState: state
  };
});

// Move a picture saved inside the product document out to Storage.
// An empty image is left alone. A web address is copied into imageUrl.
// A data:image value is uploaded, then removed from the document.
const imageSnapshot = await db.collection('products').get();
let imagesToMove = 0;
const bucket = getStorage().bucket();

function storedImageUrl(objectPath, token) {
  const encoded = encodeURIComponent(objectPath);
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (host) {
    return `http://${host}/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

for (const entry of imageSnapshot.docs) {
  if (!Object.prototype.hasOwnProperty.call(entry.data(), 'image')) continue;
  const image = String(entry.data().image ?? '');
  if (!image || entry.data().imageUrl) {
    imagesToMove++;
    if (apply) await entry.ref.update({ image: FieldValue.delete() });
    continue;
  }
  imagesToMove++;
  if (!apply) continue;

  if (/^https?:\/\//i.test(image)) {
    await entry.ref.update({ imageUrl: image, image: FieldValue.delete() });
    continue;
  }

  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) continue;

  const contentType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
  const version = Date.now();
  const token = randomUUID();

  async function upload(kind) {
    const objectPath = `products/${entry.id}/${kind}.${extension}`;
    await bucket.file(objectPath).save(bytes, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    return `${storedImageUrl(objectPath, token)}&v=${version}`;
  }

  const imageUrl = await upload('main');
  const thumbUrl = await upload('thumb');
  await entry.ref.update({
    image: FieldValue.delete(),
    imageUrl,
    thumbUrl,
    imageVersion: version
  });
}

console.log(`product images: ${apply ? 'moved' : 'would move'} ${imagesToMove}`);

// Rebuild daily summaries from every sale. Safe to re-run:
// each document is rewritten to the total of its sales.
function businessDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

const summaries = new Map();
const salesSnapshot = await db.collection('sales').get();
for (const entry of salesSnapshot.docs) {
  const sale = entry.data();
  if (!sale.createdById || !sale.warehouseId) continue;
  const created = toDate(sale.createdAt);
  if (!created) continue;
  const day = businessDay(created);
  const id = `${sale.createdById}_${sale.warehouseId}_${day}`;
  const current = summaries.get(id) ?? {
    createdById: sale.createdById,
    warehouseId: sale.warehouseId,
    day,
    invoiceCount: 0,
    grandTotal: 0,
    gstAmount: 0,
    quantitySold: 0,
    categories: {},
    suppliers: {}
  };
  current.invoiceCount += 1;
  current.grandTotal += Number(sale.grandTotal ?? 0);
  current.gstAmount += Number(sale.gstAmount ?? 0);
  for (const item of sale.items ?? []) {
    const quantity = Number(item.quantity ?? 0);
    const amount = Number(item.total ?? 0);
    current.quantitySold += quantity;
    const categoryKey = String(item.categoryId || item.categoryName || 'uncategorised');
    const category = current.categories[categoryKey] ?? {
      name: String(item.categoryName || 'Uncategorised'),
      quantity: 0,
      amount: 0
    };
    category.quantity += quantity;
    category.amount += amount;
    current.categories[categoryKey] = category;
    const supplierKey = String(item.supplierId || item.supplierName || 'none');
    const supplier = current.suppliers[supplierKey] ?? {
      name: String(item.supplierName || 'No supplier'),
      quantity: 0,
      amount: 0
    };
    supplier.quantity += quantity;
    supplier.amount += amount;
    current.suppliers[supplierKey] = supplier;
  }
  summaries.set(id, current);
}

console.log(`dailySummaries: ${summaries.size} document(s) from ${salesSnapshot.size} sale(s)`);
if (apply) {
  let batch = db.batch();
  let pending = 0;
  for (const [id, summary] of summaries) {
    batch.set(db.collection('dailySummaries').doc(id), {
      ...summary,
      updatedAt: new Date()
    });
    pending++;
    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();
}

console.log('Done.');
