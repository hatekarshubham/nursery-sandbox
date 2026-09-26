import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  addDoc
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private firestore = inject(Firestore);

  async addProduct(product: any) {

    console.log('1. ProductService called:', product);

    const productsCollection = collection(
      this.firestore,
      'products'
    );

    console.log('2. About to write to Firestore');

    const result = await addDoc(
      productsCollection,
      product
    );

    console.log('3. Firestore document created:', result.id);

    return result;
  }
}