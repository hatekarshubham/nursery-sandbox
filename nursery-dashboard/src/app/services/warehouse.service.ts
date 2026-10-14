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

import { Observable, firstValueFrom } from 'rxjs';

import { shareLiveStream } from './shared-stream';

import { assertFieldsUnique } from './unique-key';


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

  // Small collection: one shared listener for the whole
  // session, kept open for the full default grace period.

  private readonly warehouses$: Observable<Warehouse[]> =
    shareLiveStream<Warehouse[]>(
      'warehouses',
      () =>
        collectionData(
          this.warehousesCollection,
          {
            idField: 'id'
          }
        ) as Observable<Warehouse[]>
    );


  private readonly uniqueRules = [
    { field: 'name', label: 'Warehouse name' },
    { field: 'code', label: 'Warehouse code' }
  ];


  getWarehouses(): Observable<Warehouse[]> {

    return this.warehouses$;

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

    assertFieldsUnique(
      await firstValueFrom(this.warehouses$),
      warehouse,
      this.uniqueRules
    );

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

    if (
      warehouse.name !== undefined ||
      warehouse.code !== undefined
    ) {

      const current =
        await firstValueFrom(this.warehouses$);

      const existing =
        current.find(item => item.id === warehouseId);

      assertFieldsUnique(
        current,
        {
          name: warehouse.name ?? existing?.name,
          code: warehouse.code ?? existing?.code
        },
        this.uniqueRules,
        warehouseId
      );

    }


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