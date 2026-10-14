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

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

initializeApp({ projectId, credential: applicationDefault() });
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
      const update = buildUpdate(doc.data());
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

await backfill('products', (data) => {
  const nameLower = normalizeName(data.name);
  const searchPrefixes = buildSearchPrefixes(data.name);
  if (data.nameLower === nameLower && sameList(data.searchPrefixes, searchPrefixes)) return null;
  return { nameLower, searchPrefixes };
});

console.log('Done.');
