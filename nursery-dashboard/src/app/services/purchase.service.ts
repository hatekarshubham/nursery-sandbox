import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  CollectionReference,
  DocumentData,
  runTransaction
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


// =========================================================
// PURCHASE STATUS
// =========================================================

export type PurchaseStatus =
  'PENDING' |
  'COMPLETED' |
  'CANCELLED';


// =========================================================
// PURCHASE ITEM
// =========================================================

export interface PurchaseItem {

  productId: string;

  productName: string;

  quantity: number;

  unitPrice: number;

  gst: number;

  taxableAmount: number;

  gstAmount: number;

  totalAmount: number;

}


// =========================================================
// PURCHASE
// =========================================================

export interface Purchase {

  id?: string;


  // =========================
  // SUPPLIER
  // =========================

  supplierId: string;

  supplierName: string;


  // =========================
  // WAREHOUSE
  // =========================

  warehouseId: string;

  warehouseName: string;


  // =========================
  // PURCHASE INFORMATION
  // =========================

  purchaseDate: Date | any;

  invoiceNumber: string;

  notes: string;


  // =========================
  // ITEMS
  // =========================

  items: PurchaseItem[];


  // =========================
  // TOTALS
  // =========================

  subtotal: number;

  gstAmount: number;

  grandTotal: number;


  // =========================
  // STATUS
  // =========================

  status: PurchaseStatus;


  // =========================
  // TIMESTAMPS
  // =========================

  createdAt?: any;

  updatedAt?: any;

  completedAt?: any;

  cancelledAt?: any;

}


// =========================================================
// PURCHASE SERVICE
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {

  private firestore =
    inject(Firestore);


  private purchasesCollection =
    collection(
      this.firestore,
      'purchases'
    ) as CollectionReference<DocumentData>;


  // =======================================================
  // GET ALL PURCHASES
  // =======================================================

  getPurchases(): Observable<Purchase[]> {

    return collectionData(
      this.purchasesCollection,
      {
        idField: 'id'
      }
    ) as Observable<Purchase[]>;

  }


  // =======================================================
  // GET PURCHASE BY ID
  // =======================================================

  async getPurchaseById(
    purchaseId: string
  ): Promise<Purchase | null> {

    if (!purchaseId) {

      throw new Error(
        'Purchase ID is required.'
      );

    }


    const purchaseRef =
      doc(
        this.firestore,
        'purchases',
        purchaseId
      );


    const snapshot =
      await getDoc(
        purchaseRef
      );


    if (!snapshot.exists()) {

      return null;

    }


    const purchaseData =
      snapshot.data() as Purchase;


    return {

      ...purchaseData,

      id:
        snapshot.id

    };

  }


  // =======================================================
  // CREATE PURCHASE
  // =======================================================
  //
  // IMPORTANT:
  //
  // Creating a purchase DOES NOT update inventory.
  //
  // Purchase starts as:
  //
  // PENDING
  //
  // Inventory is increased only after the user explicitly
  // completes the purchase from All Purchases.
  //
  // =======================================================

  async createPurchase(
    purchase: Omit<
      Purchase,
      'id' |
      'status' |
      'createdAt' |
      'updatedAt' |
      'completedAt' |
      'cancelledAt'
    >
  ): Promise<string> {

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!purchase.supplierId) {

      throw new Error(
        'Supplier is required.'
      );

    }


    if (!purchase.supplierName) {

      throw new Error(
        'Supplier name is required.'
      );

    }


    if (!purchase.warehouseId) {

      throw new Error(
        'Warehouse is required.'
      );

    }


    if (!purchase.warehouseName) {

      throw new Error(
        'Warehouse name is required.'
      );

    }


    if (!purchase.purchaseDate) {

      throw new Error(
        'Purchase date is required.'
      );

    }


    // =====================================================
    // ITEMS VALIDATION
    // =====================================================

    if (
      !purchase.items ||
      purchase.items.length === 0
    ) {

      throw new Error(
        'At least one product is required.'
      );

    }


    // =====================================================
    // PREVENT DUPLICATE PRODUCTS
    // =====================================================

    const productIds =
      purchase.items.map(
        item =>
          item.productId
      );


    const uniqueProductIds =
      new Set(
        productIds
      );


    if (
      uniqueProductIds.size !==
      productIds.length
    ) {

      throw new Error(
        'The same product cannot be added more than once in a purchase.'
      );

    }


    // =====================================================
    // VALIDATE + RECALCULATE ITEMS
    // =====================================================

    const calculatedItems:
      PurchaseItem[] = [];


    for (
      const item of purchase.items
    ) {

      // ===================================================
      // PRODUCT
      // ===================================================

      if (!item.productId) {

        throw new Error(
          'Product ID is required.'
        );

      }


      if (!item.productName) {

        throw new Error(
          'Product name is required.'
        );

      }


      // ===================================================
      // QUANTITY
      // ===================================================

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


      // ===================================================
      // UNIT PRICE
      // ===================================================

      if (
        !Number.isFinite(
          item.unitPrice
        ) ||
        item.unitPrice < 0
      ) {

        throw new Error(
          `Invalid unit price for ${item.productName}.`
        );

      }


      // ===================================================
      // GST
      // ===================================================

      if (
        !Number.isFinite(
          item.gst
        ) ||
        item.gst < 0 ||
        item.gst > 100
      ) {

        throw new Error(
          `Invalid GST for ${item.productName}.`
        );

      }


      // ===================================================
      // CALCULATE ITEM TOTALS
      // ===================================================

      const taxableAmount =
        this.roundMoney(
          item.quantity *
          item.unitPrice
        );


      const itemGstAmount =
        this.roundMoney(
          taxableAmount *
          item.gst /
          100
        );


      const totalAmount =
        this.roundMoney(
          taxableAmount +
          itemGstAmount
        );


      calculatedItems.push({

        productId:
          item.productId,

        productName:
          item.productName,

        quantity:
          item.quantity,

        unitPrice:
          item.unitPrice,

        gst:
          item.gst,

        taxableAmount,

        gstAmount:
          itemGstAmount,

        totalAmount

      });

    }


    // =====================================================
    // CALCULATE PURCHASE TOTALS
    // =====================================================

    const subtotal =
      this.roundMoney(
        calculatedItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.taxableAmount,
          0
        )
      );


    const gstAmount =
      this.roundMoney(
        calculatedItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.gstAmount,
          0
        )
      );


    const grandTotal =
      this.roundMoney(
        subtotal +
        gstAmount
      );


    // =====================================================
    // CREATE PENDING PURCHASE
    // =====================================================

    const purchaseRef =
      await addDoc(
        this.purchasesCollection,
        {

          supplierId:
            purchase.supplierId,

          supplierName:
            purchase.supplierName,

          warehouseId:
            purchase.warehouseId,

          warehouseName:
            purchase.warehouseName,

          purchaseDate:
            purchase.purchaseDate,

          invoiceNumber:
            purchase.invoiceNumber?.trim() ??
            '',

          notes:
            purchase.notes?.trim() ??
            '',

          items:
            calculatedItems,

          subtotal,

          gstAmount,

          grandTotal,

          status:
            'PENDING' as PurchaseStatus,

          createdAt:
            new Date(),

          updatedAt:
            new Date()

        }
      );


    return purchaseRef.id;

  }


  // =======================================================
  // COMPLETE PURCHASE
  // =======================================================
  //
  // PENDING
  //     ↓
  // COMPLETED
  //
  // Inventory is increased ONLY here.
  //
  // Purchase status and inventory changes happen inside
  // one Firestore transaction.
  //
  // =======================================================

  async completePurchase(
    purchaseId: string
  ): Promise<void> {

    if (!purchaseId) {

      throw new Error(
        'Purchase ID is required.'
      );

    }


    // =====================================================
    // PURCHASE REFERENCE
    // =====================================================

    const purchaseRef =
      doc(
        this.firestore,
        'purchases',
        purchaseId
      );


    // =====================================================
    // READ PURCHASE
    // =====================================================

    const purchaseSnapshot =
      await getDoc(
        purchaseRef
      );


    if (
      !purchaseSnapshot.exists()
    ) {

      throw new Error(
        'Purchase not found.'
      );

    }


    const purchase =
      purchaseSnapshot.data() as Purchase;


    // =====================================================
    // STATUS CHECK
    // =====================================================

    if (
      purchase.status !==
      'PENDING'
    ) {

      throw new Error(
        `Only pending purchases can be completed. Current status: ${purchase.status}.`
      );

    }


    // =====================================================
    // VALIDATE PURCHASE DATA
    // =====================================================

    if (
      !purchase.warehouseId
    ) {

      throw new Error(
        'Purchase warehouse is missing.'
      );

    }


    if (
      !purchase.items ||
      purchase.items.length === 0
    ) {

      throw new Error(
        'Purchase contains no items.'
      );

    }


    // =====================================================
    // FIND INVENTORY DOCUMENTS
    // =====================================================
    //
    // Locate the inventory documents before starting the
    // transaction.
    //
    // Existing inventory documents are read again inside
    // the transaction before any writes.
    //
    // =====================================================

    const inventoryReferences:
      {
        item: PurchaseItem;
        inventoryId: string | null;
      }[] = [];


    for (
      const item of purchase.items
    ) {

      const inventoryQuery =
        query(
          collection(
            this.firestore,
            'inventory'
          ),
          where(
            'productId',
            '==',
            item.productId
          ),
          where(
            'warehouseId',
            '==',
            purchase.warehouseId
          )
        );


      const inventorySnapshot =
        await getDocs(
          inventoryQuery
        );


      if (
        inventorySnapshot.empty
      ) {

        inventoryReferences.push({

          item,

          inventoryId:
            null

        });

      }

      else {

        inventoryReferences.push({

          item,

          inventoryId:
            inventorySnapshot.docs[0].id

        });

      }

    }


    // =====================================================
    // FIRESTORE TRANSACTION
    // =====================================================

    await runTransaction(
      this.firestore,
      async transaction => {

        // =================================================
        // READ PURCHASE AGAIN INSIDE TRANSACTION
        // =================================================
        //
        // Important:
        //
        // We check status again so two users cannot complete
        // the same purchase and increase inventory twice.
        //
        // =================================================

        const transactionPurchaseSnapshot =
          await transaction.get(
            purchaseRef
          );


        if (
          !transactionPurchaseSnapshot.exists()
        ) {

          throw new Error(
            'Purchase not found.'
          );

        }


        const transactionPurchase =
          transactionPurchaseSnapshot.data() as Purchase;


        // =================================================
        // CHECK LATEST STATUS
        // =================================================

        if (
          transactionPurchase.status !==
          'PENDING'
        ) {

          throw new Error(
            `Purchase is already ${transactionPurchase.status}.`
          );

        }


        // =================================================
        // VALIDATE TRANSACTION PURCHASE
        // =================================================

        if (
          !transactionPurchase.warehouseId
        ) {

          throw new Error(
            'Purchase warehouse is missing.'
          );

        }


        if (
          !transactionPurchase.items ||
          transactionPurchase.items.length === 0
        ) {

          throw new Error(
            'Purchase contains no items.'
          );

        }


        // =================================================
        // READ INVENTORY DOCUMENTS
        // =================================================

        const existingInventory:
          {
            item: PurchaseItem;
            ref: any;
            quantity: number;
          }[] = [];


        const newInventory:
          {
            item: PurchaseItem;
            ref: any;
          }[] = [];


        for (
          const inventoryInfo of
          inventoryReferences
        ) {

          // ===============================================
          // EXISTING INVENTORY
          // ===============================================

          if (
            inventoryInfo.inventoryId
          ) {

            const inventoryRef =
              doc(
                this.firestore,
                'inventory',
                inventoryInfo.inventoryId
              );


            const inventorySnapshot =
              await transaction.get(
                inventoryRef
              );


            if (
              !inventorySnapshot.exists()
            ) {

              throw new Error(
                `Inventory record disappeared for ${inventoryInfo.item.productName}.`
              );

            }


            const inventoryData =
              inventorySnapshot.data();


            const currentQuantity =
              Number(
                inventoryData[
                  'quantity'
                ] ?? 0
              );


            existingInventory.push({

              item:
                inventoryInfo.item,

              ref:
                inventoryRef,

              quantity:
                currentQuantity

            });

          }

          // ===============================================
          // NEW INVENTORY
          // ===============================================

          else {

            const inventoryRef =
              doc(
                collection(
                  this.firestore,
                  'inventory'
                )
              );


            newInventory.push({

              item:
                inventoryInfo.item,

              ref:
                inventoryRef

            });

          }

        }


        // =================================================
        // UPDATE EXISTING INVENTORY
        // =================================================

        for (
          const inventoryInfo of
          existingInventory
        ) {

          const newQuantity =
            inventoryInfo.quantity +
            inventoryInfo.item.quantity;


          transaction.update(
            inventoryInfo.ref,
            {

              quantity:
                newQuantity,

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // CREATE NEW INVENTORY RECORDS
        // =================================================

        for (
          const inventoryInfo of
          newInventory
        ) {

          transaction.set(
            inventoryInfo.ref,
            {

              productId:
                inventoryInfo.item.productId,

              warehouseId:
                transactionPurchase.warehouseId,

              quantity:
                inventoryInfo.item.quantity,

              reorderLevel:
                0,

              createdAt:
                new Date(),

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // MARK PURCHASE COMPLETED
        // =================================================

        transaction.update(
          purchaseRef,
          {

            status:
              'COMPLETED',

            completedAt:
              new Date(),

            updatedAt:
              new Date()

          }
        );

      }
    );

  }


  // =======================================================
  // CANCEL PURCHASE
  // =======================================================
  //
  // PENDING
  //     ↓
  // CANCELLED
  //
  // Inventory is NOT modified.
  //
  // Only PENDING purchases can be cancelled.
  //
  // =======================================================

  async cancelPurchase(
    purchaseId: string
  ): Promise<void> {

    if (!purchaseId) {

      throw new Error(
        'Purchase ID is required.'
      );

    }


    const purchaseRef =
      doc(
        this.firestore,
        'purchases',
        purchaseId
      );


    await runTransaction(
      this.firestore,
      async transaction => {

        // =================================================
        // READ PURCHASE
        // =================================================

        const purchaseSnapshot =
          await transaction.get(
            purchaseRef
          );


        if (
          !purchaseSnapshot.exists()
        ) {

          throw new Error(
            'Purchase not found.'
          );

        }


        const purchase =
          purchaseSnapshot.data() as Purchase;


        // =================================================
        // ONLY PENDING CAN BE CANCELLED
        // =================================================

        if (
          purchase.status !==
          'PENDING'
        ) {

          throw new Error(
            `Only pending purchases can be cancelled. Current status: ${purchase.status}.`
          );

        }


        // =================================================
        // CANCEL PURCHASE
        // =================================================

        transaction.update(
          purchaseRef,
          {

            status:
              'CANCELLED',

            cancelledAt:
              new Date(),

            updatedAt:
              new Date()

          }
        );

      }
    );

  }


  // =======================================================
  // MONEY ROUNDING
  // =======================================================

  private roundMoney(
    value: number
  ): number {

    return Math.round(
      (
        Number(value) +
        Number.EPSILON
      ) *
      100
    ) / 100;

  }

}