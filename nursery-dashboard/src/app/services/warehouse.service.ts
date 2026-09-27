import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  doc,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


export interface Warehouse {
  id?: string;

  name: string;

  code: string;

  isActive: boolean;

  createdAt?: any;

  updatedAt?: any;
}


@Injectable({
  providedIn: 'root'
})
export class WarehouseService {

  private firestore = inject(Firestore);

  private warehousesCollection =
    collection(
      this.firestore,
      'warehouses'
    ) as CollectionReference<DocumentData>;


  // =========================
  // GET ALL WAREHOUSES
  // =========================

  getWarehouses(): Observable<Warehouse[]> {

    return collectionData(
      this.warehousesCollection,
      {
        idField: 'id'
      }
    ) as Observable<Warehouse[]>;

  }


  // =========================
  // GET ACTIVE WAREHOUSES
  // =========================

  getActiveWarehouses(): Observable<Warehouse[]> {

    return new Observable<Warehouse[]>(
      (observer) => {

        const subscription =
          this.getWarehouses()
            .subscribe({

              next: (warehouses) => {

                observer.next(
                  warehouses.filter(
                    (warehouse) =>
                      warehouse.isActive
                  )
                );

              },

              error: (error) => {
                observer.error(error);
              }

            });

        return () => {
          subscription.unsubscribe();
        };

      }
    );

  }


  // =========================
  // ADD WAREHOUSE
  // =========================

  async addWarehouse(
    warehouse: Omit<
      Warehouse,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) {

    return addDoc(
      this.warehousesCollection,
      {
        name:
          warehouse.name.trim(),

        code:
          warehouse.code
            .trim()
            .toUpperCase(),

        isActive:
          warehouse.isActive,

        createdAt:
          new Date(),

        updatedAt:
          new Date()
      }
    );

  }


  // =========================
  // UPDATE WAREHOUSE
  // =========================

  async updateWarehouse(
    warehouseId: string,
    warehouse: Partial<Warehouse>
  ) {

    const warehouseRef =
      doc(
        this.firestore,
        'warehouses',
        warehouseId
      );

    const updateData: any = {
      updatedAt: new Date()
    };


    if (warehouse.name !== undefined) {

      updateData.name =
        warehouse.name.trim();

    }


    if (warehouse.code !== undefined) {

      updateData.code =
        warehouse.code
          .trim()
          .toUpperCase();

    }


    if (warehouse.isActive !== undefined) {

      updateData.isActive =
        warehouse.isActive;

    }


    await updateDoc(
      warehouseRef,
      updateData
    );

  }


  // =========================
  // UPDATE WAREHOUSE STATUS
  // =========================

  async updateWarehouseStatus(
    warehouseId: string,
    isActive: boolean
  ) {

    const warehouseRef =
      doc(
        this.firestore,
        'warehouses',
        warehouseId
      );

    await updateDoc(
      warehouseRef,
      {
        isActive,
        updatedAt: new Date()
      }
    );

  }

}