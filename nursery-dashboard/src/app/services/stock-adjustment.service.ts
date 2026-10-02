import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


// =========================================================
// STOCK ADJUSTMENT TYPE
// =========================================================

export type StockAdjustmentType =
  'INCREASE' |
  'DECREASE';


// =========================================================
// STOCK ADJUSTMENT STATUS
// =========================================================

export type StockAdjustmentStatus =
  'COMPLETED';


// =========================================================
// STOCK ADJUSTMENT
// =========================================================

export interface StockAdjustment {

  id?: string;


  // =========================
  // PRODUCT
  // =========================

  productId: string;

  productName: string;


  // =========================
  // WAREHOUSE
  // =========================

  warehouseId: string;

  warehouseName: string;

  warehouseCode: string;


  // =========================
  // ADJUSTMENT
  // =========================

  adjustmentType:
    StockAdjustmentType;

  quantity: number;


  // =========================
  // STOCK SNAPSHOT
  // =========================

  quantityBefore: number;

  quantityAfter: number;


  // =========================
  // REASON
  // =========================

  reason: string;

  notes: string;


  // =========================
  // DATE
  // =========================

  adjustmentDate: string;


  // =========================
  // STATUS
  // =========================

  status:
    StockAdjustmentStatus;


  // =========================
  // TIMESTAMPS
  // =========================

  createdAt?: any;

  updatedAt?: any;

}


// =========================================================
// CREATE STOCK ADJUSTMENT
// =========================================================

export type CreateStockAdjustment =
  Omit<
    StockAdjustment,
    | 'id'
    | 'quantityBefore'
    | 'quantityAfter'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  >;


// =========================================================
// STOCK ADJUSTMENT SERVICE
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class StockAdjustmentService {

  private firestore =
    inject(Firestore);


  // =======================================================
  // STOCK ADJUSTMENTS COLLECTION
  // =======================================================

  private stockAdjustmentsCollection =
    collection(
      this.firestore,
      'stockAdjustments'
    ) as CollectionReference<DocumentData>;


  // =======================================================
  // INVENTORY COLLECTION
  // =======================================================

  private inventoryCollection =
    collection(
      this.firestore,
      'inventory'
    ) as CollectionReference<DocumentData>;


  // =======================================================
  // GET ALL STOCK ADJUSTMENTS
  // =======================================================

  getStockAdjustments():
    Observable<StockAdjustment[]> {

    return collectionData(
      this.stockAdjustmentsCollection,
      {
        idField: 'id'
      }
    ) as Observable<StockAdjustment[]>;

  }


  // =======================================================
  // CREATE STOCK ADJUSTMENT
  // =======================================================
  //
  // This operation:
  //
  // 1. Finds inventory for product + warehouse
  // 2. Validates current stock
  // 3. Increases or decreases inventory
  // 4. Creates permanent adjustment history
  //
  // Everything is performed inside ONE Firestore
  // transaction.
  //
  // If anything fails, nothing is changed.
  //
  // =======================================================

  async createStockAdjustment(
    adjustment: CreateStockAdjustment
  ): Promise<string> {

    // =====================================================
    // PRODUCT VALIDATION
    // =====================================================

    if (!adjustment.productId) {

      throw new Error(
        'Product is required.'
      );

    }


    if (
      !adjustment.productName?.trim()
    ) {

      throw new Error(
        'Product name is required.'
      );

    }


    // =====================================================
    // WAREHOUSE VALIDATION
    // =====================================================

    if (!adjustment.warehouseId) {

      throw new Error(
        'Warehouse is required.'
      );

    }


    if (
      !adjustment.warehouseName?.trim()
    ) {

      throw new Error(
        'Warehouse name is required.'
      );

    }


    if (
      !adjustment.warehouseCode?.trim()
    ) {

      throw new Error(
        'Warehouse code is required.'
      );

    }


    // =====================================================
    // ADJUSTMENT TYPE VALIDATION
    // =====================================================

    if (
      adjustment.adjustmentType !==
        'INCREASE' &&
      adjustment.adjustmentType !==
        'DECREASE'
    ) {

      throw new Error(
        'Invalid stock adjustment type.'
      );

    }


    // =====================================================
    // QUANTITY VALIDATION
    // =====================================================

    if (
      !Number.isInteger(
        adjustment.quantity
      ) ||
      adjustment.quantity <= 0
    ) {

      throw new Error(
        'Adjustment quantity must be a positive whole number.'
      );

    }


    // =====================================================
    // REASON VALIDATION
    // =====================================================

    if (
      !adjustment.reason?.trim()
    ) {

      throw new Error(
        'Adjustment reason is required.'
      );

    }


    // =====================================================
    // DATE VALIDATION
    // =====================================================

    if (
      !adjustment.adjustmentDate
    ) {

      throw new Error(
        'Adjustment date is required.'
      );

    }


    // =====================================================
    // FIND INVENTORY
    // =====================================================

    const inventoryQuery =
      query(
        this.inventoryCollection,

        where(
          'productId',
          '==',
          adjustment.productId
        ),

        where(
          'warehouseId',
          '==',
          adjustment.warehouseId
        )
      );


    const inventorySnapshot =
      await getDocs(
        inventoryQuery
      );


    // =====================================================
    // INVENTORY DOES NOT EXIST
    // =====================================================
    //
    // DECREASE:
    // Cannot decrease something that does not exist.
    //
    // INCREASE:
    // We allow the adjustment to create the first inventory
    // record for the product in this warehouse.
    //
    // =====================================================

    let inventoryExists =
      false;


    let inventoryRef;


    if (
      !inventorySnapshot.empty
    ) {

      inventoryExists =
        true;


      inventoryRef =
        doc(
          this.firestore,
          'inventory',
          inventorySnapshot.docs[0].id
        );

    }

    else {

      if (
        adjustment.adjustmentType ===
        'DECREASE'
      ) {

        throw new Error(
          'Inventory does not exist for this product and warehouse.'
        );

      }


      inventoryRef =
        doc(
          collection(
            this.firestore,
            'inventory'
          )
        );

    }


    // =====================================================
    // STOCK ADJUSTMENT HISTORY REFERENCE
    // =====================================================

    const stockAdjustmentRef =
      doc(
        collection(
          this.firestore,
          'stockAdjustments'
        )
      );


    // =====================================================
    // FIRESTORE TRANSACTION
    // =====================================================

    await runTransaction(
      this.firestore,

      async transaction => {

        // =================================================
        // CURRENT STOCK
        // =================================================

        let currentQuantity =
          0;


        let reorderLevel =
          0;


        // =================================================
        // READ EXISTING INVENTORY
        // =================================================

        if (
          inventoryExists
        ) {

          const inventoryDocument =
            await transaction.get(
              inventoryRef
            );


          if (
            !inventoryDocument.exists()
          ) {

            throw new Error(
              'Inventory record no longer exists.'
            );

          }


          const inventoryData =
            inventoryDocument.data();


          currentQuantity =
            Number(
              inventoryData[
                'quantity'
              ] ?? 0
            );


          reorderLevel =
            Number(
              inventoryData[
                'reorderLevel'
              ] ?? 0
            );

        }


        // =================================================
        // CALCULATE NEW QUANTITY
        // =================================================

        let newQuantity =
          currentQuantity;


        // =================================================
        // INCREASE
        // =================================================

        if (
          adjustment.adjustmentType ===
          'INCREASE'
        ) {

          newQuantity =
            currentQuantity +
            adjustment.quantity;

        }


        // =================================================
        // DECREASE
        // =================================================

        else {

          // ===============================================
          // PREVENT NEGATIVE STOCK
          // ===============================================

          if (
            currentQuantity <
            adjustment.quantity
          ) {

            throw new Error(
              `Insufficient stock. Available quantity: ${currentQuantity}.`
            );

          }


          newQuantity =
            currentQuantity -
            adjustment.quantity;

        }


        // =================================================
        // UPDATE EXISTING INVENTORY
        // =================================================

        if (
          inventoryExists
        ) {

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
        // CREATE NEW INVENTORY
        // =================================================

        else {

          transaction.set(
            inventoryRef,
            {

              productId:
                adjustment.productId,

              warehouseId:
                adjustment.warehouseId,

              quantity:
                newQuantity,

              reorderLevel:
                reorderLevel,

              createdAt:
                new Date(),

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // CREATE ADJUSTMENT HISTORY
        // =================================================

        transaction.set(
          stockAdjustmentRef,
          {

            productId:
              adjustment.productId,

            productName:
              adjustment.productName
                .trim(),

            warehouseId:
              adjustment.warehouseId,

            warehouseName:
              adjustment.warehouseName
                .trim(),

            warehouseCode:
              adjustment.warehouseCode
                .trim()
                .toUpperCase(),

            adjustmentType:
              adjustment.adjustmentType,

            quantity:
              adjustment.quantity,

            quantityBefore:
              currentQuantity,

            quantityAfter:
              newQuantity,

            reason:
              adjustment.reason
                .trim(),

            adjustmentDate:
              adjustment.adjustmentDate,

            notes:
              adjustment.notes?.trim() ??
              '',

            status:
              'COMPLETED',

            createdAt:
              new Date(),

            updatedAt:
              new Date()

          }
        );

      }
    );


    // =====================================================
    // RETURN ADJUSTMENT ID
    // =====================================================

    return stockAdjustmentRef.id;

  }

}