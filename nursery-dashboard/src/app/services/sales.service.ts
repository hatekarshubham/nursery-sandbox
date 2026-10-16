import { Injectable, inject } from '@angular/core';

import { RoleService } from './role.service';

import { WarehouseService } from './warehouse.service';

import {
  addStockDelta,
  readProductTotals,
  writeProductTotals
} from './stock-total';

import {
  DAILY_SUMMARIES_COLLECTION,
  addSaleToSummary,
  businessDay,
  summaryDocId
} from './daily-summary';

import {
  INVOICE_COUNTERS_COLLECTION,
  financialYearLabel,
  formatInvoiceNumber,
  invoicePrefixFor,
  invoiceSeriesId
} from './invoice-number';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
  DocumentData,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getAggregateFromServer,
  count,
  sum,
  runTransaction
} from '@angular/fire/firestore';

import { Observable, firstValueFrom } from 'rxjs';


// =======================================================
// SALE ITEM
// =======================================================

export interface SaleItem {

  productId: string;

  productName: string;

  barcode: string;

  // Copied from the product at sale time so later
  // category or supplier edits do not change history.
  categoryId?: string;

  categoryName?: string;

  supplierId?: string;

  supplierName?: string;

  quantity: number;

  unitPrice: number;

  gst: number;

  gstAmount: number;

  subtotal: number;

  total: number;

}


// =======================================================
// SALE
// =======================================================

export interface Sale {

  id?: string;

  invoiceNumber: string;


  // =====================================================
  // CUSTOMER
  // =====================================================
  //
  // IMPORTANT:
  //
  // Client currently does NOT want customer information
  // stored inside Firestore sales documents.
  //
  // Customer name and mobile will only be kept temporarily
  // inside CreateSaleComponent so that they can be printed
  // on the invoice.
  //
  // Keep these commented in case the client later agrees
  // to store customer information.
  //
  // =====================================================

  // customerName: string;

  // customerMobile: string;


  // =====================================================
  // WAREHOUSE
  // =====================================================

  warehouseId: string;

  warehouseName: string;


  // Signed-in user who completed the sale.
  createdById?: string;

  createdByName?: string;


  // =====================================================
  // ITEMS
  // =====================================================

  items: SaleItem[];


  // =====================================================
  // TOTALS
  // =====================================================

  subtotal: number;

  gstAmount: number;

  discount: number;

  grandTotal: number;


  // =====================================================
  // PAYMENT
  // =====================================================

  paymentMode: string;


  // =====================================================
  // TIMESTAMPS
  // =====================================================

  createdAt?: any;

  updatedAt?: any;

  // When the Firestore TTL policy deletes this sale (3 years).
  expiresAt?: any;

}


// =======================================================
// CREATE SALE INPUT
// =======================================================
//
// This represents exactly what CreateSaleComponent sends
// to SalesService.
//
// Customer name/mobile are intentionally NOT included
// because they must not be stored in Firestore.
//
// =======================================================

export type CreateSaleInput =
  Omit<
    Sale,
    'id' |
    'invoiceNumber' |
    'createdAt' |
    'updatedAt'
  >;


// =======================================================
// COMPLETE SALE RESULT
// =======================================================

export interface CompleteSaleResult {

  saleId: string;

  invoiceNumber: string;

}


// =======================================================
// SERVICE
// =======================================================

// Sales are kept this long, then removed by the Firestore TTL policy.
export const SALES_RETENTION_YEARS = 3;

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private firestore =
    inject(Firestore);


  private roles = inject(RoleService);

  private warehouseService = inject(WarehouseService);

  private salesCollection =
    collection(
      this.firestore,
      'sales'
    ) as CollectionReference<DocumentData>;


  // =====================================================
  // GET SALES
  // =====================================================

  getSales(): Observable<Sale[]> {

    return collectionData(
      this.roles.isAdmin
        ? this.salesCollection
        : query(
            this.salesCollection,
            where(
              'createdById',
              '==',
              this.roles.userId
            )
          ),
      {
        idField: 'id'
      }
    ) as Observable<Sale[]>;

  }


  // =====================================================
  // GET SALES BY DATE RANGE
  // =====================================================
  //
  // One-shot read. Sales History uses this so a filter
  // inside an already loaded window does not query again.
  //
  // =====================================================

  async getSalesByDateRange(
    start: Date,
    end: Date
  ): Promise<Sale[]> {

    // A sales person may only read their own sales (the
    // security rules enforce it, and a query that could return
    // anyone else's sale is rejected), so the query is limited
    // to their user ID. An admin reads every sale.
    const ownSalesOnly =
      this.roles.isAdmin
        ? []
        : [
            where(
              'createdById',
              '==',
              this.roles.userId
            )
          ];

    const salesQuery = query(
      this.salesCollection,
      ...ownSalesOnly,
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(salesQuery);

    return snapshot.docs.map(
      document => ({
        id: document.id,
        ...document.data()
      })
    ) as Sale[];

  }


  // =====================================================
  // SALES TOTALS FOR A DATE RANGE
  // =====================================================
  //
  // Counts and adds up sales on the server. Firestore bills this
  // as one read per 1,000 matching sales instead of one read per
  // sale, so a year of sales costs hundreds of reads, not
  // hundreds of thousands.
  //
  // =====================================================

  async getSalesTotals(
    start: Date,
    end: Date
  ): Promise<{
    count: number;
    total: number;
    gst: number;
  }> {

    const ownSalesOnly =
      this.roles.isAdmin
        ? []
        : [
            where(
              'createdById',
              '==',
              this.roles.userId
            )
          ];

    const totalsQuery = query(
      this.salesCollection,
      ...ownSalesOnly,
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    );

    const result = await getAggregateFromServer(
      totalsQuery,
      {
        count: count(),
        total: sum('grandTotal'),
        gst: sum('gstAmount')
      }
    );

    const data = result.data();

    return {
      count: data.count,
      total: Number(data.total ?? 0),
      gst: Number(data.gst ?? 0)
    };

  }


  // Daily summaries for a date range. One document per seller,
  // warehouse and day, so a year is a few hundred reads rather
  // than one read per sale. A sales person only gets their own.
  async getDailySummaries(
    start: Date,
    end: Date,
    warehouseId = ''
  ): Promise<Array<Record<string, any>>> {

    const constraints = [];

    if (!this.roles.isAdmin) {

      constraints.push(
        where('createdById', '==', this.roles.userId)
      );

    }

    if (warehouseId) {

      constraints.push(
        where('warehouseId', '==', warehouseId)
      );

    }

    constraints.push(
      where('day', '>=', businessDay(start)),
      where('day', '<=', businessDay(end))
    );

    const snapshot = await getDocs(
      query(
        collection(this.firestore, DAILY_SUMMARIES_COLLECTION),
        ...constraints
      )
    );

    return snapshot.docs.map(
      entry => ({ id: entry.id, ...entry.data() })
    );

  }


  // =====================================================
  // COMPLETE SALE
  // =====================================================
  //
  // This method performs:
  //
  // 1. Validate sale
  // 2. Find inventory records
  // 3. Read latest inventory inside transaction
  // 4. Validate latest stock
  // 5. Decrease inventory
  // 6. Create sales document
  //
  // Inventory update + sale creation happen inside ONE
  // Firestore transaction.
  //
  // If anything fails, Firestore does not commit the
  // transaction.
  //
  // =====================================================

  async completeSale(
    sale: CreateSaleInput
  ): Promise<CompleteSaleResult> {


    // ===================================================
    // BASIC VALIDATION
    // ===================================================

    if (!sale.warehouseId) {

      throw new Error(
        'Warehouse is required.'
      );

    }


    if (
      !sale.items ||
      sale.items.length === 0
    ) {

      throw new Error(
        'Sale must contain at least one product.'
      );

    }


    if (
      !Number.isFinite(
        sale.grandTotal
      ) ||
      sale.grandTotal < 0
    ) {

      throw new Error(
        'Invalid grand total.'
      );

    }


    // ===================================================
    // VALIDATE ITEMS
    // ===================================================

    for (
      const item of
      sale.items
    ) {

      if (!item.productId) {

        throw new Error(
          'Product ID is missing.'
        );

      }


      if (
        !Number.isInteger(
          item.quantity
        ) ||
        item.quantity <= 0
      ) {

        throw new Error(
          `Invalid quantity for ${item.productName}.`
        );

      }

    }


    // ===================================================
    // GENERATE INVOICE NUMBER
    // ===================================================

    const saleDate = new Date();

    // The invoice number is taken from the warehouse's own
    // counter inside the transaction below (consecutive, no
    // gaps). The warehouse list is already cached, so this
    // lookup costs no extra reads.
    const warehouses =
      await firstValueFrom(
        this.warehouseService.getWarehouses()
      );

    const invoicePrefix =
      invoicePrefixFor(
        warehouses.find(
          warehouse =>
            warehouse.id === sale.warehouseId
        )
      );

    const financialYear =
      financialYearLabel(saleDate);

    const counterRef =
      doc(
        this.firestore,
        INVOICE_COUNTERS_COLLECTION,
        invoiceSeriesId(
          invoicePrefix,
          financialYear
        )
      );

    let invoiceNumber = '';


    // ===================================================
    // FIND INVENTORY DOCUMENTS
    // ===================================================
    //
    // Find the inventory document corresponding to each
    // product in the selected warehouse.
    //
    // Current inventory design expects:
    //
    // ONE inventory document
    // per
    // product + warehouse
    //
    // ===================================================

    const inventoryDocuments: {

      productId: string;

      productName: string;

      quantityToSell: number;

      inventoryId: string;

    }[] = [];


    for (
      const item of
      sale.items
    ) {

      const inventoryCollection =
        collection(
          this.firestore,
          'inventory'
        );


      const inventoryQuery =
        query(
          inventoryCollection,

          where(
            'productId',
            '==',
            item.productId
          ),

          where(
            'warehouseId',
            '==',
            sale.warehouseId
          )
        );


      const snapshot =
        await getDocs(
          inventoryQuery
        );


      // =================================================
      // INVENTORY NOT FOUND
      // =================================================

      if (snapshot.empty) {

        throw new Error(
          `No inventory found for ${item.productName} in the selected warehouse.`
        );

      }


      // =================================================
      // DUPLICATE INVENTORY CHECK
      // =================================================
      //
      // We expect only one inventory document for:
      //
      // productId + warehouseId
      //
      // =================================================

      if (
        snapshot.docs.length > 1
      ) {

        throw new Error(
          `Multiple inventory records found for ${item.productName}.`
        );

      }


      inventoryDocuments.push({

        productId:
          item.productId,

        productName:
          item.productName,

        quantityToSell:
          item.quantity,

        inventoryId:
          snapshot.docs[0].id

      });

    }


    // ===================================================
    // CREATE SALE DOCUMENT REFERENCE
    // ===================================================

    const saleRef =
      doc(
        this.salesCollection
      );


    // ===================================================
    // FIRESTORE TRANSACTION
    // ===================================================

    await runTransaction(
      this.firestore,

      async transaction => {


        // =================================================
        // INVENTORY SNAPSHOTS
        // =================================================
        //
        // Firestore requires transaction reads before
        // transaction writes.
        //
        // Therefore:
        //
        // FIRST  -> read all inventory
        // SECOND -> validate all inventory
        // THIRD  -> update inventory
        // FOURTH -> create sale
        //
        // =================================================

        const inventorySnapshots: {

          inventoryId: string;

          productId: string;

          productName: string;

          quantityToSell: number;

          currentQuantity: number;

        }[] = [];


        // =================================================
        // READ ALL INVENTORY
        // =================================================

        for (
          const inventoryDocument of
          inventoryDocuments
        ) {

          const inventoryRef =
            doc(
              this.firestore,
              'inventory',
              inventoryDocument.inventoryId
            );


          const inventorySnapshot =
            await transaction.get(
              inventoryRef
            );


          // ===============================================
          // INVENTORY DOCUMENT REMOVED
          // ===============================================

          if (
            !inventorySnapshot.exists()
          ) {

            throw new Error(
              `Inventory record no longer exists for ${inventoryDocument.productName}.`
            );

          }


          const inventoryData =
            inventorySnapshot.data();


          const currentQuantity =
            Number(
              inventoryData['quantity'] ?? 0
            );


          // ===============================================
          // FINAL STOCK VALIDATION
          // ===============================================
          //
          // This is the important stock check.
          //
          // Even if another user sold the same product
          // after this screen loaded, the transaction reads
          // the latest Firestore quantity.
          //
          // ===============================================

          if (
            currentQuantity <
            inventoryDocument.quantityToSell
          ) {

            throw new Error(
              `Insufficient stock for ${inventoryDocument.productName}. Available quantity: ${currentQuantity}.`
            );

          }


          inventorySnapshots.push({

            inventoryId:
              inventoryDocument.inventoryId,

            productId:
              inventoryDocument.productId,

            productName:
              inventoryDocument.productName,

            quantityToSell:
              inventoryDocument.quantityToSell,

            currentQuantity

          });

        }


        // =================================================
        // NEXT INVOICE NUMBER
        // =================================================

        const counterSnapshot =
          await transaction.get(counterRef);

        const nextSerial =
          Number(
            counterSnapshot.exists()
              ? counterSnapshot.data()['lastNumber']
              : 0
          ) + 1;

        invoiceNumber =
          formatInvoiceNumber(
            invoicePrefix,
            financialYear,
            nextSerial
          );


        // The product's stored total drops by what this sale
        // takes. Read before any write (transaction rule).
        const stockDeltas = new Map<string, number>();

        for (const item of sale.items) {

          addStockDelta(
            stockDeltas,
            item.productId,
            -item.quantity
          );

        }

        const productTotals =
          await readProductTotals(
            this.firestore,
            transaction,
            stockDeltas
          );


        // Daily summary for this seller, warehouse and day.
        // Written in this same transaction, so it cannot
        // disagree with the sale. The Cloud Function skips
        // a sale that already has summaryApplied set.
        const summaryDay = businessDay(saleDate);

        const summaryRef =
          sale.createdById
            ? doc(
                this.firestore,
                DAILY_SUMMARIES_COLLECTION,
                summaryDocId(
                  sale.createdById,
                  sale.warehouseId,
                  summaryDay
                )
              )
            : null;

        const summarySnapshot =
          summaryRef
            ? await transaction.get(summaryRef)
            : null;

        const summaryWrite =
          summaryRef
            ? addSaleToSummary(
                summarySnapshot!.exists()
                  ? summarySnapshot!.data()
                  : null,
                {
                  createdById: sale.createdById ?? '',
                  warehouseId: sale.warehouseId,
                  grandTotal: sale.grandTotal,
                  gstAmount: sale.gstAmount,
                  items: sale.items
                },
                summaryDay
              )
            : null;


        // =================================================
        // ALL READS COMPLETE
        // =================================================
        //
        // From this point we can start writing.
        //
        // =================================================


        transaction.set(
          counterRef,
          {
            prefix: invoicePrefix,
            financialYear,
            lastNumber: nextSerial,
            updatedAt: new Date()
          }
        );

        writeProductTotals(
          transaction,
          productTotals
        );

        if (summaryRef && summaryWrite) {

          transaction.set(
            summaryRef,
            summaryWrite
          );

        }


        // =================================================
        // DECREASE INVENTORY
        // =================================================

        for (
          const inventorySnapshot of
          inventorySnapshots
        ) {

          const inventoryRef =
            doc(
              this.firestore,
              'inventory',
              inventorySnapshot.inventoryId
            );


          const newQuantity =
            inventorySnapshot.currentQuantity -
            inventorySnapshot.quantityToSell;


          transaction.update(
            inventoryRef,
            {

              quantity:
                newQuantity,

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // CREATE SALE DOCUMENT
        // =================================================

        transaction.set(
          saleRef,
          {

            // =============================================
            // INVOICE
            // =============================================

            invoiceNumber,


            // =============================================
            // CUSTOMER
            // =============================================
            //
            // IMPORTANT:
            //
            // Client currently does NOT want customer
            // information stored in Firestore.
            //
            // Customer name/mobile are kept only inside
            // CreateSaleComponent for invoice printing.
            //
            // If the client agrees later, these can simply
            // be uncommented.
            //
            // =============================================

            // customerName:
            //   sale.customerName ?? '',

            // customerMobile:
            //   sale.customerMobile ?? '',


            // =============================================
            // WAREHOUSE
            // =============================================

            warehouseId:
              sale.warehouseId,

            warehouseName:
              sale.warehouseName ?? '',

            createdById:
              sale.createdById ?? '',

            createdByName:
              sale.createdByName ?? '',


            // =============================================
            // ITEMS
            // =============================================

            items:
              sale.items,


            // =============================================
            // TOTALS
            // =============================================

            subtotal:
              sale.subtotal,

            gstAmount:
              sale.gstAmount,

            discount:
              sale.discount,

            grandTotal:
              sale.grandTotal,


            // =============================================
            // PAYMENT
            // =============================================

            paymentMode:
              sale.paymentMode,


            // =============================================
            // TIMESTAMPS
            // =============================================

            // The daily-summary function does nothing when
            // this is set, because the summary was written above.
            summaryApplied: true,

            createdAt:
              saleDate,

            updatedAt:
              saleDate,

            // Firestore TTL deletes the sale after this date.
            // Keep in sync with SALES_RETENTION_YEARS.
            expiresAt:
              this.salesExpiryDate(saleDate)

          }
        );

      }

    );


    // ===================================================
    // RETURN CREATED SALE INFORMATION
    // ===================================================

    return {

      saleId:
        saleRef.id,

      invoiceNumber

    };

  }


  private salesExpiryDate(from: Date): Date {

    const expiry = new Date(from);
    expiry.setFullYear(
      expiry.getFullYear() + SALES_RETENTION_YEARS
    );

    return expiry;

  }

}
