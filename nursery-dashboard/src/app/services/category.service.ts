import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

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

  private firestore = inject(Firestore);

  private categoriesCollection =
    collection(
      this.firestore,
      'categories'
    ) as CollectionReference<DocumentData>;

  // Get all categories
  getCategories(): Observable<Category[]> {

    return collectionData(
      this.categoriesCollection,
      {
        idField: 'id'
      }
    ) as Observable<Category[]>;

  }

  // Add a new category
  async addCategory(
    name: string,
    code: string
  ) {

    const category: Category = {

      name: name.trim(),

      code: code.trim().toUpperCase(),

      isActive: true

    };

    const result = await addDoc(
      this.categoriesCollection,
      category
    );

    console.log(
      'Category added successfully:',
      result.id
    );

    return result;

  }

}