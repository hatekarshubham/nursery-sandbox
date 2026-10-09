import { CommonModule } from '@angular/common';
import { Component, OnInit, inject} from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { AppDialogService } from '../../../../services/app-dialog.service';
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

import { ProductColorFieldComponent } from '../product-color-field/product-color-field.component';

import {
  PRODUCT_COLORS,
  resolveProductColor
} from '../product-colors';

import {
  customColorName,
  moneyAmount,
  optionalText,
  percentAmount,
  requiredText,
  upperInput,
  wholeQuantity
} from '../../../../utils/form-validation';

@Component({
  selector: 'app-add-product',

  imports: [
    CommonModule,
    FormsModule,
    ProductColorFieldComponent
  ],

  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {

  private readonly dialog = inject(AppDialogService);

  private readonly auth = inject(Auth);


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

    color: '',

    colorName: '',

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

  upperName(value: string) {

    return upperInput(value);

  }


  private isPaletteColor(
    name: string
  ): boolean {

    return PRODUCT_COLORS.some(
      option => option.name === name
    );

  }


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

        error: async (error) => {

          console.error(
            'Error loading categories:',
            error
          );

          this.isLoadingCategories = false;

          if (!this.auth.currentUser) {
            return;
          }

          await this.dialog.alert(
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

        error: async (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );

          this.isLoadingSuppliers = false;

          if (!this.auth.currentUser) {
            return;
          }

          await this.dialog.alert(
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

  async onImageSelected(event: Event) {

    const input =
      event.target as HTMLInputElement;

    if (
      input.files &&
      input.files.length > 0
    ) {

      const file =
        input.files[0];

      if (!file.type.startsWith('image/')) {

        input.value = '';

        await this.dialog.alert(
          'Please choose an image file.'
        );

        return;

      }

      if (file.size > 2 * 1024 * 1024) {

        input.value = '';

        await this.dialog.alert(
          'Image must be 2 MB or smaller.'
        );

        return;

      }

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

    const name =
      this.product.name.trim().toUpperCase();

    const tone =
      resolveProductColor(
        this.product.color,
        this.product.colorName
      );

    const packageQuantity =
      this.product.standardPackage;

    const error =
      requiredText(name, 'product name') ||
      (
        !this.product.category ||
        !this.product.categoryId
          ? 'Please select a category.'
          : ''
      ) ||
      (
        !this.product.supplierId ||
        !this.product.supplier
          ? 'Please select a supplier.'
          : ''
      ) ||
      optionalText(
        this.product.description,
        'Description',
        500
      ) ||
      moneyAmount(
        this.product.unitPrice,
        'unit price'
      ) ||
      percentAmount(this.product.gst) ||
      (
        packageQuantity === null ||
        packageQuantity === undefined
          ? ''
          : wholeQuantity(
              packageQuantity,
              'Standard package'
            )
      ) ||
      customColorName(
        tone.colorName,
        !!tone.color &&
          tone.colorName !== '' &&
          !this.isPaletteColor(tone.colorName)
      );

    if (error) {

      await this.dialog.alert(error);

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

          name,

          gst:
            this.product.gst ?? 0,

          description:
            this.product.description.trim(),

          color:
            tone.color,

          colorName:
            tone.colorName,

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


      await this.dialog.alert(
        `Product added successfully!\nProduct ID: ${result.id}`
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding product:',
        error
      );


      await this.dialog.alert(
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

      color: '',

      colorName: '',

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