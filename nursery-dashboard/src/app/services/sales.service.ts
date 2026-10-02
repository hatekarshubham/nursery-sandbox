import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
  DocumentData,
  doc,
  query,
  where,
  getDocs,
  runTransaction
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


// =======================================================
// SALE ITEM
// =======================================================

export interface SaleItem {

  productId: string;

  productName: string;

  barcode: string;

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

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private firestore =
    inject(Firestore);


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
      this.salesCollection,
      {
        idField: 'id'
      }
    ) as Observable<Sale[]>;

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

    const invoiceNumber =
      this.generateInvoiceNumber();


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
        // ALL READS COMPLETE
        // =================================================
        //
        // From this point we can start writing.
        //
        // =================================================


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

            createdAt:
              new Date(),

            updatedAt:
              new Date()

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


  // =====================================================
  // GENERATE INVOICE NUMBER
  // =====================================================
  //
  // Example:
  //
  // INV-20260928-224240-962
  //
  // INV
  //  -> Invoice
  //
  // 20260928
  //  -> YYYYMMDD
  //
  // 224240
  //  -> HHMMSS
  //
  // 962
  //  -> random 3-digit suffix
  //
  // =====================================================

  private generateInvoiceNumber(): string {

    const now =
      new Date();


    const year =
      now
        .getFullYear()
        .toString();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      );


    const hours =
      String(
        now.getHours()
      ).padStart(
        2,
        '0'
      );


    const minutes =
      String(
        now.getMinutes()
      ).padStart(
        2,
        '0'
      );


    const seconds =
      String(
        now.getSeconds()
      ).padStart(
        2,
        '0'
      );


    const random =
      Math.floor(
        100 +
        Math.random() * 900
      );


    return (
      `INV-${year}${month}${day}-` +
      `${hours}${minutes}${seconds}-` +
      `${random}`
    );

  }

}