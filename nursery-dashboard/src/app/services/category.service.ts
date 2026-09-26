import { Injectable } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

export interface Category {
  id?: string;
  name: string;
  code: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(
    private firestore: Firestore
  ) {}

  // =========================
  // GET ALL CATEGORIES
  // =========================

  getCategories() {
    const categoriesRef =
      collection(
        this.firestore,
        'categories'
      ) as CollectionReference<DocumentData>;

    return collectionData(
      categoriesRef,
      {
        idField: 'id'
      }
    ) as import('rxjs').Observable<Category[]>;
  }

  // =========================
  // GET ACTIVE CATEGORIES
  // =========================

  getActiveCategories() {
    const categoriesRef =
      collection(
        this.firestore,
        'categories'
      );

    const activeCategoriesQuery =
      query(
        categoriesRef,
        where(
          'isActive',
          '==',
          true
        )
      );

    return collectionData(
      activeCategoriesQuery,
      {
        idField: 'id'
      }
    ) as import('rxjs').Observable<Category[]>;
  }

  // =========================
  // ADD CATEGORY
  // =========================

  async addCategory(
    name: string,
    code: string
  ) {
    const categoriesRef =
      collection(
        this.firestore,
        'categories'
      );

    return addDoc(
      categoriesRef,
      {
        name,
        code,
        isActive: true
      }
    );
  }

  // =========================
  // UPDATE CATEGORY
  // =========================

  async updateCategory(
    id: string,
    name: string,
    code: string
  ) {
    const categoryRef =
      doc(
        this.firestore,
        'categories',
        id
      );

    return updateDoc(
      categoryRef,
      {
        name,
        code
      }
    );
  }

  // =========================
  // UPDATE CATEGORY STATUS
  // =========================

  async updateCategoryStatus(
    id: string,
    isActive: boolean
  ) {
    const categoryRef =
      doc(
        this.firestore,
        'categories',
        id
      );

    return updateDoc(
      categoryRef,
      {
        isActive
      }
    );
  }

  // =========================
  // GET PRODUCT COUNT
  // =========================

  async getProductCountByCategory(
    categoryName: string
  ): Promise<number> {

    const productsRef =
      collection(
        this.firestore,
        'products'
      );

    const productsQuery =
      query(
        productsRef,
        where(
          'category',
          '==',
          categoryName
        )
      );

    const productsSnapshot =
      await getDocs(productsQuery);

    return productsSnapshot.size;
  }

  // =========================
  // DELETE CATEGORY + PRODUCTS
  // =========================

  async deleteCategoryAndProducts(
    categoryId: string,
    categoryName: string
  ): Promise<{
    productsDeleted: number;
  }> {

    const productsRef =
      collection(
        this.firestore,
        'products'
      );

    const productsQuery =
      query(
        productsRef,
        where(
          'category',
          '==',
          categoryName
        )
      );

    const productsSnapshot =
      await getDocs(productsQuery);

    const productsDeleted =
      productsSnapshot.size;

    /*
     * Firestore has a maximum of
     * 500 writes per WriteBatch.
     *
     * Use 400 to leave some safety margin.
     */
    const BATCH_SIZE = 400;

    // Delete products in batches.
    for (
      let startIndex = 0;
      startIndex < productsSnapshot.docs.length;
      startIndex += BATCH_SIZE
    ) {

      const batch =
        writeBatch(this.firestore);

      const batchDocuments =
        productsSnapshot.docs.slice(
          startIndex,
          startIndex + BATCH_SIZE
        );

      for (
        const productDocument of batchDocuments
      ) {

        batch.delete(
          productDocument.ref
        );
      }

      await batch.commit();

      console.log(
        `Deleted ${batchDocuments.length} product(s).`
      );
    }

    // Delete category after products.
    const categoryRef =
      doc(
        this.firestore,
        'categories',
        categoryId
      );

    const categoryBatch =
      writeBatch(this.firestore);

    categoryBatch.delete(
      categoryRef
    );

    await categoryBatch.commit();

    console.log(
      `Category "${categoryName}" deleted successfully.`
    );

    return {
      productsDeleted
    };
  }
}