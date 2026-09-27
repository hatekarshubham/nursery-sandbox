import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  CollectionReference,
  DocumentData,
  doc,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private firestore = inject(Firestore);


  // =========================
  // ADD PRODUCT
  // =========================

  async addProduct(product: any) {

    console.log(
      '1. ProductService called:',
      product
    );

    const productsCollection =
      collection(
        this.firestore,
        'products'
      );

    console.log(
      '2. About to write to Firestore'
    );

    const result =
      await addDoc(
        productsCollection,
        product
      );

    console.log(
      '3. Firestore document created:',
      result.id
    );

    return result;
  }


  // =========================
  // GET ALL PRODUCTS
  // =========================

  getProducts(): Observable<any[]> {

    const productsCollection =
      collection(
        this.firestore,
        'products'
      ) as CollectionReference<DocumentData>;

    return collectionData(
      productsCollection,
      {
        idField: 'id'
      }
    ) as Observable<any[]>;

  }


  // =========================
  // UPDATE PRODUCT
  // =========================

  async updateProduct(
    productId: string,
    product: any
  ) {

    console.log(
      'Updating product:',
      productId,
      product
    );

    const productRef =
      doc(
        this.firestore,
        'products',
        productId
      );

    await updateDoc(
      productRef,
      {

        name:
          product.name,

        category:
          product.category,

        categoryId:
          product.categoryId ?? '',

        // =========================
        // SUPPLIER
        // =========================

        supplierId:
          product.supplierId ?? '',

        supplier:
          product.supplier ?? '',

        description:
          product.description ?? '',

        unitPrice:
          product.unitPrice,

        gst:
          product.gst ?? 0,

        standardPackage:
          product.standardPackage ?? null,

        image:
          product.image ?? '',

        isActive:
          product.isActive !== false,

        updatedAt:
          new Date()

      }
    );

    console.log(
      'Product updated successfully:',
      productId
    );

  }


  // =========================
  // DELETE PRODUCT
  // =========================

  async deleteProduct(
    productId: string
  ) {

    console.log(
      'Deleting product:',
      productId
    );

    const productRef =
      doc(
        this.firestore,
        'products',
        productId
      );

    await deleteDoc(
      productRef
    );

    console.log(
      'Product deleted successfully:',
      productId
    );

  }

}