import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ProductService } from '../../../../services/product.service';

import {
  Category,
  CategoryService
} from '../../../../services/category.service';


interface Product {

  id?: string;

  name: string;

  category: string;

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

    private categoryService: CategoryService

  ) {}


  tableData: Product[] = [];

  categories: Category[] = [];

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


  ngOnInit() {

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

              const matchingCategory =

                this.categories.find(

                  (category) =>

                    category.name ===

                    product.category

                );


              const categoryIsActive =

                matchingCategory

                  ? matchingCategory.isActive

                  : false;


              const productIsActive =

                product.isActive !== false;


              // Product must have stock
              // greater than zero.

              const hasStock =

                (product.stockQuantity ?? 0) > 0;


              // Product is available only when:
              //
              // 1. Product is active
              // 2. Category is active
              // 3. Stock quantity is greater than 0

              const isAvailable =

                productIsActive &&

                categoryIsActive &&

                hasStock;


              return {

                ...product,

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
  // PRODUCT DETAILS
  // =========================

  openProductDetails(

    product: Product

  ) {

    this.selectedProduct =

      product;

  }


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


    this.editingProduct = {

      ...product

    };


    this.isEditModalOpen = true;

  }


  // =========================
  // CLOSE EDIT MODAL
  // =========================

  closeEditModal() {

    if (this.isSavingProduct) {

      return;

    }


    this.isEditModalOpen = false;

    this.editingProduct = null;

  }


  // =========================
  // SAVE EDITED PRODUCT
  // =========================

  async saveProduct() {

    if (!this.editingProduct) {

      return;

    }


    const product =

      this.editingProduct;


    // -------------------------
    // PRODUCT ID
    // -------------------------

    const productId =

      product.id;


    if (!productId) {

      console.error(

        'Cannot update product without an ID.'

      );

      return;

    }


    // -------------------------
    // VALIDATION
    // -------------------------

    if (

      !product.name.trim()

    ) {

      alert(

        'Please enter a product name.'

      );

      return;

    }


    if (

      !product.category

    ) {

      alert(

        'Please select a category.'

      );

      return;

    }


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
    // SAVE
    // -------------------------

    this.isSavingProduct = true;


    try {

      await this.productService.updateProduct(

        productId,

        {

          ...product,

          name:
            product.name.trim(),

          quantity:
            undefined

        }

      );


      this.isSavingProduct = false;

      this.isEditModalOpen = false;

      this.editingProduct = null;


      alert(

        'Product updated successfully.'

      );


      // Reload products so that
      // availability is recalculated.

      this.loadProducts();

    }


    catch (error) {

      console.error(

        'Error updating product:',

        error

      );


      this.isSavingProduct = false;


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


    // Delete is allowed for:
    //
    // - Active products
    // - Inactive products
    // - Products with stock
    // - Products with zero stock
    // - Products whose category is active
    // - Products whose category is inactive

    this.productToDelete = product;

    this.isDeleteModalOpen = true;

  }


  // =========================
  // CLOSE DELETE MODAL
  // =========================

  closeDeleteModal() {

    if (this.isDeletingProduct) {

      return;

    }


    this.isDeleteModalOpen = false;

    this.productToDelete = null;

  }


  // =========================
  // CONFIRM DELETE PRODUCT
  // =========================

  async confirmDeleteProduct() {

    if (!this.productToDelete?.id) {

      return;

    }


    this.isDeletingProduct = true;


    try {

      await this.productService.deleteProduct(

        this.productToDelete.id

      );


      this.isDeletingProduct = false;

      this.isDeleteModalOpen = false;

      this.productToDelete = null;


      alert(

        'Product deleted successfully.'

      );


      // Reload products after deletion.

      this.loadProducts();

    }


    catch (error) {

      console.error(

        'Error deleting product:',

        error

      );


      this.isDeletingProduct = false;


      alert(

        'Failed to delete product. Please try again.'

      );

    }

  }

}