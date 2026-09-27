import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProductService } from '../../../../services/product.service';

import {
  Category,
  CategoryService
} from '../../../../services/category.service';

import {
  Supplier,
  SupplierService
} from '../../../../services/supplier.service';


interface Product {
  id?: string;

  name: string;
  category: string;

  // =========================
  // SUPPLIER - ONE PER PRODUCT
  // =========================

  supplierId?: string;
  supplier?: string;

  categoryIsActive: boolean;
  isAvailable: boolean;

  description: string;

  unitPrice: number;
  gst: number;

  standardPackage: number | null;

  stockQuantity: number;
  quantity: number;

  image: string;

  isActive: boolean;

  createdAt?: any;
  updatedAt?: any;
}


@Component({
  selector: 'app-products',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})


export class ProductsComponent implements OnInit {

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private supplierService: SupplierService
  ) {}


  // =========================
  // PRODUCT TABLE
  // =========================

  tableData: Product[] = [];


  // =========================
  // CATEGORIES
  // =========================

  categories: Category[] = [];


  // =========================
  // SUPPLIERS
  // =========================

  suppliers: Supplier[] = [];

  isLoadingSuppliers = true;


  // =========================
  // LOADING
  // =========================

  isLoading = true;


  // =========================
  // PRODUCT DETAILS POPUP
  // =========================

  selectedProduct: Product | null = null;


  // =========================
  // EDIT PRODUCT
  // =========================

  isEditModalOpen = false;

  editingProduct: Product | null = null;

  isSavingProduct = false;


  // =========================
  // DELETE PRODUCT
  // =========================

  isDeleteModalOpen = false;

  productToDelete: Product | null = null;

  isDeletingProduct = false;


  // =========================
  // INIT
  // =========================

  ngOnInit() {

    // -------------------------
    // LOAD CATEGORIES
    // -------------------------

    this.categoryService
      .getCategories()
      .subscribe({

        next: (categories) => {

          this.categories = categories;

          this.loadProducts();

        },

        error: (error) => {

          console.error(
            'Error loading categories:',
            error
          );

          this.isLoading = false;

        }

      });


    // -------------------------
    // LOAD SUPPLIERS
    // -------------------------

    this.supplierService
      .getSuppliers()
      .subscribe({

        next: (suppliers) => {

          this.suppliers = suppliers;

          this.isLoadingSuppliers = false;

          console.log(
            'Suppliers loaded:',
            this.suppliers
          );

        },

        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );

          this.isLoadingSuppliers = false;

        }

      });

  }


  // =========================
  // LOAD PRODUCTS
  // =========================

  loadProducts() {

    this.productService
      .getProducts()
      .subscribe({

        next: (products: any[]) => {

          this.tableData =
            products.map((product) => {

              // -------------------------
              // FIND CATEGORY
              // -------------------------

              const matchingCategory =
                this.categories.find(
                  (category) =>
                    category.name === product.category
                );


              // -------------------------
              // CATEGORY STATUS
              // -------------------------

              const categoryIsActive =
                matchingCategory
                  ? matchingCategory.isActive
                  : false;


              // -------------------------
              // PRODUCT STATUS
              // -------------------------

              const productIsActive =
                product.isActive !== false;


              // -------------------------
              // STOCK STATUS
              // -------------------------

              const hasStock =
                (product.stockQuantity ?? 0) > 0;


              // -------------------------
              // AVAILABILITY
              // -------------------------

              const isAvailable =
                productIsActive &&
                categoryIsActive &&
                hasStock;


              // -------------------------
              // SUPPLIER
              // -------------------------

              let supplierId =
                product.supplierId ?? '';

              let supplierName =
                product.supplier ?? '';


              // -------------------------
              // BACKWARD COMPATIBILITY
              // -------------------------
              // If a product was temporarily
              // saved using array fields,
              // use the first supplier.
              // -------------------------

              if (
                !supplierId &&
                Array.isArray(product.supplierIds) &&
                product.supplierIds.length > 0
              ) {

                supplierId =
                  product.supplierIds[0];

              }


              if (
                !supplierName &&
                Array.isArray(product.supplierNames) &&
                product.supplierNames.length > 0
              ) {

                supplierName =
                  product.supplierNames[0];

              }


              // -------------------------
              // RESOLVE NAME FROM ID
              // -------------------------
              // If Firestore has supplierId
              // but supplier name is missing,
              // resolve it from suppliers.
              // -------------------------

              if (
                supplierId &&
                !supplierName
              ) {

                const matchingSupplier =
                  this.suppliers.find(
                    (supplier) =>
                      supplier.id === supplierId
                  );


                supplierName =
                  matchingSupplier?.name ?? '';

              }


              // -------------------------
              // RETURN PRODUCT
              // -------------------------

              return {

                ...product,

                supplierId,

                supplier:
                  supplierName,

                quantity:
                  product.stockQuantity ?? 0,

                categoryIsActive,

                isAvailable

              };

            }) as Product[];


          this.isLoading = false;


          console.log(
            'Products loaded:',
            this.tableData
          );

        },


        error: (error: any) => {

          console.error(
            'Error loading products:',
            error
          );

          this.isLoading = false;

        }

      });

  }


  // =========================
  // GET SUPPLIER NAME
  // =========================

  getSupplierName(
    product: Product
  ): string {

    // Stored supplier name

    if (
      product.supplier &&
      product.supplier.trim()
    ) {

      return product.supplier;

    }


    // Resolve using supplier ID

    if (product.supplierId) {

      const matchingSupplier =
        this.suppliers.find(
          (supplier) =>
            supplier.id === product.supplierId
        );


      if (matchingSupplier) {

        return matchingSupplier.name;

      }

    }


    return 'No supplier';

  }


  // =========================
  // EDIT SUPPLIER CHANGE
  // =========================

  onEditSupplierChange(
    supplierId: string
  ) {

    if (!this.editingProduct) {
      return;
    }


    // -------------------------
    // FIND SUPPLIER
    // -------------------------

    const selectedSupplier =
      this.suppliers.find(
        (supplier) =>
          supplier.id === supplierId
      );


    // -------------------------
    // SAVE ID
    // -------------------------

    this.editingProduct.supplierId =
      supplierId;


    // -------------------------
    // SAVE NAME
    // -------------------------

    this.editingProduct.supplier =
      selectedSupplier?.name ?? '';


    console.log(
      'Selected supplier ID:',
      this.editingProduct.supplierId
    );


    console.log(
      'Selected supplier name:',
      this.editingProduct.supplier
    );

  }


  // =========================
  // PRODUCT DETAILS
  // =========================

  openProductDetails(
    product: Product
  ) {

    this.selectedProduct =
      product;

  }


  // =========================
  // CLOSE PRODUCT DETAILS
  // =========================

  closeProductDetails() {

    this.selectedProduct =
      null;

  }


  // =========================
  // OPEN EDIT PRODUCT
  // =========================

  editProduct(
    product: Product
  ) {

    if (!product.id) {

      console.error(
        'Cannot edit product without an ID.'
      );

      return;

    }


    // -------------------------
    // COPY PRODUCT
    // -------------------------

    this.editingProduct = {

      ...product,

      supplierId:
        product.supplierId ?? '',

      supplier:
        product.supplier ?? ''

    };


    console.log(
      'Editing product:',
      this.editingProduct
    );


    this.isEditModalOpen =
      true;

  }


  // =========================
  // CLOSE EDIT MODAL
  // =========================

  closeEditModal() {

    if (this.isSavingProduct) {
      return;
    }


    this.isEditModalOpen =
      false;


    this.editingProduct =
      null;

  }


  // =========================
  // SAVE PRODUCT
  // =========================

  async saveProduct() {

    if (!this.editingProduct) {
      return;
    }


    const product =
      this.editingProduct;


    const productId =
      product.id;


    // -------------------------
    // PRODUCT ID
    // -------------------------

    if (!productId) {

      console.error(
        'Cannot update product without an ID.'
      );

      return;

    }


    // -------------------------
    // PRODUCT NAME
    // -------------------------

    if (!product.name.trim()) {

      alert(
        'Please enter a product name.'
      );

      return;

    }


    // -------------------------
    // CATEGORY
    // -------------------------

    if (!product.category) {

      alert(
        'Please select a category.'
      );

      return;

    }


    // -------------------------
    // SUPPLIER
    // -------------------------

    if (!product.supplierId) {

      alert(
        'Please select a supplier.'
      );

      return;

    }


    // -------------------------
    // UNIT PRICE
    // -------------------------

    if (
      !Number.isFinite(
        product.unitPrice
      ) ||
      product.unitPrice <= 0
    ) {

      alert(
        'Please enter a valid unit price.'
      );

      return;

    }


    // -------------------------
    // STOCK
    // -------------------------

    if (
      !Number.isInteger(
        product.stockQuantity
      ) ||
      product.stockQuantity < 0
    ) {

      alert(
        'Please enter a valid stock quantity.'
      );

      return;

    }


    // -------------------------
    // RESOLVE SUPPLIER NAME
    // -------------------------

    const selectedSupplier =
      this.suppliers.find(
        (supplier) =>
          supplier.id === product.supplierId
      );


    const supplierName =
      selectedSupplier?.name ??
      product.supplier ??
      '';


    // -------------------------
    // SAVE
    // -------------------------

    this.isSavingProduct =
      true;


    try {

      await this.productService.updateProduct(

        productId,

        {

          name:
            product.name.trim(),

          category:
            product.category,

          supplierId:
            product.supplierId,

          supplier:
            supplierName,

          description:
            product.description ?? '',

          unitPrice:
            product.unitPrice,

          gst:
            product.gst ?? 0,

          standardPackage:
            product.standardPackage ?? null,

          stockQuantity:
            product.stockQuantity,

          image:
            product.image ?? '',

          isActive:
            product.isActive !== false

        }

      );


      this.isSavingProduct =
        false;


      this.isEditModalOpen =
        false;


      this.editingProduct =
        null;


      alert(
        'Product updated successfully.'
      );


      this.loadProducts();

    }


    catch (error) {

      console.error(
        'Error updating product:',
        error
      );


      this.isSavingProduct =
        false;


      alert(
        'Failed to update product. Please try again.'
      );

    }

  }


  // =========================
  // OPEN DELETE MODAL
  // =========================

  openDeleteModal(
    product: Product
  ) {

    if (!product.id) {

      console.error(
        'Cannot delete product without an ID.'
      );

      return;

    }


    this.productToDelete =
      product;


    this.isDeleteModalOpen =
      true;

  }


  // =========================
  // CLOSE DELETE MODAL
  // =========================

  closeDeleteModal() {

    if (this.isDeletingProduct) {
      return;
    }


    this.isDeleteModalOpen =
      false;


    this.productToDelete =
      null;

  }


  // =========================
  // CONFIRM DELETE
  // =========================

  async confirmDeleteProduct() {

    if (!this.productToDelete?.id) {
      return;
    }


    this.isDeletingProduct =
      true;


    try {

      await this.productService.deleteProduct(
        this.productToDelete.id
      );


      this.isDeletingProduct =
        false;


      this.isDeleteModalOpen =
        false;


      this.productToDelete =
        null;


      alert(
        'Product deleted successfully.'
      );


      this.loadProducts();

    }


    catch (error) {

      console.error(
        'Error deleting product:',
        error
      );


      this.isDeletingProduct =
        false;


      alert(
        'Failed to delete product. Please try again.'
      );

    }

  }

}