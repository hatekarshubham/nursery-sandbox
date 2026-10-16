// One document per seller, per warehouse, per day. Sales History adds
// these up for ranges longer than about three months, instead of
// reading every sale. The day is the shop's day (India), not UTC.

export const DAILY_SUMMARIES_COLLECTION = 'dailySummaries';


export function businessDay(date: Date): string {

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(date);

}


export function summaryDocId(
  userId: string,
  warehouseId: string,
  day: string
): string {

  return `${userId}_${warehouseId}_${day}`;

}


export interface SummaryBucket {

  name: string;

  quantity: number;

  amount: number;

}


// Adds one sale onto a summary. `existing` is the current document
// (or null when this is the day's first sale for that seller).
export function addSaleToSummary(
  existing: Record<string, any> | null,
  sale: {
    createdById: string;
    warehouseId: string;
    grandTotal: number;
    gstAmount: number;
    items: Array<Record<string, any>>;
  },
  day: string
): Record<string, any> {

  const categories: Record<string, SummaryBucket> = {
    ...(existing?.['categories'] ?? {})
  };

  const suppliers: Record<string, SummaryBucket> = {
    ...(existing?.['suppliers'] ?? {})
  };

  let quantitySold = Number(existing?.['quantitySold'] ?? 0);

  for (const item of sale.items ?? []) {

    const quantity = Number(item['quantity'] ?? 0);

    const amount = Number(item['total'] ?? 0);

    quantitySold += quantity;

    const categoryKey =
      String(item['categoryId'] || item['categoryName'] || 'uncategorised');

    const category = categories[categoryKey] ?? {
      name: String(item['categoryName'] || 'Uncategorised'),
      quantity: 0,
      amount: 0
    };

    category.quantity += quantity;

    category.amount += amount;

    categories[categoryKey] = category;

    const supplierKey =
      String(item['supplierId'] || item['supplierName'] || 'none');

    const supplier = suppliers[supplierKey] ?? {
      name: String(item['supplierName'] || 'No supplier'),
      quantity: 0,
      amount: 0
    };

    supplier.quantity += quantity;

    supplier.amount += amount;

    suppliers[supplierKey] = supplier;

  }

  return {
    createdById: sale.createdById,
    warehouseId: sale.warehouseId,
    day,
    invoiceCount: Number(existing?.['invoiceCount'] ?? 0) + 1,
    grandTotal:
      Number(existing?.['grandTotal'] ?? 0) +
      Number(sale.grandTotal ?? 0),
    gstAmount:
      Number(existing?.['gstAmount'] ?? 0) +
      Number(sale.gstAmount ?? 0),
    quantitySold,
    categories,
    suppliers,
    updatedAt: new Date()
  };

}
