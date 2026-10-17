import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

import { Observable, firstValueFrom } from 'rxjs';

import { shareLiveStream } from './shared-stream';

import { assertFieldsUnique } from './unique-key';

export interface Supplier {

  id?: string;

  name: string;

  mobile: string;

  email: string;

  address: string;

  gstNumber: string;

  notes: string;

  isActive: boolean;

  createdAt?: any;

  updatedAt?: any;

}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  private firestore = inject(Firestore);

  private suppliersCollection =
    collection(
      this.firestore,
      'suppliers'
    ) as CollectionReference<DocumentData>;


  // Small collection: one shared listener for the whole
  // session.

  private readonly suppliers$: Observable<Supplier[]> =
    shareLiveStream<Supplier[]>(
      'suppliers',
      () =>
        collectionData(
          this.suppliersCollection,
          {
            idField: 'id'
          }
        ) as Observable<Supplier[]>
    );


  getSuppliers(): Observable<Supplier[]> {

    return this.suppliers$;

  }


  private readonly uniqueRules = [
    { field: 'name', label: 'Supplier name' },
    { field: 'gstNumber', label: 'GST number' }
  ];


  async addSupplier(
    supplier: Omit<Supplier, 'id'>
  ) {

    assertFieldsUnique(
      await firstValueFrom(this.suppliers$),
      supplier,
      this.uniqueRules
    );

    return addDoc(
      this.suppliersCollection,
      {
        ...supplier,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );

  }


  async updateSupplier(
    supplierId: string,
    supplier: Partial<Supplier>
  ) {

    const supplierRef =
      doc(
        this.firestore,
        'suppliers',
        supplierId
      );

    if (
      supplier.name !== undefined ||
      supplier.gstNumber !== undefined
    ) {

      const current =
        await firstValueFrom(this.suppliers$);

      const existing =
        current.find(item => item.id === supplierId);

      assertFieldsUnique(
        current,
        {
          name: supplier.name ?? existing?.name,
          gstNumber:
            supplier.gstNumber ?? existing?.gstNumber
        },
        this.uniqueRules,
        supplierId
      );

    }


    const updateData: any = {
      updatedAt: new Date()
    };


    if (supplier.name !== undefined) {

      updateData.name =
        supplier.name;

    }


    if (supplier.mobile !== undefined) {

      updateData.mobile =
        supplier.mobile;

    }


    if (supplier.email !== undefined) {

      updateData.email =
        supplier.email;

    }


    if (supplier.address !== undefined) {

      updateData.address =
        supplier.address;

    }


    if (supplier.gstNumber !== undefined) {

      updateData.gstNumber =
        supplier.gstNumber;

    }


    if (supplier.notes !== undefined) {

      updateData.notes =
        supplier.notes;

    }


    if (supplier.isActive !== undefined) {

      updateData.isActive =
        supplier.isActive;

    }


    await updateDoc(
      supplierRef,
      updateData
    );

  }


  async updateSupplierStatus(
    supplierId: string,
    isActive: boolean
  ) {

    const supplierRef =
      doc(
        this.firestore,
        'suppliers',
        supplierId
      );

    await updateDoc(
      supplierRef,
      {
        isActive,
        updatedAt: new Date()
      }
    );

  }


  async deleteSupplier(
    supplierId: string
  ) {

    const supplierRef =
      doc(
        this.firestore,
        'suppliers',
        supplierId
      );

    await deleteDoc(
      supplierRef
    );

  }

}