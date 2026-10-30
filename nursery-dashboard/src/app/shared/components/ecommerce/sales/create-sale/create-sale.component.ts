import {

  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AppDialogService } from '../../../../services/app-dialog.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ProductService
} from '../../../../../services/product.service';

import {
  Inventory,
  InventoryService
} from '../../../../../services/inventory.service';

import {
  Warehouse,
  WarehouseService
} from '../../../../../services/warehouse.service';

import {
  SalesService,
  CreateSaleInput
} from '../../../../../services/sales.service';

import { AuthService } from '../../../../../services/auth';

import {
  indianMobile,
  moneyAmount,
  optionalText
} from '../../../../utils/form-validation';


// =======================================================
// SALE PRODUCT
// =======================================================

interface SaleProduct {

  id: string;
  name: string;
  category: string;
  categoryId: string;
  supplierId: string;
  supplierName: string;
  barcode: string;
  unitPrice: number;
  gst: number;
  image: string;
  isActive: boolean;
  availableQuantity: number;

}


// =======================================================
// CART ITEM
// =======================================================

interface CartItem {

  productId: string;
  productName: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  gst: number;
  availableQuantity: number;

}


// =======================================================
// INVOICE ITEM
// =======================================================

interface InvoiceItem {

  productId: string;
  productName: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  gst: number;
  gstAmount: number;
  subtotal: number;
  total: number;

}


// =======================================================
// COMPLETED INVOICE
// =======================================================
//
// Customer details exist ONLY in this temporary object.
//
// They are NOT sent to SalesService.
// They are NOT stored in Firestore.
//
// Once the invoice modal is closed, this object is removed.
//
// =======================================================

interface CompletedInvoice {

  invoiceNumber: string;
  saleId: string;
  createdAt: Date;

  customerName: string;
  customerMobile: string;

  warehouseName: string;

  createdByName: string;

  items: InvoiceItem[];

  subtotal: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;

  paymentMode: string;

}


// =======================================================
// COMPONENT
// =======================================================

@Component({
  selector: 'app-create-sale',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './create-sale.component.html',

  styleUrl: './create-sale.component.css'
})
export class CreateSaleComponent implements OnInit {

  private readonly dialog = inject(AppDialogService);


  // =====================================================
  // BARCODE
  // =====================================================

  @ViewChild('barcodeInput')
  barcodeInput?: ElementRef<HTMLInputElement>;

  barcodeText = '';


  // =====================================================
  // CUSTOMER
  // =====================================================

  customerName = '';

  customerMobile = '';


  // =====================================================
  // WAREHOUSE
  // =====================================================

  warehouses: Warehouse[] = [];

  selectedWarehouseId = '';


  // =====================================================
  // PRODUCTS
  // =====================================================

  products: SaleProduct[] = [];

  private rawProducts: any[] = [];

  searchText = '';

  hasMoreProducts = false;

  private saleCursor: any = null;

  private saleSerial = 0;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;


  // =====================================================
  // INVENTORY
  // =====================================================

  inventory: Inventory[] = [];


  // =====================================================
  // CART
  // =====================================================

  cartItems: CartItem[] = [];


  // =====================================================
  // PAYMENT
  // =====================================================

  paymentMode = 'Cash';

  discount = 0;

  creatorName = '';


  // =====================================================
  // LOADING
  // =====================================================

  isLoading = true;

  isProductsLoading = false;

  isCompletingSale = false;

  errorMessage = '';


  // =====================================================
  // INVOICE
  // =====================================================

  completedInvoice:
    CompletedInvoice | null = null;

  showInvoiceModal = false;


  // =====================================================
  // LOADING FLAGS
  // =====================================================

  private productsLoaded = false;

  // Stock is only loaded for the selected warehouse, so there is
  // nothing to wait for until a warehouse is chosen.
  private inventoryLoaded = true;

  // Warehouse whose stock is currently loaded (and live).
  private inventoryWarehouseId = '';

  private confirmedWarehouseId = '';

  private inventorySubscription?: Subscription;

  private warehousesLoaded = false;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private productService: ProductService,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private salesService: SalesService,
    private authService: AuthService,
    private destroyRef: DestroyRef
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.creatorName = this.authService.getCreator().name;

    this.authService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.creatorName = this.authService.getCreator().name;
      });

    this.destroyRef.onDestroy(() => {
      this.inventorySubscription?.unsubscribe();
    });

    this.loadProducts();

    this.loadWarehouses();

  }


  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  private loadProducts(): void {

    // Products are loaded a page at a time once a warehouse
    // is chosen (see reloadSaleProducts). Nothing is read here.

  }


  // =====================================================
  // LOAD INVENTORY
  // =====================================================

  //
  // Only the selected warehouse's stock is loaded (and kept
  // live), not every warehouse. Switching warehouse switches
  // the listener.
  //
  // =====================================================

  private loadInventoryForWarehouse(
    warehouseId: string
  ): void {

    if (
      warehouseId === this.inventoryWarehouseId
    ) {

      return;

    }

    this.inventorySubscription?.unsubscribe();

    this.inventoryWarehouseId = warehouseId;

    if (!warehouseId) {

      this.inventory = [];

      this.inventoryLoaded = true;

      this.refreshAvailableQuantities();

      return;

    }

    // Wait for the new warehouse's stock before showing quantities,
    // so the screen never shows the old warehouse's numbers.
    this.inventoryLoaded = false;

    this.inventorySubscription =
      this.inventoryService
        .getInventoryByWarehouse(warehouseId)
        .subscribe({

          next: (inventory) => {

            this.inventory =
              inventory ?? [];

            this.inventoryLoaded =
              true;

            if (
              this.productsLoaded
            ) {

              this.refreshAvailableQuantities();

            }

            this.buildProductList();

          },

          error: (error) => {

            console.error(
              'Error loading inventory:',
              error
            );

            this.inventory = [];

            this.inventoryLoaded = true;

            this.errorMessage =
              'Unable to load inventory.';

            this.buildProductList();

          }

        });

  }


  // =====================================================
  // LOAD WAREHOUSES
  // =====================================================

  private loadWarehouses(): void {

    this.warehouseService
      .getActiveWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (warehouses) => {

          this.warehouses =
            warehouses ?? [];

          this.warehousesLoaded =
            true;

          if (
            this.warehouses.length === 1 &&
            this.warehouses[0].id
          ) {

            this.selectedWarehouseId =
              this.warehouses[0].id;

          }

          if (this.selectedWarehouseId) {

            this.confirmedWarehouseId = this.selectedWarehouseId;
          
            void this.reloadSaleProducts();
          
          } else {
          
            this.isLoading = false;
          
          }

        },

        error: (error) => {

          console.error(
            'Error loading warehouses:',
            error
          );

          this.warehouses = [];

          this.warehousesLoaded = true;

          this.errorMessage =
            'Unable to load warehouses.';

          this.isLoading = false;

        }

      });

  }


  // =====================================================
  // BUILD PRODUCT LIST
  // =====================================================

  private buildProductList(): void {

    if (
      !this.productsLoaded ||
      !this.inventoryLoaded ||
      !this.warehousesLoaded
    ) {

      return;

    }

    this.products =
      this.rawProducts

        .filter(
          product =>
            product.id &&
            product.isActive !== false
        )

        .map(
          product => ({

            id:
              product.id,

            name:
              product.name ?? '',

            category:
              product.category ?? '',

            categoryId:
              product.categoryId ?? '',

            supplierId:
              product.supplierId ?? '',

            supplierName:
              product.supplier ?? '',

            barcode:
              product.barcode ?? '',

            unitPrice:
              Number(
                product.unitPrice ?? 0
              ),

            gst:
              Number(
                product.gst ?? 0
              ),

            image:
              product.thumbUrl ||
              product.imageUrl ||
              '',

            isActive:
              product.isActive !== false,

            availableQuantity:
              this.getAvailableQuantity(
                product.id
              )

          })
        );

    this.isLoading = false;

  }


  // =====================================================
  // FILTER PRODUCTS
  // =====================================================

  get filteredProducts(): SaleProduct[] {

    return this.products;

  }

  get visibleProducts(): SaleProduct[] {

    return this.products;

  }

  onSearchInput(value: string) {

    this.searchText = value;

    if (this.searchTimer) {

      clearTimeout(this.searchTimer);

    }

    this.searchTimer = setTimeout(
      () => void this.reloadSaleProducts(),
      300
    );

  }

  showMoreProducts(): void {

    void this.reloadSaleProducts(true);

  }


  private async reloadSaleProducts(
    more = false
  ) {

    const warehouseId = this.selectedWarehouseId;

    if (!warehouseId) {

      ++this.saleSerial;
      this.products = [];
      this.hasMoreProducts = false;
      this.isProductsLoading = false;
      this.isLoading = false;
      return;

    }

    const serial = ++this.saleSerial;

    if (!more) {

      this.saleCursor = null;
      this.isProductsLoading = true;
      this.errorMessage = '';

    }

    const search = this.searchText.trim();

    try {

      let rows: any[] = [];

      let moreAvailable = false;

      if (search) {

        rows = await this.productService.searchProducts(
          search,
          { maxResults: 50, fetchLimit: 80 }
        );

        const byBarcode =
          await this.productService.findProductByBarcode(search);

        if (byBarcode && !rows.some(row => row.id === byBarcode.id)) {

          rows = [byBarcode, ...rows];

        }

      } else {

        const page = await this.productService.pageProducts({
          order: 'name',
          pageSize: 50,
          direction: more && this.saleCursor ? 'next' : 'first',
          cursor: more ? this.saleCursor : null,
          knownCount: more ? 1 : null
        });

        if (serial !== this.saleSerial) {

          return;

        }

        rows = page.products;

        this.saleCursor = page.last;

        moreAvailable = rows.length === 50;

      }

      if (serial !== this.saleSerial) {

        return;

      }

      const stock =
        await this.inventoryService.getInventoryForProducts(
          rows.map(row => row.id)
        );

      if (serial !== this.saleSerial) {

        return;

      }

      this.inventory = more
        ? [...this.inventory, ...stock]
        : stock;

      const quantities = new Map<string, number>();

      for (const item of stock) {

        if (item.warehouseId !== warehouseId) {

          continue;

        }

        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) +
            Number(item.quantity ?? 0)
        );

      }

      const mapped = rows
        .filter(row => row.id && row.isActive !== false)
        .map(row => this.toSaleProduct(row, quantities));

      this.products = more ? [...this.products, ...mapped] : mapped;

      this.hasMoreProducts = !search && moreAvailable;

      this.productsLoaded = true;
      this.inventoryLoaded = true;
      this.isProductsLoading = false;
      this.isLoading = false;

    } catch (error) {

      if (serial !== this.saleSerial) {

        return;

      }

      console.error('Error loading products:', error);

      this.errorMessage = 'Unable to load products.';
      this.isProductsLoading = false;
      this.isLoading = false;

    }

  }


  private toSaleProduct(
    product: any,
    quantities: Map<string, number>
  ): SaleProduct {

    return {
      id: product.id,
      name: product.name ?? '',
      category: product.category ?? '',
      categoryId: product.categoryId ?? '',
      supplierId: product.supplierId ?? '',
      supplierName: product.supplier ?? '',
      barcode: product.barcode ?? '',
      unitPrice: Number(product.unitPrice ?? 0),
      gst: Number(product.gst ?? 0),
      image:
        product.thumbUrl ||
        product.imageUrl ||
        '',
      isActive: product.isActive !== false,
      availableQuantity: quantities.get(product.id) ?? 0
    };

  }


  // =====================================================
  // WAREHOUSE CHANGE
  // =====================================================

  
async onWarehouseChange(): Promise<void> {

  const newWarehouseId = this.selectedWarehouseId;
  const previousWarehouseId = this.confirmedWarehouseId;

  if (newWarehouseId === previousWarehouseId) {
    return;
  }

  if (this.cartItems.length > 0) {

    const confirmed = await this.dialog.confirm(
      'Changing the warehouse will clear the current cart. Continue?'
    );

    if (!confirmed) {
      this.selectedWarehouseId = previousWarehouseId;
      return;
    }

    this.cartItems = [];
  }

  this.confirmedWarehouseId = newWarehouseId;

  void this.reloadSaleProducts();

  this.focusBarcodeInput();
}



  // =====================================================
  // REFRESH AVAILABLE QUANTITIES
  // =====================================================

  private refreshAvailableQuantities(): void {

    this.products =
      this.products.map(
        product => ({

          ...product,

          availableQuantity:
            this.getAvailableQuantity(
              product.id
            )

        })
      );

  }


  // =====================================================
  // GET AVAILABLE QUANTITY
  // =====================================================

  getAvailableQuantity(
    productId: string
  ): number {

    if (
      !productId ||
      !this.selectedWarehouseId
    ) {

      return 0;

    }

    return this.stockIndex().get(productId) ?? 0;

  }


  // Stock per product for the selected warehouse, built once per
  // inventory update instead of scanning the list for every product.
  private stockIndexInventory: Inventory[] | null = null;

  private stockIndexWarehouseId = '';

  private stockIndexMap = new Map<string, number>();

  private stockIndex(): Map<string, number> {

    if (
      this.stockIndexInventory !== this.inventory ||
      this.stockIndexWarehouseId !== this.selectedWarehouseId
    ) {

      const map = new Map<string, number>();

      for (const item of this.inventory) {

        if (item.warehouseId !== this.selectedWarehouseId) {

          continue;

        }

        map.set(
          item.productId,
          (map.get(item.productId) ?? 0) +
            Number(item.quantity ?? 0)
        );

      }

      this.stockIndexMap = map;

      this.stockIndexInventory = this.inventory;

      this.stockIndexWarehouseId = this.selectedWarehouseId;

    }

    return this.stockIndexMap;

  }


  // =====================================================
  // REFRESH STOCK AFTER A SALE
  // =====================================================
  //
  // completeSale() does not know what anyone ELSE sold a
  // moment ago, so simply subtracting the sold quantity
  // from the number already on screen can land on the
  // wrong number if two people were selling the same
  // product at once.
  //
  // Re-reading just the products that were in THIS cart
  // (one small batched read, not the whole catalogue, not
  // a live listener) gives the real number instead of a
  // guess.
  // =====================================================

  private async refreshStockAfterSale(
    productIds: string[]
  ): Promise<void> {

    if (!productIds.length) {

      return;

    }

    const fresh =
      await this.inventoryService.getInventoryForProducts(
        productIds
      );

    const idSet = new Set(productIds);

    // Drop the old rows for these products (any warehouse)
    // before adding the fresh ones, so stock isn't double
    // counted.
    this.inventory = [
      ...this.inventory.filter(
        item => !idSet.has(item.productId)
      ),
      ...fresh
    ];

    this.products =
      this.products.map(
        product =>
          idSet.has(product.id)
            ? {
                ...product,
                availableQuantity:
                  this.getAvailableQuantity(product.id)
              }
            : product
      );

  }


  private async stockFor(
    productIds: string[]
  ): Promise<Map<string, number>> {

    const stock =
      await this.inventoryService.getInventoryForProducts(
        productIds
      );

    this.inventory = [...this.inventory, ...stock];

    const quantities = new Map<string, number>();

    for (const item of stock) {

      if (item.warehouseId !== this.selectedWarehouseId) {

        continue;

      }

      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) +
          Number(item.quantity ?? 0)
      );

    }

    return quantities;

  }


  // =====================================================
  // BARCODE SCAN
  // =====================================================

  async scanBarcode(): Promise<void> {

    const barcode =
      this.barcodeText.trim();

    if (!barcode) {

      return;

    }

    if (
      !this.selectedWarehouseId
    ) {

      await this.dialog.alert(
        'Please select a warehouse first.'
      );

      this.focusBarcodeInput();

      return;

    }

    const found =
      await this.productService.findProductByBarcode(barcode);

    const product =
      found
        ? this.toSaleProduct(
            found,
            await this.stockFor([found.id])
          )
        : this.products.find(item => item.barcode === barcode);

    if (!product) {

      await this.dialog.alert(
        `No product found for barcode: ${barcode}`
      );

      this.barcodeText = '';

      this.focusBarcodeInput();

      return;

    }

    this.addToCart(
      product
    );

    this.barcodeText = '';

    this.focusBarcodeInput();

  }


  // =====================================================
  // ADD TO CART
  // =====================================================

  async addToCart(
    product: SaleProduct
  ): Promise<void> {

    if (
      !this.selectedWarehouseId
    ) {

      await this.dialog.alert(
        'Please select a warehouse first.'
      );

      return;

    }

    const availableQuantity =
      this.getAvailableQuantity(
        product.id
      );

    if (
      availableQuantity <= 0
    ) {

      await this.dialog.alert(
        `${product.name} is out of stock in the selected warehouse.`
      );

      return;

    }

    const existingItem =
      this.cartItems.find(
        item =>
          item.productId ===
          product.id
      );

    if (existingItem) {

      if (
        existingItem.quantity >=
        availableQuantity
      ) {

        await this.dialog.alert(
          `Only ${availableQuantity} unit(s) of ${product.name} are available.`
        );

        return;

      }

      existingItem.quantity++;

      this.focusBarcodeInput();

      return;

    }

    this.cartItems.push({

      productId:
        product.id,

      productName:
        product.name,

      barcode:
        product.barcode,

      categoryId:
        product.categoryId,

      categoryName:
        product.category,

      supplierId:
        product.supplierId,

      supplierName:
        product.supplierName,

      quantity:
        1,

      unitPrice:
        product.unitPrice,

      gst:
        product.gst,

      availableQuantity

    });

    this.focusBarcodeInput();

  }


  // =====================================================
  // INCREASE QUANTITY
  // =====================================================

  async increaseQuantity(
    item: CartItem
  ): Promise<void> {

    const availableQuantity =
      this.getAvailableQuantity(
        item.productId
      );

    if (
      item.quantity >=
      availableQuantity
    ) {

      await this.dialog.alert(
        `Only ${availableQuantity} unit(s) of ${item.productName} are available.`
      );

      return;

    }

    item.quantity++;

  }


  // =====================================================
  // DECREASE QUANTITY
  // =====================================================

  decreaseQuantity(
    item: CartItem
  ): void {

    if (
      item.quantity <= 1
    ) {

      return;

    }

    item.quantity--;

  }


  // =====================================================
  // MANUAL QUANTITY CHANGE
  // =====================================================

  async onQuantityChange(
    item: CartItem
  ): Promise<void> {

    let quantity =
      Number(
        item.quantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity < 1
    ) {

      quantity = 1;

    }

    quantity =
      Math.floor(
        quantity
      );

    const availableQuantity =
      this.getAvailableQuantity(
        item.productId
      );

    if (
      quantity >
      availableQuantity
    ) {

      quantity =
        availableQuantity;

      await this.dialog.alert(
        `Only ${availableQuantity} unit(s) of ${item.productName} are available.`
      );

    }

    item.quantity =
      quantity;

  }


  // =====================================================
  // REMOVE FROM CART
  // =====================================================

  removeFromCart(
    item: CartItem
  ): void {

    this.cartItems =
      this.cartItems.filter(
        cartItem =>
          cartItem.productId !==
          item.productId
      );

  }


  // =====================================================
  // CLEAR CART
  // =====================================================

  async clearCart(): Promise<void> {

    if (
      this.cartItems.length === 0
    ) {

      return;

    }

    const confirmed =
      await this.dialog.confirm(
        'Clear all products from the cart?'
      );

    if (!confirmed) {

      return;

    }

    this.cartItems = [];

    this.focusBarcodeInput();

  }


  // =====================================================
  // ITEM SUBTOTAL
  // =====================================================

  getItemSubtotal(
    item: CartItem
  ): number {

    return (
      Number(
        item.unitPrice
      )
      *
      Number(
        item.quantity
      )
    );

  }


  // =====================================================
  // ITEM GST
  // =====================================================

  getItemGstAmount(
    item: CartItem
  ): number {

    const subtotal =
      this.getItemSubtotal(
        item
      );

    return (
      subtotal *
      Number(
        item.gst ?? 0
      )
    ) / 100;

  }


  // =====================================================
  // ITEM TOTAL
  // =====================================================

  getItemTotal(
    item: CartItem
  ): number {

    return (
      this.getItemSubtotal(
        item
      )
      +
      this.getItemGstAmount(
        item
      )
    );

  }


  // =====================================================
  // SUBTOTAL
  // =====================================================

  get subtotal(): number {

    return this.cartItems.reduce(
      (
        total,
        item
      ) =>

        total +
        this.getItemSubtotal(
          item
        ),

      0
    );

  }


  // =====================================================
  // GST TOTAL
  // =====================================================

  get gstAmount(): number {

    return this.cartItems.reduce(
      (
        total,
        item
      ) =>

        total +
        this.getItemGstAmount(
          item
        ),

      0
    );

  }


  // =====================================================
  // TOTAL BEFORE DISCOUNT
  // =====================================================

  get totalBeforeDiscount(): number {

    return (
      this.subtotal +
      this.gstAmount
    );

  }


  // =====================================================
  // GRAND TOTAL
  // =====================================================

  get grandTotal(): number {

    const discount =
      Number(
        this.discount ?? 0
      );

    return Math.max(
      0,
      this.totalBeforeDiscount -
      discount
    );

  }


  // =====================================================
  // TOTAL ITEMS
  // =====================================================

  get totalItems(): number {

    return this.cartItems.reduce(
      (
        total,
        item
      ) =>

        total +
        Number(
          item.quantity
        ),

      0
    );

  }


  // =====================================================
  // WAREHOUSE NAME
  // =====================================================

  getWarehouseName(): string {

    const warehouse =
      this.warehouses.find(
        item =>
          item.id ===
          this.selectedWarehouseId
      );

    const warehouseData =
      warehouse as any;

    return (
      warehouseData?.name ??
      warehouseData?.warehouseName ??
      ''
    );

  }


  // =====================================================
  // COMPLETE SALE
  // =====================================================

  async completeSale(): Promise<void> {

    if (
      this.isCompletingSale
    ) {

      return;

    }


    // -----------------------------------------------------
    // WAREHOUSE VALIDATION
    // -----------------------------------------------------

    if (
      !this.selectedWarehouseId
    ) {

      await this.dialog.alert(
        'Please select a warehouse.'
      );

      return;

    }


    const customerError =
      optionalText(
        this.customerName,
        'Customer name',
        80
      ) ||
      indianMobile(
        this.customerMobile,
        false
      );

    if (customerError) {

      await this.dialog.alert(customerError);

      return;

    }


    if (
      !['Cash', 'UPI', 'Card'].includes(
        this.paymentMode
      )
    ) {

      await this.dialog.alert(
        'Please select a payment mode.'
      );

      return;

    }


    // -----------------------------------------------------
    // CART VALIDATION
    // -----------------------------------------------------

    if (
      this.cartItems.length === 0
    ) {

      await this.dialog.alert(
        'Please add at least one product.'
      );

      return;

    }


    // -----------------------------------------------------
    // DISCOUNT VALIDATION
    // -----------------------------------------------------

    const discount =
      Number(
        this.discount ?? 0
      );

    const discountError =
      moneyAmount(
        discount,
        'Discount',
        { allowZero: true }
      );

    if (discountError) {

      await this.dialog.alert(discountError);

      return;

    }

    if (
      discount >
      this.totalBeforeDiscount
    ) {

      await this.dialog.alert(
        'Discount cannot be greater than the bill total.'
      );

      return;

    }


    // -----------------------------------------------------
    // FINAL LOCAL STOCK CHECK
    // -----------------------------------------------------

    for (
      const item of
      this.cartItems
    ) {

      const available =
        this.getAvailableQuantity(
          item.productId
        );

      if (
        item.quantity >
        available
      ) {

        await this.dialog.alert(
          `Insufficient stock for ${item.productName}. Available: ${available}.`
        );

        return;

      }

    }


    // ===================================================
    // SALE DATA
    // ===================================================
    //
    // IMPORTANT:
    //
    // CUSTOMER NAME AND MOBILE ARE NOT INCLUDED.
    //
    // Therefore they are NOT stored in Firestore.
    //
    // ===================================================

    const saleData:
      CreateSaleInput = {

        warehouseId:
          this.selectedWarehouseId,

        warehouseName:
          this.getWarehouseName(),

        items:
          this.cartItems.map(
            item => ({

              productId:
                item.productId,

              productName:
                item.productName,

              barcode:
                item.barcode,

              categoryId:
                item.categoryId,

              categoryName:
                item.categoryName,

              supplierId:
                item.supplierId,

              supplierName:
                item.supplierName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              gst:
                item.gst,

              gstAmount:
                this.getItemGstAmount(
                  item
                ),

              subtotal:
                this.getItemSubtotal(
                  item
                ),

              total:
                this.getItemTotal(
                  item
                )

            })
          ),

        subtotal:
          this.subtotal,

        gstAmount:
          this.gstAmount,

        discount,

        grandTotal:
          this.grandTotal,

        paymentMode:
          this.paymentMode,

        createdById:
          this.authService.getCreator().id,

        createdByName:
          this.authService.getCreator().name

      };


    // ===================================================
    // COMPLETE FIRESTORE TRANSACTION
    // ===================================================

    try {

      this.isCompletingSale =
        true;

      const result =
        await this.salesService
          .completeSale(
            saleData
          );


      // =================================================
      // TEMPORARY INVOICE
      // =================================================

      this.completedInvoice = {

        invoiceNumber:
          result.invoiceNumber,

        saleId:
          result.saleId,

        createdAt:
          new Date(),

        customerName:
          this.customerName.trim(),

        customerMobile:
          this.customerMobile.trim(),

        warehouseName:
          this.getWarehouseName(),

        createdByName:
          this.authService.getCreator().name,

        items:
          this.cartItems.map(
            item => ({

              productId:
                item.productId,

              productName:
                item.productName,

              barcode:
                item.barcode,

              categoryId:
                item.categoryId,

              categoryName:
                item.categoryName,

              supplierId:
                item.supplierId,

              supplierName:
                item.supplierName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              gst:
                item.gst,

              gstAmount:
                this.getItemGstAmount(
                  item
                ),

              subtotal:
                this.getItemSubtotal(
                  item
                ),

              total:
                this.getItemTotal(
                  item
                )

            })
          ),

        subtotal:
          this.subtotal,

        gstAmount:
          this.gstAmount,

        discount,

        grandTotal:
          this.grandTotal,

        paymentMode:
          this.paymentMode

      };


      // =================================================
      // SHOW PREVIEW
      // =================================================

      this.showInvoiceModal =
        true;


      // =================================================
      // REFRESH THE STOCK SHOWN ON THE CARDS
      // =================================================
      //
      // Re-read the real quantity for just the products
      // that were sold, instead of guessing by subtraction.
      // See refreshStockAfterSale() for why.
      // =================================================

      const soldProductIds =
        [...new Set(
          this.cartItems.map(item => item.productId)
        )];

      void this.refreshStockAfterSale(soldProductIds);


      // =================================================
      // RESET CREATE SALE FORM
      // =================================================

      this.cartItems = [];

      this.customerName = '';

      this.customerMobile = '';

      this.discount = 0;

      this.paymentMode = 'Cash';

      this.barcodeText = '';

      this.searchText = '';

    }

    catch (
      error: any
    ) {

      console.error(
        'Error completing sale:',
        error
      );

      await this.dialog.alert(
        error?.message ??
        'Unable to complete sale.'
      );

    }

    finally {

      this.isCompletingSale =
        false;

    }

  }


  // =====================================================
  // PRINT INVOICE
  // =====================================================
  //
  // IMPORTANT:
  //
  // We DO NOT call window.print() on the Angular page.
  //
  // Instead:
  //
  // 1. Create a clean browser window.
  // 2. Put ONLY the invoice inside it.
  // 3. Print that window.
  //
  // Therefore:
  //
  // - sidebar will not print
  // - dashboard header will not print
  // - barcode screen will not print
  // - product screen will not print
  // - emulator warning will not print
  //
  // =====================================================

  async printInvoice(): Promise<void> {

    if (
      !this.completedInvoice
    ) {

      return;

    }


    const invoice =
      this.completedInvoice;


    // ===================================================
    // CREATE PRODUCT ROWS
    // ===================================================

    const productRows =
      invoice.items
        .map(
          (
            item,
            index
          ) => {

            return `
              <tr>

                <td class="serial">
                  ${index + 1}
                </td>

                <td class="product">

                  <div class="product-name">
                    ${this.escapeHtml(
                      item.productName
                    )}
                  </div>

                  ${
                    item.barcode
                      ? `
                        <div class="barcode">
                          ${this.escapeHtml(
                            item.barcode
                          )}
                        </div>
                      `
                      : ''
                  }

                </td>

                <td class="center">
                  ${item.quantity}
                </td>

                <td class="right">
                  ₹${this.formatMoney(
                    item.unitPrice
                  )}
                </td>

                <td class="right">

                  ₹${this.formatMoney(
                    item.gstAmount
                  )}

                  <div class="gst-percent">
                    ${item.gst}%
                  </div>

                </td>

                <td class="right amount">
                  ₹${this.formatMoney(
                    item.total
                  )}
                </td>

              </tr>
            `;

          }
        )
        .join('');


    // ===================================================
    // CUSTOMER NAME
    // ===================================================

    const customerName =
      invoice.customerName
        ? this.escapeHtml(
            invoice.customerName
          )
        : 'Walk-in Customer';


    // ===================================================
    // CUSTOMER MOBILE
    // ===================================================

    const customerMobile =
      invoice.customerMobile
        ? this.escapeHtml(
            invoice.customerMobile
          )
        : '-';


    // ===================================================
    // OPEN CLEAN PRINT WINDOW
    // ===================================================

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=900,height=900'
      );


    if (!printWindow) {

      await this.dialog.alert(
        'Unable to open print window. Please allow pop-ups for this site.'
      );

      return;

    }


    // ===================================================
    // WRITE CLEAN INVOICE
    // ===================================================

    printWindow.document.open();


    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          ${this.escapeHtml(
            invoice.invoiceNumber
          )}
        </title>


        <style>

          /* ===============================================
             PAGE
             =============================================== */

          @page {

            size: A4 portrait;

            margin: 12mm;

          }


          * {

            box-sizing: border-box;

          }


          html,
          body {

            margin: 0;

            padding: 0;

            background: #ffffff;

            color: #1f2937;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

            -webkit-print-color-adjust: exact;

            print-color-adjust: exact;

          }


          body {

            padding: 0;

          }


          .invoice {

            width: 100%;

            max-width: 800px;

            margin: 0 auto;

          }


          /* ===============================================
             NURSERY HEADER
             =============================================== */

          .business-header {

            text-align: center;

            padding-bottom: 18px;

            border-bottom: 2px solid #111827;

          }


          .business-name {

            margin: 0;

            font-size: 28px;

            line-height: 1.2;

            font-weight: 700;

            letter-spacing: .2px;

            color: #111827;

          }


          .business-subtitle {

            margin-top: 6px;

            font-size: 11px;

            letter-spacing: 2.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          /* ===============================================
             SALES INVOICE
             =============================================== */

          .invoice-title {

            margin-top: 18px;

            text-align: center;

          }


          .invoice-title h2 {

            margin: 0;

            font-size: 16px;

            letter-spacing: 2px;

            color: #111827;

          }


          /* ===============================================
             INVOICE META
             =============================================== */

          .meta {

            display: grid;

            grid-template-columns:
              1fr
              1fr;

            gap: 30px;

            margin-top: 20px;

            padding: 14px 0;

            border-top: 1px solid #d1d5db;

            border-bottom: 1px solid #d1d5db;

          }


          .meta-right {

            text-align: right;

          }


          .meta-row {

            margin-bottom: 6px;

            font-size: 12px;

            line-height: 1.5;

          }


          .meta-row:last-child {

            margin-bottom: 0;

          }


          .meta-label {

            color: #6b7280;

          }


          .meta-value {

            margin-left: 6px;

            font-weight: 600;

            color: #111827;

          }


          /* ===============================================
             CUSTOMER
             =============================================== */

          .customer {

            margin-top: 18px;

            padding: 14px;

            border: 1px solid #e5e7eb;

            border-radius: 6px;

          }


          .section-label {

            margin-bottom: 10px;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: 1.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          .customer-grid {

            display: grid;

            grid-template-columns:
              1fr
              1fr;

            gap: 30px;

          }


          .customer-label {

            margin-bottom: 4px;

            font-size: 10px;

            color: #9ca3af;

          }


          .customer-value {

            font-size: 12px;

            font-weight: 600;

            color: #111827;

          }


          /* ===============================================
             PRODUCTS TABLE
             =============================================== */

          .products {

            margin-top: 22px;

          }


          table {

            width: 100%;

            border-collapse: collapse;

          }


          thead {

            display: table-header-group;

          }


          th {

            padding:
              9px
              7px;

            border-top: 1.5px solid #374151;

            border-bottom: 1.5px solid #374151;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: .5px;

            text-transform: uppercase;

            color: #4b5563;

          }


          td {

            padding:
              11px
              7px;

            border-bottom: 1px solid #e5e7eb;

            font-size: 11px;

            vertical-align: top;

          }


          tr {

            page-break-inside: avoid;

          }


          .serial {

            width: 35px;

            color: #6b7280;

          }


          .product {

            width: 36%;

          }


          .product-name {

            font-weight: 600;

            color: #111827;

          }


          .barcode {

            margin-top: 4px;

            font-size: 8px;

            font-family: monospace;

            color: #9ca3af;

          }


          .center {

            text-align: center;

          }


          .right {

            text-align: right;

            white-space: nowrap;

          }


          .amount {

            font-weight: 600;

            color: #111827;

          }


          .gst-percent {

            margin-top: 3px;

            font-size: 8px;

            color: #9ca3af;

          }


          /* ===============================================
             SUMMARY
             =============================================== */

          .summary {

            display: grid;

            grid-template-columns:
              1fr
              300px;

            gap: 50px;

            margin-top: 24px;

            page-break-inside: avoid;

          }


          .payment-title {

            margin-bottom: 6px;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: 1.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          .payment-value {

            font-size: 12px;

            font-weight: 600;

            color: #111827;

          }


          .total-row {

            display: flex;

            justify-content: space-between;

            gap: 20px;

            margin-bottom: 9px;

            font-size: 11px;

          }


          .total-label {

            color: #6b7280;

          }


          .total-value {

            font-weight: 600;

            color: #111827;

          }


          .grand-total {

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            gap: 20px;

            margin-top: 12px;

            padding-top: 12px;

            border-top: 2px solid #111827;

          }


          .grand-total-label {

            font-size: 13px;

            font-weight: 700;

            color: #111827;

          }


          .grand-total-value {

            font-size: 20px;

            font-weight: 700;

            color: #111827;

          }


          /* ===============================================
             FOOTER
             =============================================== */

          .footer {

            margin-top: 45px;

            padding-top: 16px;

            border-top: 1px solid #e5e7eb;

            text-align: center;

            page-break-inside: avoid;

          }


          .thank-you {

            font-size: 12px;

            font-weight: 600;

            color: #374151;

          }


          .footer-invoice {

            margin-top: 5px;

            font-size: 9px;

            color: #9ca3af;

          }


          /* ===============================================
             PRINT
             =============================================== */

          @media print {

            html,
            body {

              width: 100%;

              margin: 0;

              padding: 0;

            }


            .invoice {

              max-width: none;

            }

          }

        </style>

      </head>


      <body>


        <div class="invoice">


          <!-- =============================================
               BUSINESS
               ============================================= -->

          <div class="business-header">

            <h1 class="business-name">
              Gayatri Nursery
            </h1>

          </div>


          <!-- =============================================
               TITLE
               ============================================= -->

          <div class="invoice-title">

            <h2>
              SALES INVOICE
            </h2>

          </div>


          <!-- =============================================
               META
               ============================================= -->

          <div class="meta">


            <div>

              <div class="meta-row">

                <span class="meta-label">
                  Invoice:
                </span>

                <span class="meta-value">
                  ${this.escapeHtml(
                    invoice.invoiceNumber
                  )}
                </span>

              </div>


              <div class="meta-row">

                <span class="meta-label">
                  Date:
                </span>

                <span class="meta-value">
                  ${this.escapeHtml(
                    this.formatInvoiceDate(
                      invoice.createdAt
                    )
                  )}
                </span>

              </div>

            </div>


            <div class="meta-right">

              <div class="meta-row">

                <span class="meta-label">
                  Warehouse:
                </span>

                <span class="meta-value">
                  ${
                    this.escapeHtml(
                      invoice.warehouseName
                    ) || '-'
                  }
                </span>

              </div>

            </div>


          </div>


          <!-- =============================================
               CUSTOMER
               ============================================= -->

          <div class="customer">

            <div class="section-label">
              Customer
            </div>


            <div class="customer-grid">


              <div>

                <div class="customer-label">
                  Name
                </div>

                <div class="customer-value">
                  ${customerName}
                </div>

              </div>


              <div>

                <div class="customer-label">
                  Mobile
                </div>

                <div class="customer-value">
                  ${customerMobile}
                </div>

              </div>


            </div>

          </div>


          <!-- =============================================
               PRODUCTS
               ============================================= -->

          <div class="products">

            <table>

              <thead>

                <tr>

                  <th style="text-align:left;">
                    #
                  </th>

                  <th style="text-align:left;">
                    Product
                  </th>

                  <th style="text-align:center;">
                    Qty
                  </th>

                  <th style="text-align:right;">
                    Rate
                  </th>

                  <th style="text-align:right;">
                    GST
                  </th>

                  <th style="text-align:right;">
                    Amount
                  </th>

                </tr>

              </thead>


              <tbody>

                ${productRows}

              </tbody>

            </table>

          </div>


          <!-- =============================================
               SUMMARY
               ============================================= -->

          <div class="summary">


            <div>

              <div class="payment-title">
                Payment
              </div>

              <div class="payment-value">
                ${this.escapeHtml(
                  invoice.paymentMode
                )}
              </div>

            </div>


            <div>


              <div class="total-row">

                <span class="total-label">
                  Subtotal
                </span>

                <span class="total-value">
                  ₹${this.formatMoney(
                    invoice.subtotal
                  )}
                </span>

              </div>


              <div class="total-row">

                <span class="total-label">
                  GST
                </span>

                <span class="total-value">
                  ₹${this.formatMoney(
                    invoice.gstAmount
                  )}
                </span>

              </div>


              <div class="total-row">

                <span class="total-label">
                  Discount
                </span>

                <span class="total-value">
                  - ₹${this.formatMoney(
                    invoice.discount
                  )}
                </span>

              </div>


              <div class="grand-total">

                <span class="grand-total-label">
                  Grand Total
                </span>

                <span class="grand-total-value">
                  ₹${this.formatMoney(
                    invoice.grandTotal
                  )}
                </span>

              </div>


            </div>


          </div>


          <!-- =============================================
               FOOTER
               ============================================= -->

          <div class="footer">

            <div class="thank-you">
              Thank you for your purchase!
            </div>

            <div class="footer-invoice">
              ${this.escapeHtml(
                invoice.invoiceNumber
              )}
            </div>

          </div>


        </div>


        <script>

          window.onload = function () {

            var closed = false;

            function finish() {

              if (closed) {

                return;

              }

              closed = true;

              window.close();

            }

            window.addEventListener(
              'afterprint',
              finish
            );

            window.focus();

            window.print();

            setTimeout(
              function () {

                window.addEventListener(
                  'focus',
                  finish
                );

                if (document.hasFocus()) {

                  finish();

                }

              },
              400
            );

          };

        </script>


      </body>

      </html>
    `);


    printWindow.document.close();

    this.closeInvoice();

  }


  // =====================================================
  // FORMAT MONEY
  // =====================================================

  private formatMoney(
    value: number
  ): string {

    return Number(
      value ?? 0
    ).toLocaleString(
      'en-IN',
      {

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2

      }
    );

  }


  // =====================================================
  // ESCAPE HTML
  // =====================================================
  //
  // Customer/product names are inserted into the
  // temporary HTML document.
  //
  // Escape them before insertion.
  //
  // =====================================================

  private escapeHtml(
    value: string
  ): string {

    return String(
      value ?? ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  }


  // =====================================================
  // CLOSE INVOICE
  // =====================================================

  closeInvoice(): void {

    this.showInvoiceModal =
      false;

    this.completedInvoice =
      null;

    this.focusBarcodeInput();

  }


  // =====================================================
  // FORMAT INVOICE DATE
  // =====================================================

  formatInvoiceDate(
    date: Date
  ): string {

    return date.toLocaleString(
      'en-IN',
      {

        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit'

      }
    );

  }


  // =====================================================
  // FOCUS BARCODE INPUT
  // =====================================================

  private focusBarcodeInput(): void {

    setTimeout(
      () => {

        this.barcodeInput
          ?.nativeElement
          .focus();

      },
      0
    );

  }

}