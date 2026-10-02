import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Supplier,
  SupplierService
} from '../../../../../services/supplier.service';

import {
  Warehouse,
  WarehouseService
} from '../../../../../services/warehouse.service';

import {
  ProductService
} from '../../../../../services/product.service';

import {
  PurchaseService
} from '../../../../../services/purchase.service';


// =========================================================
// PURCHASE PRODUCT
// =========================================================

interface PurchaseProduct {

  productId: string;

  productName: string;

  quantity: number | null;

  unitPrice: number | null;

  gst: number;

  subTotal: number;

  gstAmount: number;

  total: number;

}


// =========================================================
// PRODUCT OPTION
// =========================================================

interface ProductOption {

  id: string;

  name: string;

  supplierId?: string;

  unitPrice: number;

  gst: number;

  isActive: boolean;

}


// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-add-purchase',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './add-purchase.component.html',

  styleUrl: './add-purchase.component.css'
})
export class AddPurchaseComponent implements OnInit {


  constructor(
    private supplierService: SupplierService,
    private warehouseService: WarehouseService,
    private productService: ProductService,
    private purchaseService: PurchaseService,
    private router: Router
  ) {}


  // =======================================================
  // MASTER DATA
  // =======================================================

  suppliers: Supplier[] = [];

  warehouses: Warehouse[] = [];

  products: ProductOption[] = [];


  // =======================================================
  // LOADING
  // =======================================================

  isLoadingSuppliers = true;

  isLoadingWarehouses = true;

  isLoadingProducts = true;

  isSaving = false;


  // =======================================================
  // DATE
  // =======================================================
  //
  // Purchase date can be today or a previous date.
  // Future dates are not allowed.
  //
  // Local date is used instead of toISOString()
  // to avoid UTC timezone differences.
  //
  // =======================================================

  today =
    this.getLocalDateString();


  // =======================================================
  // PURCHASE HEADER
  // =======================================================

  purchase = {

    supplierId: '',

    supplierName: '',

    warehouseId: '',

    warehouseName: '',

    invoiceNumber: '',

    purchaseDate:
      this.getLocalDateString(),

    notes: ''

  };


  // =======================================================
  // PURCHASE ITEMS
  // =======================================================

  items: PurchaseProduct[] = [];


  // =======================================================
  // TOTALS
  // =======================================================

  subtotal = 0;

  totalGst = 0;

  grandTotal = 0;


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadSuppliers();

    this.loadWarehouses();

    this.loadProducts();

    this.addItem();

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
            suppliers.filter(
              supplier =>
                supplier.isActive !== false
            );


          this.isLoadingSuppliers =
            false;

        },


        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );


          this.suppliers = [];


          this.isLoadingSuppliers =
            false;

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


          this.isLoadingWarehouses =
            false;

        },


        error: (error) => {

          console.error(
            'Error loading warehouses:',
            error
          );


          this.warehouses = [];


          this.isLoadingWarehouses =
            false;

        }

      });

  }


  // =======================================================
  // LOAD PRODUCTS
  // =======================================================

  private loadProducts() {

    this.productService
      .getProducts()
      .subscribe({

        next: (products: any[]) => {

          this.products =
            products

              .filter(
                product =>
                  product.isActive !== false &&
                  !!product.id
              )

              .map(
                product => ({

                  id:
                    product.id,

                  name:
                    product.name,

                  supplierId:
                    product.supplierId ?? '',

                  unitPrice:
                    Number(
                      product.unitPrice ?? 0
                    ),

                  gst:
                    Number(
                      product.gst ?? 0
                    ),

                  isActive:
                    product.isActive !== false

                })
              );


          this.isLoadingProducts =
            false;

        },


        error: (error) => {

          console.error(
            'Error loading products:',
            error
          );


          this.products = [];


          this.isLoadingProducts =
            false;

        }

      });

  }


  // =======================================================
  // SUPPLIER CHANGE
  // =======================================================

  onSupplierChange() {

    const supplier =
      this.suppliers.find(
        supplier =>
          supplier.id ===
          this.purchase.supplierId
      );


    this.purchase.supplierName =
      supplier?.name ?? '';


    // =====================================================
    // CLEAR PRODUCT ROWS
    // =====================================================
    //
    // Products are currently associated with one supplier.
    //
    // Changing supplier therefore clears previously
    // selected products.
    //
    // =====================================================

    this.items = [];


    this.addItem();


    this.calculateTotals();

  }


  // =======================================================
  // WAREHOUSE CHANGE
  // =======================================================

  onWarehouseChange() {

    const warehouse =
      this.warehouses.find(
        warehouse =>
          warehouse.id ===
          this.purchase.warehouseId
      );


    this.purchase.warehouseName =
      warehouse?.name ?? '';

  }


  // =======================================================
  // PRODUCTS FOR SELECTED SUPPLIER
  // =======================================================

  getAvailableProducts():
    ProductOption[] {

    if (
      !this.purchase.supplierId
    ) {

      return [];

    }


    return this.products.filter(
      product =>
        product.supplierId ===
        this.purchase.supplierId
    );

  }


  // =======================================================
  // ADD ITEM
  // =======================================================

  addItem() {

    this.items.push({

      productId: '',

      productName: '',

      quantity: null,

      unitPrice: null,

      gst: 0,

      subTotal: 0,

      gstAmount: 0,

      total: 0

    });

  }


  // =======================================================
  // REMOVE ITEM
  // =======================================================

  removeItem(
    index: number
  ) {

    if (
      index < 0 ||
      index >= this.items.length
    ) {

      return;

    }


    this.items.splice(
      index,
      1
    );


    // Always keep at least one row.

    if (
      this.items.length === 0
    ) {

      this.addItem();

    }


    this.calculateTotals();

  }


  // =======================================================
  // PRODUCT CHANGE
  // =======================================================

  onProductChange(
    item: PurchaseProduct
  ) {

    const product =
      this.products.find(
        product =>
          product.id ===
          item.productId
      );


    if (!product) {

      item.productName = '';

      item.unitPrice = null;

      item.gst = 0;


      this.calculateItem(
        item
      );


      return;

    }


    item.productName =
      product.name;


    // =====================================================
    // DEFAULT PURCHASE PRICE
    // =====================================================
    //
    // Product unitPrice is only used as the DEFAULT value.
    //
    // If the user changes the price here:
    //
    // Purchase item price changes.
    //
    // Product master document DOES NOT change.
    //
    // Example:
    //
    // Product master = ₹100
    //
    // Purchase price = ₹85
    //
    // Purchase document stores ₹85.
    // Product document remains ₹100.
    //
    // =====================================================

    item.unitPrice =
      product.unitPrice;


    item.gst =
      product.gst;


    this.calculateItem(
      item
    );

  }


  // =======================================================
  // ITEM VALUE CHANGED
  // =======================================================

  onItemValueChange(
    item: PurchaseProduct
  ) {

    this.calculateItem(
      item
    );

  }


  // =======================================================
  // CALCULATE ITEM
  // =======================================================

  private calculateItem(
    item: PurchaseProduct
  ) {

    const quantity =
      Number(
        item.quantity ?? 0
      );


    const unitPrice =
      Number(
        item.unitPrice ?? 0
      );


    const gst =
      Number(
        item.gst ?? 0
      );


    // =====================================================
    // TAXABLE AMOUNT
    // =====================================================

    item.subTotal =
      this.roundMoney(
        quantity *
        unitPrice
      );


    // =====================================================
    // GST AMOUNT
    // =====================================================

    item.gstAmount =
      this.roundMoney(
        item.subTotal *
        gst /
        100
      );


    // =====================================================
    // ITEM TOTAL
    // =====================================================

    item.total =
      this.roundMoney(
        item.subTotal +
        item.gstAmount
      );


    this.calculateTotals();

  }


  // =======================================================
  // CALCULATE PURCHASE TOTALS
  // =======================================================

  private calculateTotals() {

    this.subtotal =
      this.roundMoney(
        this.items.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.subTotal ?? 0
            ),
          0
        )
      );


    this.totalGst =
      this.roundMoney(
        this.items.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.gstAmount ?? 0
            ),
          0
        )
      );


    this.grandTotal =
      this.roundMoney(
        this.subtotal +
        this.totalGst
      );

  }


  // =======================================================
  // VALIDATE PURCHASE
  // =======================================================

  private validatePurchase():
    boolean {

    // =====================================================
    // SUPPLIER
    // =====================================================

    if (
      !this.purchase.supplierId
    ) {

      alert(
        'Please select a supplier.'
      );


      return false;

    }


    if (
      !this.purchase.supplierName
    ) {

      alert(
        'Selected supplier is invalid.'
      );


      return false;

    }


    // =====================================================
    // WAREHOUSE
    // =====================================================

    if (
      !this.purchase.warehouseId
    ) {

      alert(
        'Please select a warehouse.'
      );


      return false;

    }


    if (
      !this.purchase.warehouseName
    ) {

      alert(
        'Selected warehouse is invalid.'
      );


      return false;

    }


    // =====================================================
    // PURCHASE DATE
    // =====================================================

    if (
      !this.purchase.purchaseDate
    ) {

      alert(
        'Please select a purchase date.'
      );


      return false;

    }


    // =====================================================
    // PREVENT FUTURE PURCHASE DATE
    // =====================================================

    if (
      this.purchase.purchaseDate >
      this.today
    ) {

      alert(
        'Purchase date cannot be in the future.'
      );


      return false;

    }


    // =====================================================
    // ITEMS
    // =====================================================

    if (
      this.items.length === 0
    ) {

      alert(
        'Please add at least one product.'
      );


      return false;

    }


    for (
      let index = 0;
      index < this.items.length;
      index++
    ) {

      const item =
        this.items[index];


      // ===================================================
      // PRODUCT
      // ===================================================

      if (
        !item.productId
      ) {

        alert(
          `Please select a product in row ${index + 1}.`
        );


        return false;

      }


      if (
        !item.productName
      ) {

        alert(
          `Invalid product in row ${index + 1}.`
        );


        return false;

      }


      // ===================================================
      // QUANTITY
      // ===================================================

      const quantity =
        Number(
          item.quantity
        );


      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {

        alert(
          `Please enter a valid quantity in row ${index + 1}.`
        );


        return false;

      }


      // ===================================================
      // UNIT PRICE
      // ===================================================

      const unitPrice =
        Number(
          item.unitPrice
        );


      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice < 0
      ) {

        alert(
          `Please enter a valid unit price in row ${index + 1}.`
        );


        return false;

      }


      // ===================================================
      // GST
      // ===================================================

      const gst =
        Number(
          item.gst
        );


      if (
        !Number.isFinite(
          gst
        ) ||
        gst < 0 ||
        gst > 100
      ) {

        alert(
          `Please enter a valid GST percentage in row ${index + 1}.`
        );


        return false;

      }

    }


    // =====================================================
    // PREVENT DUPLICATE PRODUCTS
    // =====================================================

    const productIds =
      this.items.map(
        item =>
          item.productId
      );


    const uniqueProductIds =
      new Set(
        productIds
      );


    if (
      uniqueProductIds.size !==
      productIds.length
    ) {

      alert(
        'The same product cannot be added more than once in a purchase.'
      );


      return false;

    }


    return true;

  }


  // =======================================================
  // BUILD PURCHASE DATA
  // =======================================================
  //
  // PurchaseService recalculates monetary values again.
  //
  // This means values coming from the UI are not blindly
  // trusted before being written to Firestore.
  //
  // =======================================================

  private buildPurchaseData() {

    const purchaseItems =
      this.items.map(
        item => ({

          productId:
            item.productId,

          productName:
            item.productName,

          quantity:
            Number(
              item.quantity
            ),

          unitPrice:
            Number(
              item.unitPrice
            ),

          gst:
            Number(
              item.gst
            ),

          taxableAmount:
            this.roundMoney(
              item.subTotal
            ),

          gstAmount:
            this.roundMoney(
              item.gstAmount
            ),

          totalAmount:
            this.roundMoney(
              item.total
            )

        })
      );


    return {

      supplierId:
        this.purchase.supplierId,

      supplierName:
        this.purchase.supplierName,

      warehouseId:
        this.purchase.warehouseId,

      warehouseName:
        this.purchase.warehouseName,

      invoiceNumber:
        this.purchase.invoiceNumber
          .trim(),

      purchaseDate:
        this.purchase.purchaseDate,

      notes:
        this.purchase.notes
          .trim(),

      items:
        purchaseItems,

      subtotal:
        this.roundMoney(
          this.subtotal
        ),

      gstAmount:
        this.roundMoney(
          this.totalGst
        ),

      grandTotal:
        this.roundMoney(
          this.grandTotal
        )

    };

  }


  // =======================================================
  // SAVE PURCHASE
  // =======================================================
  //
  // IMPORTANT:
  //
  // Purchase is saved as PENDING.
  //
  // Inventory is NOT updated here.
  //
  // Inventory will only be updated when the purchase
  // is completed from the All Purchases page.
  //
  // =======================================================

  async savePurchase() {

    if (
      this.isSaving
    ) {

      return;

    }


    if (
      !this.validatePurchase()
    ) {

      return;

    }


    this.isSaving =
      true;


    try {

      const purchaseData =
        this.buildPurchaseData();


      const purchaseId =
        await this.purchaseService
          .createPurchase(
            purchaseData
          );


      console.log(
        'Pending purchase created:',
        purchaseId
      );


      alert(
        'Purchase saved successfully as pending.'
      );


      this.resetForm();

    }


    catch (error: any) {

      console.error(
        'Error saving purchase:',
        error
      );


      alert(
        error?.message ??
        'Failed to save purchase. Please try again.'
      );

    }


    finally {

      this.isSaving =
        false;

    }

  }


  // =======================================================
  // SAVE & VIEW PURCHASES
  // =======================================================
  //
  // Same as Save Purchase, except after creating the
  // PENDING purchase we navigate to All Purchases.
  //
  // =======================================================

  async saveAndViewPurchases() {

    if (
      this.isSaving
    ) {

      return;

    }


    if (
      !this.validatePurchase()
    ) {

      return;

    }


    this.isSaving =
      true;


    try {

      const purchaseData =
        this.buildPurchaseData();


      const purchaseId =
        await this.purchaseService
          .createPurchase(
            purchaseData
          );


      console.log(
        'Pending purchase created:',
        purchaseId
      );


      alert(
        'Purchase saved successfully as pending.'
      );


      await this.router.navigate([
        '/purchases'
      ]);

    }


    catch (error: any) {

      console.error(
        'Error saving purchase:',
        error
      );


      alert(
        error?.message ??
        'Failed to save purchase. Please try again.'
      );

    }


    finally {

      this.isSaving =
        false;

    }

  }


  // =======================================================
  // RESET FORM
  // =======================================================

  resetForm() {

    if (
      this.isSaving
    ) {

      return;

    }


    this.purchase = {

      supplierId: '',

      supplierName: '',

      warehouseId: '',

      warehouseName: '',

      invoiceNumber: '',

      purchaseDate:
        this.getLocalDateString(),

      notes: ''

    };


    this.items = [];


    this.addItem();


    this.subtotal = 0;

    this.totalGst = 0;

    this.grandTotal = 0;

  }


  // =======================================================
  // LOCAL DATE STRING
  // =======================================================

  private getLocalDateString():
    string {

    const date =
      new Date();


    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${year}-${month}-${day}`;

  }


  // =======================================================
  // MONEY ROUNDING
  // =======================================================

  private roundMoney(
    value: number
  ): number {

    return Math.round(
      (
        Number(value) +
        Number.EPSILON
      ) *
      100
    ) / 100;

  }

}