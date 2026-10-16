import {
  Firestore,
  Transaction,
  doc,
  DocumentReference
} from '@angular/fire/firestore';


// totalQuantity on a product is the sum of its inventory across every
// warehouse. Each stock change updates it in the same transaction, so
// the Products screen can sort and page without reading every
// inventory record. A transfer between warehouses does not change it.


export function addStockDelta(
  deltas: Map<string, number>,
  productId: string,
  delta: number
) {

  if (
    !productId ||
    !Number.isFinite(delta) ||
    delta === 0
  ) {

    return;

  }

  deltas.set(
    productId,
    (deltas.get(productId) ?? 0) + delta
  );

}


export interface ProductTotalWrite {

  ref: DocumentReference;

  totalQuantity: number;

  stockState: string;

}


// 'active' has stock, 'out' is in stock nowhere, 'inactive' is switched
// off (the product or its category). The Products status filter queries
// this field.
export function stockStateFor(
  isActive: boolean,
  categoryIsActive: boolean,
  totalQuantity: number
): string {

  if (!isActive || !categoryIsActive) {

    return 'inactive';

  }

  return totalQuantity > 0 ? 'active' : 'out';

}


// Call during the read phase of a transaction, before any write.
// Products that have never been given a total (not backfilled yet)
// are left alone, so a sale is never blocked by a missing total.
export async function readProductTotals(
  firestore: Firestore,
  transaction: Transaction,
  deltas: Map<string, number>
): Promise<ProductTotalWrite[]> {

  const writes: ProductTotalWrite[] = [];

  for (const [productId, delta] of deltas) {

    const ref = doc(firestore, 'products', productId);

    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {

      continue;

    }

    const data = snapshot.data();

    if (typeof data['totalQuantity'] !== 'number') {

      continue;

    }

    const totalQuantity = Math.max(
      0,
      data['totalQuantity'] + delta
    );

    writes.push({
      ref,
      totalQuantity,
      stockState: stockStateFor(
        data['isActive'] !== false,
        data['categoryIsActive'] !== false,
        totalQuantity
      )
    });

  }

  return writes;

}


export function writeProductTotals(
  transaction: Transaction,
  writes: ProductTotalWrite[]
) {

  const updatedAt = new Date();

  for (const item of writes) {

    transaction.update(
      item.ref,
      {
        totalQuantity: item.totalQuantity,
        stockState: item.stockState,
        updatedAt
      }
    );

  }

}
