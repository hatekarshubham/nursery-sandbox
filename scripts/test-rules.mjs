// Tests firestore.rules against the Firestore emulator.
//
// Run from the repo root (starts a temporary emulator):
//   firebase emulators:exec --only firestore "node scripts/test-rules.mjs"
//
// Or, with the emulator already running on localhost:8080:
//   cd scripts && node test-rules.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, runTransaction,
  getAggregateFromServer, count, sum
} from 'firebase/firestore';

const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(here, '..', 'firestore.rules'), 'utf8');

const host = (process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080').split(':');

const env = await initializeTestEnvironment({
  projectId: 'rules-test',
  firestore: { rules, host: host[0], port: Number(host[1]) }
});

let passed = 0;
let failed = 0;

async function check(name, expectation, action) {
  try {
    await (expectation === 'allow' ? assertSucceeds(action()) : assertFails(action()));
    passed++;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL  ${name}  (expected ${expectation})`);
    console.log(`        ${String(error.message).split('\n')[0]}`);
  }
}

// ---------- seed (rules disabled) ----------
await env.clearFirestore();
await env.withSecurityRulesDisabled(async context => {
  const db = context.firestore();
  await setDoc(doc(db, 'users/admin1'), { role: 'Admin', name: 'Admin' });
  await setDoc(doc(db, 'users/rep1'), { role: 'SalesPerson', name: 'Rep One' });
  await setDoc(doc(db, 'users/rep2'), { role: 'SalesPerson', name: 'Rep Two' });
  await setDoc(doc(db, 'users/norole'), { name: 'No role' });
  for (const c of ['products', 'categories', 'suppliers', 'warehouses', 'purchases', 'stockTransfers', 'stockAdjustments']) {
    await setDoc(doc(db, `${c}/x1`), { name: 'Existing', status: 'PENDING' });
  }
  await setDoc(doc(db, 'inventory/inv1'), { productId: 'p', warehouseId: 'w', quantity: 10, updatedAt: new Date() });
  await setDoc(doc(db, 'sales/s-rep1'), { createdById: 'rep1', grandTotal: 10, createdAt: new Date() });
  await setDoc(doc(db, 'sales/s-rep2'), { createdById: 'rep2', grandTotal: 20, createdAt: new Date() });
  await setDoc(doc(db, 'sales/s-old'), { grandTotal: 5, createdAt: new Date() });
});

const admin = env.authenticatedContext('admin1').firestore();
const rep = env.authenticatedContext('rep1').firestore();
const noRole = env.authenticatedContext('norole').firestore();
const ghost = env.authenticatedContext('nodoc').firestore();
const anon = env.unauthenticatedContext().firestore();

const viewOnly = ['products', 'categories', 'suppliers', 'warehouses', 'purchases', 'stockTransfers', 'stockAdjustments'];

console.log('\nSigned-out and role-less users');
await check('signed-out cannot read products', 'deny', () => getDoc(doc(anon, 'products/x1')));
await check('user without a role cannot read products', 'deny', () => getDoc(doc(noRole, 'products/x1')));
await check('user without a profile cannot read products', 'deny', () => getDoc(doc(ghost, 'products/x1')));
await check('user without a role cannot create a sale', 'deny', () =>
  setDoc(doc(noRole, 'sales/n1'), { createdById: 'norole', grandTotal: 1 }));

console.log('\nSales person: view-only collections');
for (const c of viewOnly) {
  await check(`rep can read ${c}`, 'allow', () => getDoc(doc(rep, `${c}/x1`)));
  await check(`rep can list ${c}`, 'allow', () => getDocs(collection(rep, c)));
  await check(`rep cannot create in ${c}`, 'deny', () => setDoc(doc(rep, `${c}/new`), { name: 'New' }));
  await check(`rep cannot edit ${c}`, 'deny', () => updateDoc(doc(rep, `${c}/x1`), { name: 'Changed' }));
  await check(`rep cannot delete from ${c}`, 'deny', () => deleteDoc(doc(rep, `${c}/x1`)));
}
await check('rep cannot complete a purchase', 'deny', () => updateDoc(doc(rep, 'purchases/x1'), { status: 'COMPLETED' }));
await check('rep cannot cancel a purchase', 'deny', () => updateDoc(doc(rep, 'purchases/x1'), { status: 'CANCELLED' }));

console.log('\nSales person: inventory');
await check('rep can read inventory', 'allow', () => getDoc(doc(rep, 'inventory/inv1')));
await check('rep can lower quantity (a sale)', 'allow', () =>
  updateDoc(doc(rep, 'inventory/inv1'), { quantity: 7, updatedAt: new Date() }));
await check('rep can lower quantity to exactly 0', 'allow', () =>
  updateDoc(doc(rep, 'inventory/inv1'), { quantity: 0, updatedAt: new Date() }));
await check('rep cannot raise quantity', 'deny', () =>
  updateDoc(doc(rep, 'inventory/inv1'), { quantity: 50, updatedAt: new Date() }));
await check('rep cannot set negative quantity', 'deny', () =>
  updateDoc(doc(rep, 'inventory/inv1'), { quantity: -1, updatedAt: new Date() }));
await check('rep cannot change other inventory fields', 'deny', () =>
  updateDoc(doc(rep, 'inventory/inv1'), { quantity: 0, warehouseId: 'other' }));
await check('rep cannot create inventory', 'deny', () =>
  setDoc(doc(rep, 'inventory/new'), { quantity: 5 }));
await check('rep cannot delete inventory', 'deny', () => deleteDoc(doc(rep, 'inventory/inv1')));

console.log('\nSales person: sales');
await check('rep can create a sale under own ID', 'allow', () =>
  setDoc(doc(rep, 'sales/new1'), { createdById: 'rep1', grandTotal: 99 }));
await check('rep cannot create a sale under another ID', 'deny', () =>
  setDoc(doc(rep, 'sales/new2'), { createdById: 'rep2', grandTotal: 99 }));
await check('rep cannot create a sale without an ID', 'deny', () =>
  setDoc(doc(rep, 'sales/new3'), { grandTotal: 99 }));
await check('rep can read own sale', 'allow', () => getDoc(doc(rep, 'sales/s-rep1')));
await check('rep cannot read another rep\'s sale', 'deny', () => getDoc(doc(rep, 'sales/s-rep2')));
await check('rep cannot read a sale without an owner', 'deny', () => getDoc(doc(rep, 'sales/s-old')));
await check('rep can query own sales', 'allow', () =>
  getDocs(query(collection(rep, 'sales'), where('createdById', '==', 'rep1'))));
await check('rep cannot list all sales', 'deny', () => getDocs(collection(rep, 'sales')));
await check('rep can total own sales', 'allow', () =>
  getAggregateFromServer(query(collection(rep, 'sales'), where('createdById', '==', 'rep1')),
    { n: count(), total: sum('grandTotal') }));
await check('rep cannot total everyone\'s sales', 'deny', () =>
  getAggregateFromServer(collection(rep, 'sales'), { n: count(), total: sum('grandTotal') }));
await check('rep cannot edit a sale', 'deny', () => updateDoc(doc(rep, 'sales/s-rep1'), { grandTotal: 1 }));
await check('rep cannot delete a sale', 'deny', () => deleteDoc(doc(rep, 'sales/s-rep1')));
await check('nobody can delete a sale, not even an admin', 'deny', () => deleteDoc(doc(admin, 'sales/s-rep2')));
await check('rep sale + stock decrease in one transaction', 'allow', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'inventory/inv2'), { quantity: 5, updatedAt: new Date() }));
  return runTransaction(rep, async tx => {
    const snap = await tx.get(doc(rep, 'inventory/inv2'));
    tx.update(doc(rep, 'inventory/inv2'), { quantity: snap.data().quantity - 2, updatedAt: new Date() });
    tx.set(doc(rep, 'sales/tx1'), { createdById: 'rep1', grandTotal: 40 });
  });
});

console.log('\nInvoice counters');
await check('rep can start a series at 1', 'allow', () =>
  setDoc(doc(rep, 'invoiceCounters/W1_26-27'), { prefix: 'W1', financialYear: '26-27', lastNumber: 1, updatedAt: new Date() }));
await check('rep cannot start a series at 50', 'deny', () =>
  setDoc(doc(rep, 'invoiceCounters/W2_26-27'), { lastNumber: 50 }));
await check('rep can move a series up by 1', 'allow', () =>
  updateDoc(doc(rep, 'invoiceCounters/W1_26-27'), { lastNumber: 2, updatedAt: new Date() }));
await check('rep cannot move a series up by 5', 'deny', () =>
  updateDoc(doc(rep, 'invoiceCounters/W1_26-27'), { lastNumber: 7, updatedAt: new Date() }));
await check('rep cannot move a series back', 'deny', () =>
  updateDoc(doc(rep, 'invoiceCounters/W1_26-27'), { lastNumber: 1, updatedAt: new Date() }));
await check('rep cannot delete a counter', 'deny', () => deleteDoc(doc(rep, 'invoiceCounters/W1_26-27')));
await check('signed-out cannot read counters', 'deny', () => getDoc(doc(anon, 'invoiceCounters/W1_26-27')));
await check('user without a role cannot start a series', 'deny', () =>
  setDoc(doc(noRole, 'invoiceCounters/X_26-27'), { lastNumber: 1 }));
await check('admin can set any counter value', 'allow', () =>
  setDoc(doc(admin, 'invoiceCounters/W3_26-27'), { lastNumber: 500 }));

console.log('\nSales person: profile and registries');
await check('rep can read own profile', 'allow', () => getDoc(doc(rep, 'users/rep1')));
await check('rep cannot read another profile', 'deny', () => getDoc(doc(rep, 'users/rep2')));
await check('rep cannot promote self to Admin', 'deny', () => updateDoc(doc(rep, 'users/rep1'), { role: 'Admin' }));
await check('rep cannot create a profile', 'deny', () => setDoc(doc(rep, 'users/rep9'), { role: 'Admin' }));
await check('rep cannot write barcodes', 'deny', () => setDoc(doc(rep, 'barcodes/GN-1'), { barcode: 'GN-1' }));
await check('rep cannot write uniqueKeys', 'deny', () => setDoc(doc(rep, 'uniqueKeys/k'), { ownerPath: 'x' }));
await check('rep cannot read an unknown collection', 'deny', () => getDoc(doc(rep, 'secrets/a')));

console.log('\nAdmin');
for (const c of viewOnly) {
  await check(`admin can create in ${c}`, 'allow', () => setDoc(doc(admin, `${c}/adm`), { name: 'A' }));
  await check(`admin can edit ${c}`, 'allow', () => updateDoc(doc(admin, `${c}/adm`), { name: 'B' }));
  await check(`admin can delete from ${c}`, 'allow', () => deleteDoc(doc(admin, `${c}/adm`)));
}
await check('admin can raise inventory', 'allow', () => updateDoc(doc(admin, 'inventory/inv1'), { quantity: 100 }));
await check('admin can create inventory', 'allow', () => setDoc(doc(admin, 'inventory/a1'), { quantity: 1 }));
await check('admin can read all sales', 'allow', () => getDocs(collection(admin, 'sales')));
await check('admin can total all sales', 'allow', () =>
  getAggregateFromServer(collection(admin, 'sales'), { n: count(), total: sum('grandTotal') }));
await check('admin can edit a sale', 'allow', () => updateDoc(doc(admin, 'sales/s-rep1'), { grandTotal: 11 }));
await check('admin can write barcodes', 'allow', () => setDoc(doc(admin, 'barcodes/GN-2'), { barcode: 'GN-2' }));
await check('admin can write uniqueKeys', 'allow', () => setDoc(doc(admin, 'uniqueKeys/k2'), { ownerPath: 'x' }));
await check('admin can read any profile', 'allow', () => getDoc(doc(admin, 'users/rep1')));
await check('admin can change a role', 'allow', () => updateDoc(doc(admin, 'users/rep2'), { role: 'SalesPerson' }));

console.log('\nStock totals and daily summaries');
await check('admin can set a product total', 'allow', () =>
  updateDoc(doc(admin, 'products/x1'), { totalQuantity: 5, stockState: 'active', updatedAt: new Date() }));
await check('rep can lower a product total', 'allow', () =>
  updateDoc(doc(rep, 'products/x1'), { totalQuantity: 4, stockState: 'active', updatedAt: new Date() }));
await check('rep cannot raise a product total', 'deny', () =>
  updateDoc(doc(rep, 'products/x1'), { totalQuantity: 9, stockState: 'active', updatedAt: new Date() }));
await check('rep cannot rename a product', 'deny', () =>
  updateDoc(doc(rep, 'products/x1'), { name: 'Hacked' }));
await check('rep can write own daily summary', 'allow', () =>
  setDoc(doc(rep, 'dailySummaries/rep1_w_2026-10-16'), { createdById: 'rep1', day: '2026-10-16', invoiceCount: 1 }));
await check('admin can write another sellers summary', 'allow', () =>
  setDoc(doc(admin, 'dailySummaries/rep2_w_2026-10-16'), { createdById: 'rep2', day: '2026-10-16', invoiceCount: 1 }));
await check('rep cannot write another daily summary', 'deny', () =>
  setDoc(doc(rep, 'dailySummaries/rep2_w_2026-10-16'), { createdById: 'rep2', invoiceCount: 9 }));
await check('rep cannot read another daily summary', 'deny', () =>
  getDoc(doc(rep, 'dailySummaries/rep2_w_2026-10-16')));

await env.cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
