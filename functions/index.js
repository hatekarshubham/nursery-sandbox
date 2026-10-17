// Fills the daily summary for a sale the app did not already
// summarise. The app writes the summary in the same transaction
// as the sale and sets summaryApplied, so this usually does
// nothing. It covers a sale created some other way.
//
// Deploy with: firebase deploy --only functions

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

function businessDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

exports.summariseSale = onDocumentCreated('sales/{saleId}', async (event) => {
  const sale = event.data?.data();

  if (!sale || sale.summaryApplied === true) {
    return;
  }

  if (!sale.createdById || !sale.warehouseId || !sale.createdAt) {
    return;
  }

  const createdAt = sale.createdAt.toDate
    ? sale.createdAt.toDate()
    : new Date(sale.createdAt);

  const day = businessDay(createdAt);
  const ref = getFirestore()
    .collection('dailySummaries')
    .doc(`${sale.createdById}_${sale.warehouseId}_${day}`);

  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? snapshot.data() : {};
    const categories = { ...(existing.categories ?? {}) };
    const suppliers = { ...(existing.suppliers ?? {}) };
    let quantitySold = Number(existing.quantitySold ?? 0);

    for (const item of sale.items ?? []) {
      const quantity = Number(item.quantity ?? 0);
      const amount = Number(item.total ?? 0);
      quantitySold += quantity;

      const categoryKey = String(item.categoryId || item.categoryName || 'uncategorised');
      const category = categories[categoryKey] ?? {
        name: String(item.categoryName || 'Uncategorised'),
        quantity: 0,
        amount: 0
      };
      category.quantity += quantity;
      category.amount += amount;
      categories[categoryKey] = category;

      const supplierKey = String(item.supplierId || item.supplierName || 'none');
      const supplier = suppliers[supplierKey] ?? {
        name: String(item.supplierName || 'No supplier'),
        quantity: 0,
        amount: 0
      };
      supplier.quantity += quantity;
      supplier.amount += amount;
      suppliers[supplierKey] = supplier;
    }

    transaction.set(ref, {
      createdById: sale.createdById,
      warehouseId: sale.warehouseId,
      day,
      invoiceCount: Number(existing.invoiceCount ?? 0) + 1,
      grandTotal: Number(existing.grandTotal ?? 0) + Number(sale.grandTotal ?? 0),
      gstAmount: Number(existing.gstAmount ?? 0) + Number(sale.gstAmount ?? 0),
      quantitySold,
      categories,
      suppliers,
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  await event.data.ref.update({ summaryApplied: true });
});
