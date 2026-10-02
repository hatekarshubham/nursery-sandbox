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

import {
  Inventory,
  InventoryService
} from '../../../../services/inventory.service';

import {
  Warehouse,
  WarehouseService
} from '../../../../services/warehouse.service';


// =======================================================
// STOCK LEVEL
// =======================================================

type StockLevel =
  | 'outOfStock'
  | 'low'
  | 'medium'
  | 'healthy';


// =======================================================
// PRODUCT
// =======================================================

interface Product {

  id?: string;

  name: string;

  category: string;

  categoryId?: string;


  // =========================
  // SUPPLIER
  // =========================

  supplierId?: string;

  supplier?: string;


  // =========================
  // BARCODE
  // =========================

  barcode?: string;


  // =========================
  // PRODUCT STATUS
  // =========================

  categoryIsActive: boolean;

  isAvailable: boolean;


  // =========================
  // PRODUCT DETAILS
  // =========================

  description: string;

  unitPrice: number;

  gst: number;

  standardPackage: number | null;

  image: string;

  isActive: boolean;


  // =========================
  // CALCULATED INVENTORY
  // =========================
  //
  // Total quantity across ALL
  // warehouses.
  //
  // This is NOT stored inside
  // the product document.
  //
  // =========================

  quantity: number;


  // =========================
  // TIMESTAMPS
  // =========================

  createdAt?: any;

  updatedAt?: any;

}


// =======================================================
// COMPONENT
// =======================================================

@Component({
  selector: 'app-products',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './products.component.html',

  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService
  ) {}


  // =======================================================
  // PRODUCT TABLE
  // =======================================================

  tableData: Product[] = [];


  // =======================================================
  // CATEGORIES
  // =======================================================

  categories: Category[] = [];


  // =======================================================
  // SUPPLIERS
  // =======================================================

  suppliers: Supplier[] = [];

  isLoadingSuppliers = true;


  // =======================================================
  // INVENTORY
  // =======================================================

  inventory: Inventory[] = [];


  // =======================================================
  // WAREHOUSES
  // =======================================================

  warehouses: Warehouse[] = [];


  // =======================================================
  // LOADING
  // =======================================================

  isLoading = true;


  // =======================================================
  // PRODUCT FILTERS
  // =======================================================

  searchText = '';

  selectedCategory = '';

  selectedSupplier = '';

  selectedStatus = '';


  // =======================================================
  // FILTERED + SORTED PRODUCTS
  // =======================================================
  //
  // IMPORTANT:
  //
  // Filtering happens first.
  //
  // Then products are sorted using TOTAL quantity across
  // all warehouses.
  //
  // Lowest stock appears first.
  //
  // Example:
  //
  // 0
  // 0
  // 3
  // 8
  // 15
  // 40
  // 86
  // 95
  //
  // =======================================================

  get filteredProducts(): Product[] {

    const search =
      this.searchText
        .trim()
        .toLowerCase();


    const filtered =
      this.tableData.filter(
        (product) => {


          // =========================================
          // SEARCH
          // =========================================

          const matchesSearch =
            !search ||

            product.name
              ?.toLowerCase()
              .includes(search) ||

            product.category
              ?.toLowerCase()
              .includes(search) ||

            this.getSupplierName(product)
              .toLowerCase()
              .includes(search) ||

            product.barcode
              ?.toLowerCase()
              .includes(search);


          // =========================================
          // CATEGORY
          // =========================================

          const matchesCategory =
            !this.selectedCategory ||
            product.category ===
              this.selectedCategory;


          // =========================================
          // SUPPLIER
          // =========================================

          const matchesSupplier =
            !this.selectedSupplier ||
            product.supplierId ===
              this.selectedSupplier;


          // =========================================
          // STATUS
          // =========================================

          let matchesStatus = true;


          if (
            this.selectedStatus ===
            'active'
          ) {

            matchesStatus =
              product.isAvailable;

          }


          else if (
            this.selectedStatus ===
            'outOfStock'
          ) {

            matchesStatus =
              product.isActive &&
              product.categoryIsActive &&
              product.quantity <= 0;

          }


          else if (
            this.selectedStatus ===
            'inactive'
          ) {

            matchesStatus =
              !product.isActive ||
              !product.categoryIsActive;

          }


          // =========================================
          // RESULT
          // =========================================

          return (
            matchesSearch &&
            matchesCategory &&
            matchesSupplier &&
            matchesStatus
          );

        }
      );


    // =====================================================
    // SORT BY TOTAL QUANTITY
    // =====================================================
    //
    // IMPORTANT:
    //
    // quantity = stock across ALL warehouses.
    //
    // Lowest stock appears first.
    //
    // slice() creates a copy so we don't mutate tableData.
    //
    // =====================================================

    return filtered
      .slice()
      .sort(
        (a, b) => {

          const quantityA =
            Number(
              a.quantity ?? 0
            );


          const quantityB =
            Number(
              b.quantity ?? 0
            );


          // =========================================
          // PRIMARY SORT
          // TOTAL QUANTITY ASCENDING
          // =========================================

          if (
            quantityA !==
            quantityB
          ) {

            return (
              quantityA -
              quantityB
            );

          }


          // =========================================
          // SECONDARY SORT
          // PRODUCT NAME
          // =========================================
          //
          // If two products have the same quantity,
          // keep the table predictable by sorting
          // alphabetically.
          //
          // =========================================

          return (
            a.name ?? ''
          ).localeCompare(
            b.name ?? ''
          );

        }
      );

  }


  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  clearFilters() {

    this.searchText = '';

    this.selectedCategory = '';

    this.selectedSupplier = '';

    this.selectedStatus = '';

  }


  // =======================================================
  // CHECK ACTIVE FILTERS
  // =======================================================

  get hasActiveFilters(): boolean {

    return !!(
      this.searchText ||
      this.selectedCategory ||
      this.selectedSupplier ||
      this.selectedStatus
    );

  }


  // =======================================================
  // STOCK LEVEL
  // =======================================================
  //
  // IMPORTANT:
  //
  // This uses TOTAL quantity across ALL warehouses.
  //
  // 0      = Out of Stock
  // 1-10   = Low Stock
  // 11-50  = Medium Stock
  // 51+    = Healthy Stock
  //
  // =======================================================

  getStockLevel(
    product: Product
  ): StockLevel {

    const quantity =
      Number(
        product.quantity ?? 0
      );


    // =========================================
    // OUT OF STOCK
    // =========================================

    if (
      quantity <= 0
    ) {

      return 'outOfStock';

    }


    // =========================================
    // LOW STOCK
    // 1 - 10
    // =========================================

    if (
      quantity <= 10
    ) {

      return 'low';

    }


    // =========================================
    // MEDIUM STOCK
    // 11 - 50
    // =========================================

    if (
      quantity <= 50
    ) {

      return 'medium';

    }


    // =========================================
    // HEALTHY STOCK
    // 51+
    // =========================================

    return 'healthy';

  }


  // =======================================================
  // STOCK LABEL
  // =======================================================

  getStockLabel(
    product: Product
  ): string {

    const stockLevel =
      this.getStockLevel(
        product
      );


    switch (
      stockLevel
    ) {

      case 'outOfStock':

        return 'Out of Stock';


      case 'low':

        return 'Low Stock';


      case 'medium':

        return 'Medium Stock';


      case 'healthy':

        return 'Healthy Stock';


      default:

        return '';

    }

  }


  // =======================================================
  // DATA LOADING FLAGS
  // =======================================================

  private categoriesLoaded = false;

  private suppliersLoaded = false;

  private inventoryLoaded = false;

  private warehousesLoaded = false;

  private productsSubscriptionStarted = false;


  // =======================================================
  // PRODUCT DETAILS POPUP
  // =======================================================

  selectedProduct: Product | null = null;


  // =======================================================
  // EDIT PRODUCT
  // =======================================================

  isEditModalOpen = false;

  editingProduct: Product | null = null;

  isSavingProduct = false;


  // =======================================================
  // DELETE PRODUCT
  // =======================================================

  isDeleteModalOpen = false;

  productToDelete: Product | null = null;

  isDeletingProduct = false;


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadCategories();

    this.loadSuppliers();

    this.loadWarehouses();

    this.loadInventory();

  }


  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  private loadCategories() {

    this.categoryService
      .getCategories()
      .subscribe({

        next: (categories) => {

          this.categories =
            categories;


          this.categoriesLoaded =
            true;


          this.tryLoadProducts();

        },


        error: (error) => {

          console.error(
            'Error loading categories:',
            error
          );


          this.categories = [];


          this.categoriesLoaded =
            true;


          this.tryLoadProducts();

        }

      });

  }


  // =======================================================
  // LOAD SUPPLIERS
  // =======================================================

  private loadSuppliers() {

    this.supplierService
      .getSuppliers()
      .subscribe({

        next: (suppliers) => {

          this.suppliers =
            suppliers;


          this.isLoadingSuppliers =
            false;


          this.suppliersLoaded =
            true;


          console.log(
            'Suppliers loaded:',
            this.suppliers
          );


          this.tryLoadProducts();

        },


        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );


          this.suppliers = [];


          this.isLoadingSuppliers =
            false;


          this.suppliersLoaded =
            true;


          this.tryLoadProducts();

        }

      });

  }


  // =======================================================
  // LOAD WAREHOUSES
  // =======================================================

  private loadWarehouses() {

    this.warehouseService
      .getActiveWarehouses()
      .subscribe({

        next: (warehouses) => {

          this.warehouses =
            warehouses;


          this.warehousesLoaded =
            true;


          console.log(
            'Warehouses loaded:',
            this.warehouses
          );


          this.tryLoadProducts();

        },


        error: (error) => {

          console.error(
            'Error loading warehouses:',
            error
          );


          this.warehouses = [];


          this.warehousesLoaded =
            true;


          this.tryLoadProducts();

        }

      });

  }


  // =======================================================
  // LOAD INVENTORY
  // =======================================================

  private loadInventory() {

    this.inventoryService
      .getInventory()
      .subscribe({

        next: (inventory) => {

          this.inventory =
            inventory;


          this.inventoryLoaded =
            true;


          console.log(
            'Inventory loaded:',
            this.inventory
          );


          if (
            this.productsSubscriptionStarted
          ) {

            this.recalculateProductInventory();

          }


          this.tryLoadProducts();

        },


        error: (error) => {

          console.error(
            'Error loading inventory:',
            error
          );


          this.inventory = [];


          this.inventoryLoaded =
            true;


          if (
            this.productsSubscriptionStarted
          ) {

            this.recalculateProductInventory();

          }


          this.tryLoadProducts();

        }

      });

  }


  // =======================================================
  // LOAD PRODUCTS ONLY AFTER
  // SUPPORTING DATA IS READY
  // =======================================================

  private tryLoadProducts() {

    if (
      !this.categoriesLoaded ||
      !this.suppliersLoaded ||
      !this.inventoryLoaded ||
      !this.warehousesLoaded
    ) {

      return;

    }


    if (
      this.productsSubscriptionStarted
    ) {

      return;

    }


    this.productsSubscriptionStarted =
      true;


    this.loadProducts();

  }


  // =======================================================
  // LOAD PRODUCTS
  // =======================================================

  loadProducts() {

    this.productService
      .getProducts()
      .subscribe({

        next: (products: any[]) => {

          this.tableData =
            products.map(
              (product) => {


                // =========================================
                // CATEGORY
                // =========================================

                const matchingCategory =
                  this.categories.find(
                    (category) =>
                      category.id ===
                        product.categoryId ||
                      category.name ===
                        product.category
                  );


                const categoryIsActive =
                  matchingCategory
                    ? matchingCategory.isActive
                    : false;


                // =========================================
                // PRODUCT STATUS
                // =========================================

                const productIsActive =
                  product.isActive !== false;


                // =========================================
                // TOTAL INVENTORY
                // =========================================
                //
                // quantity = sum of inventory from
                // every warehouse.
                //
                // =========================================

                const totalQuantity =
                  this.getProductTotalQuantity(
                    product.id
                  );


                // =========================================
                // AVAILABILITY
                // =========================================

                const hasStock =
                  totalQuantity > 0;


                const isAvailable =
                  productIsActive &&
                  categoryIsActive &&
                  hasStock;


                // =========================================
                // SUPPLIER
                // =========================================

                let supplierId =
                  product.supplierId ?? '';


                let supplierName =
                  product.supplier ?? '';


                // =========================================
                // RESOLVE SUPPLIER NAME
                // =========================================

                if (
                  supplierId &&
                  !supplierName
                ) {

                  const matchingSupplier =
                    this.suppliers.find(
                      (supplier) =>
                        supplier.id ===
                        supplierId
                    );


                  supplierName =
                    matchingSupplier?.name ??
                    '';

                }


                // =========================================
                // RETURN PRODUCT
                // =========================================

                return {

                  ...product,

                  supplierId,

                  supplier:
                    supplierName,

                  quantity:
                    totalQuantity,

                  categoryIsActive,

                  isAvailable

                };

              }
            ) as Product[];


          this.isLoading =
            false;


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


          this.isLoading =
            false;

        }

      });

  }


  // =======================================================
  // RECALCULATE PRODUCT INVENTORY
  // =======================================================
  //
  // Inventory is an Observable.
  //
  // If a purchase or sale changes inventory,
  // the total quantity is recalculated automatically.
  //
  // Because filteredProducts sorts using quantity,
  // products automatically move to the correct position.
  //
  // Example:
  //
  // Product A = 60
  //
  // Sale reduces it to 8.
  //
  // It will automatically move into the low-stock
  // section near the top of the table.
  //
  // =======================================================

  private recalculateProductInventory() {

    this.tableData =
      this.tableData.map(
        product => {

          const totalQuantity =
            this.getProductTotalQuantity(
              product.id
            );


          const hasStock =
            totalQuantity > 0;


          return {

            ...product,

            quantity:
              totalQuantity,

            isAvailable:
              product.isActive !== false &&
              product.categoryIsActive &&
              hasStock

          };

        }
      );

  }


  // =======================================================
  // GET PRODUCT TOTAL QUANTITY
  // =======================================================
  //
  // IMPORTANT:
  //
  // This adds inventory from ALL warehouses.
  //
  // Example:
  //
  // WH1 = 6
  // WH2 = 7
  //
  // Total Qty = 13
  //
  // Stock level = Medium Stock
  //
  // =======================================================

  private getProductTotalQuantity(
    productId: string | undefined
  ): number {

    if (!productId) {

      return 0;

    }


    return this.inventory

      .filter(
        inventoryItem =>
          inventoryItem.productId ===
          productId
      )

      .reduce(
        (
          total,
          inventoryItem
        ) =>
          total +
          Number(
            inventoryItem.quantity ?? 0
          ),
        0
      );

  }


  // =======================================================
  // GET WAREHOUSE QUANTITY
  // =======================================================

  getWarehouseQuantity(
    productId: string | undefined,
    warehouseId: string | undefined
  ): number {

    if (
      !productId ||
      !warehouseId
    ) {

      return 0;

    }


    return this.inventory

      .filter(
        inventoryItem =>
          inventoryItem.productId ===
            productId &&
          inventoryItem.warehouseId ===
            warehouseId
      )

      .reduce(
        (
          total,
          inventoryItem
        ) =>
          total +
          Number(
            inventoryItem.quantity ?? 0
          ),
        0
      );

  }


  // =======================================================
  // GET WAREHOUSE DISPLAY CODE
  // =======================================================

  getWarehouseCode(
    warehouse: Warehouse
  ): string {

    const warehouseData =
      warehouse as any;


    return (
      warehouseData.code ??
      warehouseData.warehouseCode ??
      warehouseData.name ??
      'Warehouse'
    );

  }


  // =======================================================
  // GET SUPPLIER NAME
  // =======================================================

  getSupplierName(
    product: Product
  ): string {

    if (
      product.supplier &&
      product.supplier.trim()
    ) {

      return product.supplier;

    }


    if (product.supplierId) {

      const matchingSupplier =
        this.suppliers.find(
          (supplier) =>
            supplier.id ===
            product.supplierId
        );


      if (matchingSupplier) {

        return matchingSupplier.name;

      }

    }


    return 'No supplier';

  }


  // =======================================================
  // EDIT SUPPLIER CHANGE
  // =======================================================

  onEditSupplierChange(
    supplierId: string
  ) {

    if (!this.editingProduct) {

      return;

    }


    const selectedSupplier =
      this.suppliers.find(
        (supplier) =>
          supplier.id ===
          supplierId
      );


    this.editingProduct.supplierId =
      supplierId;


    this.editingProduct.supplier =
      selectedSupplier?.name ?? '';

  }


  // =======================================================
  // PRODUCT DETAILS
  // =======================================================

  openProductDetails(
    product: Product
  ) {

    this.selectedProduct =
      product;

  }


  // =======================================================
  // CLOSE PRODUCT DETAILS
  // =======================================================

  closeProductDetails() {

    this.selectedProduct =
      null;

  }


  // =======================================================
  // OPEN EDIT PRODUCT
  // =======================================================

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

      ...product,

      supplierId:
        product.supplierId ?? '',

      supplier:
        product.supplier ?? ''

    };


    this.isEditModalOpen =
      true;

  }


  // =======================================================
  // CLOSE EDIT MODAL
  // =======================================================

  closeEditModal() {

    if (this.isSavingProduct) {

      return;

    }


    this.isEditModalOpen =
      false;


    this.editingProduct =
      null;

  }


  // =======================================================
  // SAVE PRODUCT
  // =======================================================

  async saveProduct() {

    if (!this.editingProduct) {

      return;

    }


    const product =
      this.editingProduct;


    const productId =
      product.id;


    // =========================================
    // PRODUCT ID
    // =========================================

    if (!productId) {

      console.error(
        'Cannot update product without an ID.'
      );

      return;

    }


    // =========================================
    // PRODUCT NAME
    // =========================================

    if (!product.name.trim()) {

      alert(
        'Please enter a product name.'
      );

      return;

    }


    // =========================================
    // CATEGORY
    // =========================================

    if (!product.category) {

      alert(
        'Please select a category.'
      );

      return;

    }


    // =========================================
    // SUPPLIER
    // =========================================

    if (!product.supplierId) {

      alert(
        'Please select a supplier.'
      );

      return;

    }


    // =========================================
    // UNIT PRICE
    // =========================================

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


    // =========================================
    // FIND CATEGORY
    // =========================================

    const selectedCategory =
      this.categories.find(
        (category) =>
          category.name ===
          product.category
      );


    // =========================================
    // FIND SUPPLIER
    // =========================================

    const selectedSupplier =
      this.suppliers.find(
        (supplier) =>
          supplier.id ===
          product.supplierId
      );


    const supplierName =
      selectedSupplier?.name ??
      product.supplier ??
      '';


    // =========================================
    // SAVE
    // =========================================

    this.isSavingProduct =
      true;


    try {

      await this.productService
        .updateProduct(

          productId,

          {

            name:
              product.name.trim(),

            category:
              product.category,

            categoryId:
              selectedCategory?.id ?? '',

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
              product.standardPackage ??
              null,

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


  // =======================================================
  // OPEN DELETE MODAL
  // =======================================================

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


  // =======================================================
  // CLOSE DELETE MODAL
  // =======================================================

  closeDeleteModal() {

    if (this.isDeletingProduct) {

      return;

    }


    this.isDeleteModalOpen =
      false;


    this.productToDelete =
      null;

  }


  // =======================================================
  // CONFIRM DELETE
  // =======================================================

  async confirmDeleteProduct() {

    if (!this.productToDelete?.id) {

      return;

    }


    this.isDeletingProduct =
      true;


    try {

      await this.productService
        .deleteProduct(
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