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

import { Observable } from 'rxjs';

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


  getSuppliers(): Observable<Supplier[]> {

    return collectionData(
      this.suppliersCollection,
      {
        idField: 'id'
      }
    ) as Observable<Supplier[]>;

  }


  async addSupplier(
    supplier: Omit<Supplier, 'id'>
  ) {

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