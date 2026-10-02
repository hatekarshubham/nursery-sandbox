import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
  DocumentData,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private firestore = inject(Firestore);


  // =========================================================
  // BARCODE CONFIGURATION
  // =========================================================

  private readonly BARCODE_PREFIX = 'GN-';

  private readonly BARCODE_DIGITS = 8;


  // =========================================================
  // GENERATE RANDOM 8 DIGIT NUMBER
  // =========================================================

  private generateRandomEightDigitNumber(): string {

    // ---------------------------------------------------------
    // We generate values from:
    //
    // 10000000
    // to
    // 99999999
    //
    // This guarantees exactly 8 digits.
    // ---------------------------------------------------------

    const min = 10000000;

    const max = 99999999;

    const range =
      max - min + 1;


    // ---------------------------------------------------------
    // Use crypto instead of Math.random()
    // ---------------------------------------------------------

    const randomArray =
      new Uint32Array(1);


    crypto.getRandomValues(
      randomArray
    );


    const randomNumber =
      min +
      (
        randomArray[0] %
        range
      );


    return randomNumber.toString();

  }


  // =========================================================
  // GENERATE BARCODE
  // =========================================================

  private generateBarcode(): string {

    const randomNumber =
      this.generateRandomEightDigitNumber();


    return (
      this.BARCODE_PREFIX +
      randomNumber
    );

  }


  // =========================================================
  // ADD PRODUCT
  // =========================================================

  async addProduct(
    product: any
  ) {

    console.log(
      '1. ProductService called:',
      product
    );


    // ---------------------------------------------------------
    // Create a Firestore reference for the new product.
    //
    // IMPORTANT:
    //
    // This generates the Firestore document ID locally.
    //
    // It DOES NOT write anything to Firestore yet.
    // ---------------------------------------------------------

    const productRef =
      doc(
        collection(
          this.firestore,
          'products'
        )
      );


    console.log(
      '2. Generated product document ID:',
      productRef.id
    );


    // ---------------------------------------------------------
    // Try multiple times in the extremely unlikely event
    // that a randomly generated barcode already exists.
    // ---------------------------------------------------------

    const maxAttempts = 20;


    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {

      // -------------------------------------------------------
      // Generate candidate barcode
      // -------------------------------------------------------

      const barcode =
        this.generateBarcode();


      console.log(
        `Barcode attempt ${attempt}:`,
        barcode
      );


      // -------------------------------------------------------
      // Barcode registry document
      //
      // Example:
      //
      // barcodes
      //    └── GN-48276193
      //
      // Using the barcode itself as the document ID allows
      // Firestore transactions to protect uniqueness.
      // -------------------------------------------------------

      const barcodeRef =
        doc(
          this.firestore,
          'barcodes',
          barcode
        );


      try {

        await runTransaction(
          this.firestore,
          async transaction => {

            // =================================================
            // CHECK BARCODE
            // =================================================

            const barcodeSnapshot =
              await transaction.get(
                barcodeRef
              );


            // -------------------------------------------------
            // Barcode already exists
            // -------------------------------------------------

            if (
              barcodeSnapshot.exists()
            ) {

              throw new Error(
                'BARCODE_COLLISION'
              );

            }


            // =================================================
            // CREATE PRODUCT
            // =================================================

            transaction.set(
              productRef,
              {

                ...product,

                barcode,

                createdAt:
                  product.createdAt ??
                  new Date(),

                updatedAt:
                  new Date()

              }
            );


            // =================================================
            // RESERVE BARCODE
            // =================================================

            transaction.set(
              barcodeRef,
              {

                barcode,

                productId:
                  productRef.id,

                createdAt:
                  new Date()

              }
            );

          }
        );


        console.log(
          '3. Product created successfully:',
          productRef.id
        );


        console.log(
          '4. Barcode assigned:',
          barcode
        );


        // -----------------------------------------------------
        // Keep this return structure useful for future screens.
        // -----------------------------------------------------

        return {

          id:
            productRef.id,

          barcode

        };

      }


      catch (error: any) {

        // =====================================================
        // BARCODE COLLISION
        // =====================================================

        if (
          error?.message ===
          'BARCODE_COLLISION'
        ) {

          console.warn(
            'Barcode collision detected:',
            barcode
          );


          console.warn(
            'Generating another barcode...'
          );


          continue;

        }


        // =====================================================
        // ACTUAL FIRESTORE ERROR
        // =====================================================

        console.error(
          'Failed to create product:',
          error
        );


        throw error;

      }

    }


    // =========================================================
    // MAX ATTEMPTS EXCEEDED
    // =========================================================

    throw new Error(
      'Unable to generate a unique product barcode. Please try again.'
    );

  }


  // =========================================================
  // GET ALL PRODUCTS
  // =========================================================

  getProducts():
    Observable<any[]> {

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


  // =========================================================
  // UPDATE PRODUCT
  // =========================================================

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


    // ---------------------------------------------------------
    // IMPORTANT:
    //
    // Barcode is intentionally NOT updated here.
    //
    // Once a product receives a barcode, we keep that barcode
    // permanently associated with the product.
    // ---------------------------------------------------------

    await updateDoc(
      productRef,
      {

        name:
          product.name,

        category:
          product.category,

        categoryId:
          product.categoryId ?? '',


        // =====================================================
        // SUPPLIER
        // =====================================================

        supplierId:
          product.supplierId ?? '',

        supplier:
          product.supplier ?? '',


        // =====================================================
        // PRODUCT DETAILS
        // =====================================================

        description:
          product.description ?? '',

        unitPrice:
          product.unitPrice,

        gst:
          product.gst ?? 0,

        standardPackage:
          product.standardPackage ??
          null,

        image:
          product.image ?? '',

        isActive:
          product.isActive !== false,


        // =====================================================
        // UPDATED DATE
        // =====================================================

        updatedAt:
          new Date()

      }
    );


    console.log(
      'Product updated successfully:',
      productId
    );

  }


  // =========================================================
  // DELETE PRODUCT
  // =========================================================

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