import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  doc,
  CollectionReference,
  DocumentData,
  query,
  where,
  getDocs,
  runTransaction
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


export interface Inventory {

  id?: string;

  // =========================
  // REFERENCES
  // =========================

  productId: string;

  warehouseId: string;


  // =========================
  // STOCK
  // =========================

  quantity: number;


  // =========================
  // ALERT THRESHOLD
  // =========================

  reorderLevel: number;


  // =========================
  // TIMESTAMPS
  // =========================

  createdAt?: any;

  updatedAt?: any;

}


@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private firestore =
    inject(Firestore);


  private inventoryCollection =
    collection(
      this.firestore,
      'inventory'
    ) as CollectionReference<DocumentData>;


  // =========================
  // GET ALL INVENTORY
  // =========================

  getInventory(): Observable<Inventory[]> {

    return collectionData(
      this.inventoryCollection,
      {
        idField: 'id'
      }
    ) as Observable<Inventory[]>;

  }


  // =========================
  // GET INVENTORY BY
  // PRODUCT + WAREHOUSE
  // =========================

  async getInventoryByProductAndWarehouse(
    productId: string,
    warehouseId: string
  ): Promise<Inventory | null> {

    const inventoryQuery =
      query(
        this.inventoryCollection,
        where(
          'productId',
          '==',
          productId
        ),
        where(
          'warehouseId',
          '==',
          warehouseId
        )
      );


    const snapshot =
      await getDocs(
        inventoryQuery
      );


    if (snapshot.empty) {

      return null;

    }


    const inventoryDoc =
      snapshot.docs[0];


    return {

      id:
        inventoryDoc.id,

      ...inventoryDoc.data()

    } as Inventory;

  }


  // =========================
  // ADD INVENTORY
  // =========================

  async addInventory(
    inventory: Omit<
      Inventory,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) {

    // -------------------------
    // VALIDATION
    // -------------------------

    if (!inventory.productId) {

      throw new Error(
        'Product ID is required.'
      );

    }


    if (!inventory.warehouseId) {

      throw new Error(
        'Warehouse ID is required.'
      );

    }


    if (
      !Number.isInteger(
        inventory.quantity
      ) ||
      inventory.quantity < 0
    ) {

      throw new Error(
        'Inventory quantity must be a non-negative integer.'
      );

    }


    if (
      !Number.isInteger(
        inventory.reorderLevel
      ) ||
      inventory.reorderLevel < 0
    ) {

      throw new Error(
        'Reorder level must be a non-negative integer.'
      );

    }


    // -------------------------
    // DUPLICATE CHECK
    // -------------------------

    const existingInventory =
      await this
        .getInventoryByProductAndWarehouse(
          inventory.productId,
          inventory.warehouseId
        );


    if (existingInventory) {

      throw new Error(
        'Inventory already exists for this product and warehouse.'
      );

    }


    // -------------------------
    // CREATE INVENTORY
    // -------------------------

    return addDoc(
      this.inventoryCollection,
      {

        productId:
          inventory.productId,

        warehouseId:
          inventory.warehouseId,

        quantity:
          inventory.quantity,

        reorderLevel:
          inventory.reorderLevel,

        createdAt:
          new Date(),

        updatedAt:
          new Date()

      }
    );

  }


  // =========================
  // UPDATE INVENTORY
  // =========================

  async updateInventory(
    inventoryId: string,
    inventory: Partial<Inventory>
  ) {

    if (!inventoryId) {

      throw new Error(
        'Inventory ID is required.'
      );

    }


    const inventoryRef =
      doc(
        this.firestore,
        'inventory',
        inventoryId
      );


    const updateData: any = {

      updatedAt:
        new Date()

    };


    // -------------------------
    // PRODUCT
    // -------------------------

    if (
      inventory.productId !== undefined
    ) {

      updateData.productId =
        inventory.productId;

    }


    // -------------------------
    // WAREHOUSE
    // -------------------------

    if (
      inventory.warehouseId !== undefined
    ) {

      updateData.warehouseId =
        inventory.warehouseId;

    }


    // -------------------------
    // QUANTITY
    // -------------------------

    if (
      inventory.quantity !== undefined
    ) {

      if (
        !Number.isInteger(
          inventory.quantity
        ) ||
        inventory.quantity < 0
      ) {

        throw new Error(
          'Inventory quantity must be a non-negative integer.'
        );

      }


      updateData.quantity =
        inventory.quantity;

    }


    // -------------------------
    // REORDER LEVEL
    // -------------------------

    if (
      inventory.reorderLevel !== undefined
    ) {

      if (
        !Number.isInteger(
          inventory.reorderLevel
        ) ||
        inventory.reorderLevel < 0
      ) {

        throw new Error(
          'Reorder level must be a non-negative integer.'
        );

      }


      updateData.reorderLevel =
        inventory.reorderLevel;

    }


    await updateDoc(
      inventoryRef,
      updateData
    );

  }


  // =========================
  // UPDATE STOCK QUANTITY
  // =========================

  async updateStockQuantity(
    inventoryId: string,
    quantity: number
  ) {

    if (!inventoryId) {

      throw new Error(
        'Inventory ID is required.'
      );

    }


    if (
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {

      throw new Error(
        'Inventory quantity must be a non-negative integer.'
      );

    }


    const inventoryRef =
      doc(
        this.firestore,
        'inventory',
        inventoryId
      );


    await updateDoc(
      inventoryRef,
      {

        quantity,

        updatedAt:
          new Date()

      }
    );

  }


  // =========================
  // INCREASE STOCK
  // =========================

  async increaseStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    reorderLevel: number = 0
  ) {

    // -------------------------
    // VALIDATION
    // -------------------------

    if (!productId) {

      throw new Error(
        'Product ID is required.'
      );

    }


    if (!warehouseId) {

      throw new Error(
        'Warehouse ID is required.'
      );

    }


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {

      throw new Error(
        'Stock quantity must be a positive integer.'
      );

    }


    if (
      !Number.isInteger(reorderLevel) ||
      reorderLevel < 0
    ) {

      throw new Error(
        'Reorder level must be a non-negative integer.'
      );

    }


    // -------------------------
    // FIND EXISTING INVENTORY
    // -------------------------

    const existingInventory =
      await this
        .getInventoryByProductAndWarehouse(
          productId,
          warehouseId
        );


    // -------------------------
    // INVENTORY DOES NOT EXIST
    // CREATE FIRST STOCK RECORD
    // -------------------------

    if (
      !existingInventory ||
      !existingInventory.id
    ) {

      return this.addInventory({

        productId,

        warehouseId,

        quantity,

        reorderLevel

      });

    }


    // -------------------------
    // INVENTORY EXISTS
    // INCREASE USING TRANSACTION
    // -------------------------

    const inventoryRef =
      doc(
        this.firestore,
        'inventory',
        existingInventory.id
      );


    await runTransaction(
      this.firestore,
      async transaction => {

        const snapshot =
          await transaction.get(
            inventoryRef
          );


        if (!snapshot.exists()) {

          throw new Error(
            'Inventory record does not exist.'
          );

        }


        const data =
          snapshot.data() as Inventory;


        const currentQuantity =
          Number(data.quantity ?? 0);


        const newQuantity =
          currentQuantity + quantity;


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
    );


    return existingInventory.id;

  }


  // =========================
  // DECREASE STOCK
  // =========================

  async decreaseStock(
    productId: string,
    warehouseId: string,
    quantity: number
  ) {

    // -------------------------
    // VALIDATION
    // -------------------------

    if (!productId) {

      throw new Error(
        'Product ID is required.'
      );

    }


    if (!warehouseId) {

      throw new Error(
        'Warehouse ID is required.'
      );

    }


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {

      throw new Error(
        'Stock quantity must be a positive integer.'
      );

    }


    // -------------------------
    // FIND INVENTORY
    // -------------------------

    const existingInventory =
      await this
        .getInventoryByProductAndWarehouse(
          productId,
          warehouseId
        );


    if (
      !existingInventory ||
      !existingInventory.id
    ) {

      throw new Error(
        'Inventory does not exist for this product and warehouse.'
      );

    }


    const inventoryRef =
      doc(
        this.firestore,
        'inventory',
        existingInventory.id
      );


    // -------------------------
    // DECREASE USING TRANSACTION
    // -------------------------

    await runTransaction(
      this.firestore,
      async transaction => {

        const snapshot =
          await transaction.get(
            inventoryRef
          );


        if (!snapshot.exists()) {

          throw new Error(
            'Inventory record does not exist.'
          );

        }


        const data =
          snapshot.data() as Inventory;


        const currentQuantity =
          Number(data.quantity ?? 0);


        // -------------------------
        // PREVENT NEGATIVE STOCK
        // -------------------------

        if (
          currentQuantity < quantity
        ) {

          throw new Error(
            `Insufficient stock. Available quantity: ${currentQuantity}.`
          );

        }


        const newQuantity =
          currentQuantity - quantity;


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
    );

  }

}