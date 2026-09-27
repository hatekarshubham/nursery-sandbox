import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ProductService } from '../../../../../services/product.service';

import {
  Category,
  CategoryService
} from '../../../../../services/category.service';

import {
  Supplier,
  SupplierService
} from '../../../../../services/supplier.service';

@Component({
  selector: 'app-add-product',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private router: Router
  ) {}


  // =========================
  // PRODUCT DETAILS
  // =========================

  product = {
    name: '',
    category: '',
    categoryId: '',

    supplier: '',
    supplierId: '',

    description: '',

    unitPrice: null as number | null,

    gst: 18,

    standardPackage: null as number | null,

    image: '',

    isActive: true
  };


  // =========================
  // PRODUCT ID
  // =========================

  productId: string | null = null;


  // =========================
  // CATEGORIES
  // =========================

  categories: Category[] = [];

  isLoadingCategories = true;


  // =========================
  // SUPPLIERS
  // =========================

  suppliers: Supplier[] = [];

  isLoadingSuppliers = true;


  // =========================
  // IMAGE
  // =========================

  selectedImage: string | null = null;


  // =========================
  // SAVING
  // =========================

  isSaving = false;


  // =========================
  // INIT
  // =========================

  ngOnInit() {

    this.loadCategories();

    this.loadSuppliers();

  }


  // =========================
  // LOAD ACTIVE CATEGORIES
  // =========================

  loadCategories() {

    this.categoryService
      .getActiveCategories()
      .subscribe({

        next: (categories) => {

          this.categories = categories;

          this.isLoadingCategories = false;

          console.log(
            'Active categories loaded:',
            categories
          );

        },

        error: (error) => {

          console.error(
            'Error loading categories:',
            error
          );

          this.isLoadingCategories = false;

          alert(
            'Failed to load product categories. Please try again.'
          );

        }

      });

  }


  // =========================
  // LOAD ACTIVE SUPPLIERS
  // =========================

  loadSuppliers() {

    this.supplierService
      .getSuppliers()
      .subscribe({

        next: (suppliers) => {

          this.suppliers =
            suppliers.filter(
              supplier =>
                supplier.isActive !== false
            );

          this.isLoadingSuppliers = false;

          console.log(
            'Active suppliers loaded:',
            this.suppliers
          );

        },

        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );

          this.isLoadingSuppliers = false;

          alert(
            'Failed to load suppliers. Please try again.'
          );

        }

      });

  }


  // =========================
  // CATEGORY SELECTED
  // =========================

  onCategoryChange() {

    const selectedCategory =
      this.categories.find(
        category =>
          category.name ===
          this.product.category
      );

    this.product.categoryId =
      selectedCategory?.id || '';

  }


  // =========================
  // SUPPLIER SELECTED
  // =========================

  onSupplierChange() {

    const selectedSupplier =
      this.suppliers.find(
        supplier =>
          supplier.id ===
          this.product.supplierId
      );

    if (selectedSupplier) {

      this.product.supplier =
        selectedSupplier.name;

    } else {

      this.product.supplier = '';

      this.product.supplierId = '';

    }

  }


  // =========================
  // IMAGE SELECTION
  // =========================

  onImageSelected(event: Event) {

    const input =
      event.target as HTMLInputElement;

    if (
      input.files &&
      input.files.length > 0
    ) {

      const file =
        input.files[0];

      const reader =
        new FileReader();

      reader.onload = () => {

        this.selectedImage =
          reader.result as string;

        this.product.image =
          this.selectedImage;

      };

      reader.readAsDataURL(file);

    }

  }


  // =========================
  // SAVE & VIEW ALL
  // =========================

  async saveAndViewAll() {

    const saved =
      await this.saveProduct();

    if (!saved) {
      return;
    }

    await this.router.navigate([
      '/products'
    ]);

  }


  // =========================
  // SAVE & ADD ANOTHER
  // =========================

  async saveAndAddAnother() {

    const saved =
      await this.saveProduct();

    if (!saved) {
      return;
    }

    this.resetForm();

  }


  // =========================
  // SAVE PRODUCT
  // =========================

  private async saveProduct(): Promise<boolean> {

    if (this.isSaving) {
      return false;
    }


    // -------------------------
    // VALIDATION
    // -------------------------

    if (
      !this.product.name.trim() ||
      !this.product.category ||
      !this.product.categoryId ||
      !this.product.supplierId ||
      !this.product.supplier ||
      this.product.unitPrice === null ||
      !Number.isFinite(
        this.product.unitPrice
      ) ||
      this.product.unitPrice <= 0
    ) {

      alert(
        'Please enter a valid product name, category, supplier, and unit price.'
      );

      return false;

    }


    this.isSaving = true;


    try {

      console.log(
        'Product before Firestore:',
        this.product
      );


      // -------------------------
      // SAVE PRODUCT
      // -------------------------

      const result =
        await this.productService.addProduct({

          ...this.product,

          name:
            this.product.name.trim(),

          description:
            this.product.description.trim(),

          createdAt:
            new Date(),

          updatedAt:
            new Date()

        });


      // -------------------------
      // STORE PRODUCT ID
      // -------------------------

      this.productId =
        result.id;


      console.log(
        'Product added to Firestore:',
        result.id
      );


      alert(
        `Product added successfully!\nProduct ID: ${result.id}`
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding product:',
        error
      );


      alert(
        'Failed to add product. Please try again.'
      );


      return false;

    }

    finally {

      this.isSaving = false;

    }

  }


  // =========================
  // RESET FORM
  // =========================

  resetForm() {

    if (this.isSaving) {
      return;
    }


    this.product = {

      name: '',

      category: '',

      categoryId: '',

      supplier: '',

      supplierId: '',

      description: '',

      unitPrice: null,

      gst: 18,

      standardPackage: null,

      image: '',

      isActive: true

    };


    this.selectedImage = null;

    this.productId = null;

  }

}