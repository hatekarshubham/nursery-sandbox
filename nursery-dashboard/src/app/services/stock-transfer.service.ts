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
// STOCK TRANSFER STATUS
// =========================================================

export type StockTransferStatus =
  'COMPLETED';


// =========================================================
// STOCK TRANSFER
// =========================================================

export interface StockTransfer {

  id?: string;


  // =========================
  // PRODUCT
  // =========================

  productId: string;

  productName: string;


  // =========================
  // SOURCE WAREHOUSE
  // =========================

  fromWarehouseId: string;

  fromWarehouseName: string;

  fromWarehouseCode: string;


  // =========================
  // DESTINATION WAREHOUSE
  // =========================

  toWarehouseId: string;

  toWarehouseName: string;

  toWarehouseCode: string;


  // =========================
  // TRANSFER
  // =========================

  quantity: number;

  transferDate: string;

  notes: string;


  // =========================
  // STATUS
  // =========================

  status: StockTransferStatus;


  // =========================
  // TIMESTAMPS
  // =========================

  createdAt?: any;

  updatedAt?: any;

}


// =========================================================
// CREATE STOCK TRANSFER DATA
// =========================================================

export type CreateStockTransfer =
  Omit<
    StockTransfer,
    | 'id'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  >;


// =========================================================
// STOCK TRANSFER SERVICE
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class StockTransferService {

  private firestore =
    inject(Firestore);


  private stockTransfersCollection =
    collection(
      this.firestore,
      'stockTransfers'
    ) as CollectionReference<DocumentData>;


  private inventoryCollection =
    collection(
      this.firestore,
      'inventory'
    ) as CollectionReference<DocumentData>;


  // =======================================================
  // GET ALL STOCK TRANSFERS
  // =======================================================

  getStockTransfers():
    Observable<StockTransfer[]> {

    return collectionData(
      this.stockTransfersCollection,
      {
        idField: 'id'
      }
    ) as Observable<StockTransfer[]>;

  }


  // =======================================================
  // CREATE STOCK TRANSFER
  // =======================================================
  //
  // This operation:
  //
  // 1. Decreases stock from source warehouse
  // 2. Increases stock in destination warehouse
  // 3. Creates stock transfer history
  //
  // All writes happen inside ONE Firestore transaction.
  //
  // If anything fails, nothing is changed.
  //
  // =======================================================

  async createStockTransfer(
    transfer: CreateStockTransfer
  ): Promise<string> {

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!transfer.productId) {

      throw new Error(
        'Product is required.'
      );

    }


    if (!transfer.productName?.trim()) {

      throw new Error(
        'Product name is required.'
      );

    }


    if (!transfer.fromWarehouseId) {

      throw new Error(
        'Source warehouse is required.'
      );

    }


    if (!transfer.toWarehouseId) {

      throw new Error(
        'Destination warehouse is required.'
      );

    }


    // =====================================================
    // PREVENT SAME WAREHOUSE
    // =====================================================

    if (
      transfer.fromWarehouseId ===
      transfer.toWarehouseId
    ) {

      throw new Error(
        'Source and destination warehouses cannot be the same.'
      );

    }


    // =====================================================
    // QUANTITY VALIDATION
    // =====================================================

    if (
      !Number.isInteger(
        transfer.quantity
      ) ||
      transfer.quantity <= 0
    ) {

      throw new Error(
        'Transfer quantity must be a positive whole number.'
      );

    }


    // =====================================================
    // DATE VALIDATION
    // =====================================================

    if (!transfer.transferDate) {

      throw new Error(
        'Transfer date is required.'
      );

    }


    // =====================================================
    // FIND SOURCE INVENTORY
    // =====================================================

    const sourceInventoryQuery =
      query(
        this.inventoryCollection,

        where(
          'productId',
          '==',
          transfer.productId
        ),

        where(
          'warehouseId',
          '==',
          transfer.fromWarehouseId
        )
      );


    const sourceInventorySnapshot =
      await getDocs(
        sourceInventoryQuery
      );


    if (
      sourceInventorySnapshot.empty
    ) {

      throw new Error(
        'The selected product has no inventory in the source warehouse.'
      );

    }


    const sourceInventoryDocument =
      sourceInventorySnapshot.docs[0];


    const sourceInventoryRef =
      doc(
        this.firestore,
        'inventory',
        sourceInventoryDocument.id
      );


    // =====================================================
    // FIND DESTINATION INVENTORY
    // =====================================================

    const destinationInventoryQuery =
      query(
        this.inventoryCollection,

        where(
          'productId',
          '==',
          transfer.productId
        ),

        where(
          'warehouseId',
          '==',
          transfer.toWarehouseId
        )
      );


    const destinationInventorySnapshot =
      await getDocs(
        destinationInventoryQuery
      );


    // =====================================================
    // DESTINATION REFERENCE
    // =====================================================

    let destinationInventoryRef;

    let destinationInventoryExists =
      false;


    if (
      !destinationInventorySnapshot.empty
    ) {

      destinationInventoryExists =
        true;


      destinationInventoryRef =
        doc(
          this.firestore,
          'inventory',
          destinationInventorySnapshot.docs[0].id
        );

    }

    else {

      destinationInventoryRef =
        doc(
          collection(
            this.firestore,
            'inventory'
          )
        );

    }


    // =====================================================
    // STOCK TRANSFER REFERENCE
    // =====================================================

    const stockTransferRef =
      doc(
        collection(
          this.firestore,
          'stockTransfers'
        )
      );


    // =====================================================
    // FIRESTORE TRANSACTION
    // =====================================================

    await runTransaction(
      this.firestore,

      async transaction => {

        // =================================================
        // READ SOURCE INVENTORY
        // =================================================

        const sourceSnapshot =
          await transaction.get(
            sourceInventoryRef
          );


        if (!sourceSnapshot.exists()) {

          throw new Error(
            'Source inventory no longer exists.'
          );

        }


        const sourceData =
          sourceSnapshot.data();


        const sourceQuantity =
          Number(
            sourceData['quantity'] ?? 0
          );


        // =================================================
        // VALIDATE AVAILABLE STOCK
        // =================================================

        if (
          sourceQuantity <
          transfer.quantity
        ) {

          throw new Error(
            `Insufficient stock. Available quantity: ${sourceQuantity}.`
          );

        }


        // =================================================
        // READ DESTINATION INVENTORY
        // =================================================

        let destinationQuantity = 0;

        let destinationReorderLevel = 0;


        if (
          destinationInventoryExists
        ) {

          const destinationSnapshot =
            await transaction.get(
              destinationInventoryRef
            );


          if (
            !destinationSnapshot.exists()
          ) {

            throw new Error(
              'Destination inventory no longer exists.'
            );

          }


          const destinationData =
            destinationSnapshot.data();


          destinationQuantity =
            Number(
              destinationData['quantity'] ?? 0
            );


          destinationReorderLevel =
            Number(
              destinationData['reorderLevel'] ?? 0
            );

        }


        // =================================================
        // CALCULATE NEW QUANTITIES
        // =================================================

        const newSourceQuantity =
          sourceQuantity -
          transfer.quantity;


        const newDestinationQuantity =
          destinationQuantity +
          transfer.quantity;


        // =================================================
        // UPDATE SOURCE INVENTORY
        // =================================================

        transaction.update(
          sourceInventoryRef,
          {

            quantity:
              newSourceQuantity,

            updatedAt:
              new Date()

          }
        );


        // =================================================
        // UPDATE EXISTING DESTINATION INVENTORY
        // =================================================

        if (
          destinationInventoryExists
        ) {

          transaction.update(
            destinationInventoryRef,
            {

              quantity:
                newDestinationQuantity,

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // CREATE DESTINATION INVENTORY
        // =================================================

        else {

          transaction.set(
            destinationInventoryRef,
            {

              productId:
                transfer.productId,

              warehouseId:
                transfer.toWarehouseId,

              quantity:
                transfer.quantity,

              reorderLevel:
                destinationReorderLevel,

              createdAt:
                new Date(),

              updatedAt:
                new Date()

            }
          );

        }


        // =================================================
        // CREATE TRANSFER HISTORY
        // =================================================

        transaction.set(
          stockTransferRef,
          {

            productId:
              transfer.productId,

            productName:
              transfer.productName.trim(),

            fromWarehouseId:
              transfer.fromWarehouseId,

            fromWarehouseName:
              transfer.fromWarehouseName.trim(),

            fromWarehouseCode:
              transfer.fromWarehouseCode
                .trim()
                .toUpperCase(),

            toWarehouseId:
              transfer.toWarehouseId,

            toWarehouseName:
              transfer.toWarehouseName.trim(),

            toWarehouseCode:
              transfer.toWarehouseCode
                .trim()
                .toUpperCase(),

            quantity:
              transfer.quantity,

            transferDate:
              transfer.transferDate,

            notes:
              transfer.notes?.trim() ?? '',

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
    // RETURN TRANSFER ID
    // =====================================================

    return stockTransferRef.id;

  }

}