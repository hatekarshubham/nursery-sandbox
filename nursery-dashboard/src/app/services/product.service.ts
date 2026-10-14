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
  getDocs,
  query,
  where,
  documentId,
  limit,
  runTransaction
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { shareLiveStream } from './shared-stream';

import {
  DuplicateError,
  buildUniqueKey,
  reserveUniqueKey
} from './unique-key';


// Search key stored as products.nameLower (lower-case, single spaces).
export function normalizeProductName(name: unknown): string {

  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

}


// Longest word prefix that is stored and searched (keeps the index small).
const MAX_PREFIX_LENGTH = 10;

const MAX_SEARCH_WORDS = 8;


// Splits text into lower-case words (letters and digits only).
export function searchWords(text: unknown): string[] {

  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length > 0);

}


// Stored as products.searchPrefixes so a product can be found by the
// start of ANY word in its name. "Red Rose" is found by "r", "ro", "red"
// and "rose". Typing "red ro" works too (see searchProducts).
export function buildSearchPrefixes(name: unknown): string[] {

  const prefixes = new Set<string>();

  for (const word of searchWords(name).slice(0, MAX_SEARCH_WORDS)) {

    const limit = Math.min(word.length, MAX_PREFIX_LENGTH);

    for (let length = 1; length <= limit; length++) {

      prefixes.add(word.slice(0, length));

    }

  }

  return [...prefixes];

}


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
  // DUPLICATE PRODUCT CHECK
  // =========================================================
  //
  // A product is a duplicate when the same supplier already
  // has a product with the same name (ignoring case and extra
  // spaces). The same name from a different supplier is fine.
  //
  // =========================================================

  private duplicateProductMessage(
    name: unknown,
    supplier: unknown
  ): string {

    const supplierText =
      String(supplier ?? '').trim();

    return (
      `Product "${String(name ?? '').trim()}" already exists` +
      (supplierText ? ` for ${supplierText}` : '') +
      '.'
    );

  }


  private async assertProductNotDuplicate(
    product: any,
    excludeProductId?: string
  ): Promise<void> {

    const supplierId =
      String(product.supplierId ?? '');

    if (!supplierId) {

      return;

    }

    const nameLower =
      normalizeProductName(product.name);

    const rawName =
      String(product.name ?? '').trim();

    // nameLower covers products saved after search was added;
    // the plain name covers older products that do not have it.
    const [byKey, byName] =
      await Promise.all([
        getDocs(
          query(
            collection(this.firestore, 'products'),
            where('supplierId', '==', supplierId),
            where('nameLower', '==', nameLower),
            limit(5)
          )
        ),
        getDocs(
          query(
            collection(this.firestore, 'products'),
            where('supplierId', '==', supplierId),
            where('name', '==', rawName),
            limit(5)
          )
        )
      ]);

    const clash =
      [...byKey.docs, ...byName.docs].some(
        entry =>
          entry.id !== excludeProductId
      );

    if (clash) {

      throw new DuplicateError(
        this.duplicateProductMessage(
          product.name,
          product.supplier
        )
      );

    }

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

    await this.assertProductNotDuplicate(product);


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
            // SAME SUPPLIER + SAME NAME = DUPLICATE
            // =================================================

            const supplierId =
              String(product.supplierId ?? '');

            const nameLower =
              normalizeProductName(product.name);

            const writeLock =
              supplierId
                ? await reserveUniqueKey(
                    this.firestore,
                    transaction,
                    buildUniqueKey(
                      'product',
                      supplierId,
                      nameLower
                    ),
                    productRef,
                    data =>
                      data?.supplierId ===
                        supplierId &&
                      normalizeProductName(
                        data?.name
                      ) === nameLower,
                    this.duplicateProductMessage(
                      product.name,
                      product.supplier
                    )
                  )
                : null;


            // =================================================
            // CREATE PRODUCT
            // =================================================

            transaction.set(
              productRef,
              {

                ...product,

                // Lower-case copy of the name, used for prefix search.
                nameLower:
                  normalizeProductName(product.name),

                searchPrefixes:
                  buildSearchPrefixes(product.name),

                barcode,

                createdAt:
                  product.createdAt ??
                  new Date(),

                updatedAt:
                  new Date()

              }
            );


            writeLock?.();


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


        // A new product must show up in supplier product lists.
        this.supplierProductsCache.clear();

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

  //
  // One shared listener for the whole session. Every screen
  // that calls getProducts() reuses it instead of reading
  // the whole collection again.
  //
  // =========================================================

  private readonly products$: Observable<any[]> =
    shareLiveStream<any[]>(
      'products',
      () => {

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
    );


  getProducts():
    Observable<any[]> {

    return this.products$;

  }


  // =========================================================
  // SERVER SEARCH (for the product picker)
  // =========================================================
  //
  // These read only the few matching products instead of the
  // whole catalogue. Name search needs products.nameLower,
  // which new/edited products get automatically and old ones get
  // from scripts/backfill.mjs.
  //
  // =========================================================

  //
  // Finds products whose name has a word starting with what was
  // typed ("ro" finds "Red Rose"). Several words must all match
  // ("red ro"). Optionally limited to one supplier.
  //
  // Reads at most `fetchLimit` documents per search.
  //
  async searchProducts(
    term: string,
    options: {
      supplierId?: string;
      maxResults?: number;
      fetchLimit?: number;
    } = {}
  ): Promise<any[]> {

    const words = searchWords(term);

    if (words.length === 0) {

      return [];

    }

    const maxResults = options.maxResults ?? 20;

    const fetchLimit = options.fetchLimit ?? 60;

    // The longest word narrows the server query the most.
    const key = [...words]
      .sort((a, b) => b.length - a.length)[0]
      .slice(0, MAX_PREFIX_LENGTH);

    const constraints: any[] = [
      where('searchPrefixes', 'array-contains', key)
    ];

    if (options.supplierId) {

      constraints.push(
        where('supplierId', '==', options.supplierId)
      );

    }

    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'products'),
        ...constraints,
        limit(fetchLimit)
      )
    );

    return snapshot.docs
      .map(entry => ({ id: entry.id, ...entry.data() } as any))
      .filter(product => {

        const nameWords = searchWords(product.name);

        return words.every(word =>
          nameWords.some(nameWord => nameWord.startsWith(word))
        );

      })
      .sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''))
      )
      .slice(0, maxResults);

  }


  //
  // All products of one supplier (used by the product picker on
  // Add Purchase so the list can be shown straight away).
  // Reads one document per product of that supplier, not the whole
  // catalogue. The answer is reused for 2 minutes so several rows
  // on the same screen share one read. Asks for one more than
  // `maxProducts` so the caller can tell the list was cut off.
  //
  private supplierProductsCache =
    new Map<string, { at: number; list: Promise<any[]> }>();

  getProductsBySupplier(
    supplierId: string,
    maxProducts = 300
  ): Promise<any[]> {

    const cached = this.supplierProductsCache.get(supplierId);

    if (cached && Date.now() - cached.at < 2 * 60 * 1000) {

      return cached.list;

    }

    const list = getDocs(
      query(
        collection(this.firestore, 'products'),
        where('supplierId', '==', supplierId),
        limit(maxProducts + 1)
      )
    ).then(snapshot =>
      snapshot.docs
        .map(entry => ({ id: entry.id, ...entry.data() } as any))
        .sort((a, b) =>
          String(a.name ?? '').localeCompare(String(b.name ?? ''))
        )
    );

    // Do not keep a failed read.
    list.catch(() => this.supplierProductsCache.delete(supplierId));

    this.supplierProductsCache.set(supplierId, { at: Date.now(), list });

    return list;

  }


  // Fetches specific products by their IDs (30 per query, the
  // Firestore limit). Reads one document per ID.
  async getProductsByIds(ids: string[]): Promise<any[]> {

    const unique = [...new Set(ids.filter(Boolean))];

    const chunks: string[][] = [];

    for (let i = 0; i < unique.length; i += 30) {

      chunks.push(unique.slice(i, i + 30));

    }

    const snapshots = await Promise.all(
      chunks.map(chunk =>
        getDocs(
          query(
            collection(this.firestore, 'products'),
            where(documentId(), 'in', chunk)
          )
        )
      )
    );

    return snapshots.flatMap(snapshot =>
      snapshot.docs.map(
        entry => ({ id: entry.id, ...entry.data() } as any)
      )
    );

  }


  async findProductByBarcode(
    barcode: string
  ): Promise<any | null> {

    const code = String(barcode ?? '').trim();

    if (!code) {

      return null;

    }

    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'products'),
        where('barcode', '==', code),
        limit(1)
      )
    );

    const first = snapshot.docs[0];

    return first
      ? { id: first.id, ...first.data() }
      : null;

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

    await this.assertProductNotDuplicate(
      product,
      productId
    );

    this.supplierProductsCache.clear();

    await updateDoc(
      productRef,
      {

        name:
          product.name,

        nameLower:
          normalizeProductName(product.name),

        searchPrefixes:
          buildSearchPrefixes(product.name),

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

        color:
          product.color ?? '',

        colorName:
          product.colorName ?? '',

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


    this.supplierProductsCache.clear();

    await deleteDoc(
      productRef
    );


    console.log(
      'Product deleted successfully:',
      productId
    );

  }

}