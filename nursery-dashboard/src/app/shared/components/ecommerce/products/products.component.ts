import { CommonModule } from '@angular/common';
import { RoleService } from '../../../../services/role.service';
import { DuplicateError } from '../../../../services/unique-key';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialogService } from '../../../services/app-dialog.service';
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

import { ProductColorFieldComponent } from './product-color-field/product-color-field.component';

import {
  PRODUCT_COLORS,
  ResolvedProductColor,
  resolveProductColor
} from './product-colors';

import {
  customColorName,
  moneyAmount,
  optionalText,
  percentAmount,
  requiredText,
  upperInput,
  wholeQuantity
} from '../../../utils/form-validation';


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

  color?: string;

  colorName?: string;

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
    FormsModule,
    ProductColorFieldComponent
  ],

  templateUrl: './products.component.html',

  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {

  private destroyRef = inject(DestroyRef);


  readonly roles = inject(RoleService);

  private readonly dialog = inject(AppDialogService);



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

  // The rows on screen are one server page (lowest stock first).
  // Filters and search ask Firestore, so this list is not the
  // whole catalogue.
  matchCount = 0;

  readonly pageSize = 50;

  currentPage = 1;

  private pageFirst: any = null;

  private pageLast: any = null;

  private knownCount: number | null = null;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  private loadSerial = 0;

  get filteredProducts(): Product[] {

    return this.tableData;

  }

  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(this.matchCount / this.pageSize)
    );

  }

  get pagedProducts(): Product[] {

    return this.tableData;

  }

  get firstRowNumber(): number {

    return this.tableData.length === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;

  }

  get lastRowNumber(): number {

    return this.tableData.length === 0
      ? 0
      : this.firstRowNumber + this.tableData.length - 1;

  }

  onSearchInput(value: string) {

    this.searchText = value;

    if (this.searchTimer) {

      clearTimeout(this.searchTimer);

    }

    this.searchTimer = setTimeout(
      () => void this.reloadFirstPage(),
      300
    );

  }

  onFilterChange() {

    void this.reloadFirstPage();

  }

  goToPage(page: number) {

    const target = Math.min(
      Math.max(1, page),
      this.totalPages
    );

    if (target === this.currentPage || this.searchText.trim()) {

      return;

    }

    const direction =
      target === 1
        ? 'first'
        : target === this.totalPages
          ? 'last'
          : target === this.currentPage + 1
            ? 'next'
            : target === this.currentPage - 1
              ? 'previous'
              : 'first';

    void this.fetchPage(direction, target);

  }


  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  clearFilters() {

    this.searchText = '';

    this.selectedCategory = '';

    this.selectedSupplier = '';

    this.selectedStatus = '';

    void this.reloadFirstPage();

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

  }


  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  private loadCategories() {

    this.categoryService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (suppliers) => {

          this.suppliers =
            suppliers;


          this.isLoadingSuppliers =
            false;


          this.suppliersLoaded =
            true;



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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (warehouses) => {

          this.warehouses =
            warehouses;


          this.warehousesLoaded =
            true;



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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (inventory) => {

          this.inventory =
            inventory;


          this.inventoryLoaded =
            true;



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

    void this.reloadFirstPage();

  }


  private async reloadFirstPage() {

    this.currentPage = 1;

    this.knownCount = null;

    await this.fetchPage('first', 1);

  }


  private async fetchPage(
    direction: 'first' | 'next' | 'previous' | 'last',
    page: number
  ) {

    const serial = ++this.loadSerial;

    this.isLoading = true;

    const search = this.searchText.trim();

    try {

      let products: any[] = [];

      if (search) {

        const byName =
          await this.productService.searchProducts(
            search,
            { maxResults: 50, fetchLimit: 80 }
          );

        const byBarcode =
          await this.productService.findProductByBarcode(search);

        const seen = new Set(byName.map(product => product.id));

        products = byBarcode && !seen.has(byBarcode.id)
          ? [byBarcode, ...byName]
          : byName;

        if (this.selectedCategory) {

          products = products.filter(
            product => product.category === this.selectedCategory
          );

        }

        if (this.selectedSupplier) {

          products = products.filter(
            product => product.supplierId === this.selectedSupplier
          );

        }

        if (this.selectedStatus) {

          const state =
            this.selectedStatus === 'outOfStock'
              ? 'out'
              : this.selectedStatus === 'inactive'
                ? 'inactive'
                : 'active';

          products = products.filter(
            product =>
              (product.stockState ?? 'active') === state
          );

        }

        products.sort(
          (a, b) =>
            Number(a.totalQuantity ?? 0) -
              Number(b.totalQuantity ?? 0) ||
            String(a.name ?? '').localeCompare(String(b.name ?? ''))
        );

        this.matchCount = products.length;

        this.pageFirst = null;

        this.pageLast = null;

      } else {

        const stockState =
          this.selectedStatus === 'outOfStock'
            ? 'out'
            : this.selectedStatus === 'inactive'
              ? 'inactive'
              : this.selectedStatus === 'active'
                ? 'active'
                : '';

        const pageResult =
          await this.productService.pageProducts({
            order: 'stock',
            category: this.selectedCategory,
            supplierId: this.selectedSupplier,
            stockState,
            pageSize: this.pageSize,
            direction,
            cursor:
              direction === 'next'
                ? this.pageLast
                : direction === 'previous'
                  ? this.pageFirst
                  : null,
            knownCount:
              direction === 'first' ? null : this.knownCount
          });

        if (serial !== this.loadSerial) {

          return;

        }

        products = pageResult.products;

        this.matchCount = pageResult.count;

        this.knownCount = pageResult.count;

        this.pageFirst = pageResult.first;

        this.pageLast = pageResult.last;

      }

      if (serial !== this.loadSerial) {

        return;

      }

      const inventory =
        await this.inventoryService.getInventoryForProducts(
          products.map(product => product.id)
        );

      if (serial !== this.loadSerial) {

        return;

      }

      this.inventory = inventory;

      this.inventoryLoaded = true;

      this.tableData = products.map(
        product => this.toTableProduct(product)
      );

      this.currentPage = page;

      this.isLoading = false;

    } catch (error) {

      if (serial !== this.loadSerial) {

        return;

      }

      console.error('Error loading products:', error);

      this.tableData = [];

      this.matchCount = 0;

      this.isLoading = false;

    }

  }


  private toTableProduct(product: any): Product {

    const matchingCategory =
      this.categories.find(
        category =>
          category.id === product.categoryId ||
          category.name === product.category
      );

    const categoryIsActive =
      product.categoryIsActive !== undefined
        ? product.categoryIsActive !== false
        : matchingCategory
          ? matchingCategory.isActive !== false
          : true;

    const productIsActive = product.isActive !== false;

    const totalQuantity = Number(product.totalQuantity ?? 0);

    let supplierId = product.supplierId ?? '';

    let supplierName = product.supplier ?? '';

    if (supplierId && !supplierName) {

      supplierName =
        this.suppliers.find(
          supplier => supplier.id === supplierId
        )?.name ?? '';

    }

    return {
      ...product,
      supplierId,
      supplier: supplierName,
      categoryIsActive,
      quantity: totalQuantity,
      isAvailable:
        productIsActive &&
        categoryIsActive &&
        totalQuantity > 0
    };

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


    return this.stockIndex().totals.get(productId) ?? 0;

  }


  // Stock totals are looked up from a map built once per inventory
  // update. Scanning the whole inventory list for every product (and
  // for every cell of every row) is far too slow with thousands of
  // records.
  private stockIndexSource: Inventory[] | null = null;

  private stockIndexCache = {
    totals: new Map<string, number>(),
    byWarehouse: new Map<string, number>()
  };

  private stockIndex() {

    if (this.stockIndexSource !== this.inventory) {

      const totals = new Map<string, number>();

      const byWarehouse = new Map<string, number>();

      for (const item of this.inventory) {

        const quantity = Number(item.quantity ?? 0);

        totals.set(
          item.productId,
          (totals.get(item.productId) ?? 0) + quantity
        );

        const key = `${item.productId}|${item.warehouseId}`;

        byWarehouse.set(
          key,
          (byWarehouse.get(key) ?? 0) + quantity
        );

      }

      this.stockIndexCache = { totals, byWarehouse };

      this.stockIndexSource = this.inventory;

    }

    return this.stockIndexCache;

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


    return (
      this.stockIndex().byWarehouse.get(
        `${productId}|${warehouseId}`
      ) ?? 0
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

  onEditName(value: string) {

    if (!this.editingProduct) {

      return;

    }

    this.editingProduct.name =
      upperInput(value);

  }


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

      name:
        upperInput(product.name),

      supplierId:
        product.supplierId ?? '',

      supplier:
        product.supplier ?? '',

      color:
        product.color ?? '',

      colorName:
        product.colorName ?? ''

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

    const nameError =
      requiredText(product.name, 'product name') ||
      optionalText(
        product.description ?? '',
        'Description',
        500
      ) ||
      moneyAmount(product.unitPrice, 'unit price') ||
      percentAmount(product.gst) ||
      (
        product.standardPackage === null ||
        product.standardPackage === undefined
          ? ''
          : wholeQuantity(
              product.standardPackage,
              'Standard package'
            )
      );

    if (nameError) {

      await this.dialog.alert(nameError);

      return;

    }


    const tone =
      resolveProductColor(
        product.color,
        product.colorName
      );

    const colorError =
      customColorName(
        tone.colorName,
        !!tone.color &&
          !PRODUCT_COLORS.some(
            option => option.name === tone.colorName
          )
      );

    if (colorError) {

      await this.dialog.alert(colorError);

      return;

    }


    const image =
      (product.image ?? '').trim();

    if (
      image &&
      !/^https?:\/\//i.test(image) &&
      !image.startsWith('data:image/')
    ) {

      await this.dialog.alert(
        'Image must be a web address or an uploaded image.'
      );

      return;

    }


    // =========================================
    // CATEGORY
    // =========================================

    if (!product.category) {

      await this.dialog.alert(
        'Please select a category.'
      );

      return;

    }


    // =========================================
    // SUPPLIER
    // =========================================

    if (!product.supplierId) {

      await this.dialog.alert(
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

      await this.dialog.alert(
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
              product.name.trim().toUpperCase(),

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

            color:
              tone.color,

            colorName:
              tone.colorName,

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


      await this.dialog.alert(
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


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to update product. Please try again.')
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
  // COLOR
  // =======================================================

  colorTone(
    product: {
      color?: string;
      colorName?: string;
    }
  ): ResolvedProductColor {

    return resolveProductColor(
      product.color,
      product.colorName
    );

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


      await this.dialog.alert(
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


      await this.dialog.alert(
        'Failed to delete product. Please try again.'
      );

    }

  }

}