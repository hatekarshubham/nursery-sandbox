import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit,
  inject} from '@angular/core';
import { AppDialogService } from '../../../../services/app-dialog.service';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { ProductPickerComponent } from '../../product-picker/product-picker.component';

import { Subscription } from 'rxjs';

import {
  ProductService
} from '../../../../../services/product.service';

import {
  Warehouse,
  WarehouseService
} from '../../../../../services/warehouse.service';

import {
  Inventory,
  InventoryService
} from '../../../../../services/inventory.service';

import {
  StockAdjustmentService,
  StockAdjustmentType
} from '../../../../../services/stock-adjustment.service';


// =========================================================
// PRODUCT OPTION
// =========================================================

interface ProductOption {

  id: string;

  name: string;

  isActive: boolean;

}


// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-add-stock-adjustment',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ProductPickerComponent
  ],

  templateUrl:
    './add-stock-adjustment.component.html',

  styleUrl:
    './add-stock-adjustment.component.css'
})
export class AddStockAdjustmentComponent
  implements OnInit, OnDestroy {

  private readonly dialog = inject(AppDialogService);


  // =======================================================
  // MASTER DATA
  // =======================================================

  warehouses: Warehouse[] = [];

  products: ProductOption[] = [];

  inventory: Inventory[] = [];


  // =======================================================
  // STATE
  // =======================================================

  isLoading = true;

  isSaving = false;

  errorMessage = '';


  // =======================================================
  // CURRENT STOCK
  // =======================================================

  currentQuantity = 0;

  inventoryExists = false;


  // =======================================================
  // DATE
  // =======================================================

  today =
    this.getLocalDateString();


  // =======================================================
  // REASONS
  // =======================================================

  increaseReasons: string[] = [

    'Physical Stock Higher',

    'Previous Entry Correction',

    'Returned Stock',

    'Found Stock',

    'Opening Stock Correction',

    'Other'

  ];


  decreaseReasons: string[] = [

    'Damaged Stock',

    'Dead Plants',

    'Missing Stock',

    'Physical Stock Lower',

    'Previous Entry Correction',

    'Expired / Unusable Stock',

    'Other'

  ];


  // =======================================================
  // FORM
  // =======================================================

  adjustment = {

    warehouseId: '',

    productId: '',

    adjustmentType:
      '' as StockAdjustmentType | '',

    quantity:
      null as number | null,

    reason: '',

    adjustmentDate:
      this.getLocalDateString(),

    notes: ''

  };


  // =======================================================
  // SUBSCRIPTIONS
  // =======================================================

  private subscription =
    new Subscription();


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(

    private productService:
      ProductService,

    private warehouseService:
      WarehouseService,

    private inventoryService:
      InventoryService,

    private stockAdjustmentService:
      StockAdjustmentService,

    private router:
      Router

  ) {}


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadData();

  }


  // =======================================================
  // LOAD DATA
  // =======================================================

  private loadData() {

    this.isLoading = true;

    this.errorMessage = '';


    const dataSubscription =
      this.warehouseService
        .getActiveWarehouses()
        .subscribe({

          next: (warehouses) => {

            this.warehouses =
              warehouses;

            this.isLoading =
              false;

          },


          error: (error) => {

            console.error(
              'Error loading warehouses:',
              error
            );


            this.errorMessage =
              'Failed to load warehouses.';


            this.isLoading =
              false;

          }

        });


    this.subscription.add(
      dataSubscription
    );

  }


  // =======================================================
  // WAREHOUSE CHANGE
  // =======================================================

  onWarehouseChange() {

    this.adjustment.productId = '';

    this.adjustment.quantity = null;

    this.adjustment.reason = '';

    this.adjustment.adjustmentType = '';

    this.currentQuantity = 0;

    this.inventoryExists = false;

    this.inventory = [];

  }


  // =======================================================
  // PRODUCT PICKED (from the product picker)
  // =======================================================
  //
  // The picker searches Firestore, so the whole product list is
  // never loaded. Stock for the chosen product in the selected
  // warehouse is read with one small query.
  //
  // =======================================================

  async onProductPicked(
    product: any | null
  ) {

    this.adjustment.quantity = null;

    this.adjustment.reason = '';

    this.adjustment.adjustmentType = '';

    if (!product) {

      this.adjustment.productId = '';

      this.inventory = [];

      this.updateCurrentQuantity();

      return;

    }

    if (!this.products.some(entry => entry.id === product.id)) {

      this.products.push({

        id: product.id,

        name: product.name ?? '',

        isActive: product.isActive !== false

      });

    }

    this.adjustment.productId = product.id;

    this.currentQuantity = 0;

    this.inventoryExists = false;

    await this.refreshStock();

  }


  // Reads the chosen product's stock in the selected warehouse.
  private async refreshStock() {

    const productId = this.adjustment.productId;

    const warehouseId = this.adjustment.warehouseId;

    if (!productId || !warehouseId) {

      this.inventory = [];

      this.updateCurrentQuantity();

      return;

    }

    try {

      const record =
        await this.inventoryService
          .getInventoryByProductAndWarehouse(
            productId,
            warehouseId
          );

      // Ignore the answer if the user already chose something else.
      if (
        productId !== this.adjustment.productId ||
        warehouseId !== this.adjustment.warehouseId
      ) {

        return;

      }

      this.inventory = record ? [record] : [];

      this.updateCurrentQuantity();

    } catch (error) {

      console.error('Error reading stock:', error);

      this.inventory = [];

      this.updateCurrentQuantity();

    }

  }


  // =======================================================
  // PRODUCT CHANGE
  // =======================================================

  onProductChange() {

    this.adjustment.quantity = null;

    this.adjustment.reason = '';

    this.adjustment.adjustmentType = '';

    this.updateCurrentQuantity();

  }


  // =======================================================
  // ADJUSTMENT TYPE CHANGE
  // =======================================================

  onAdjustmentTypeChange() {

    this.adjustment.quantity = null;

    this.adjustment.reason = '';

  }


  // =======================================================
  // CURRENT INVENTORY
  // =======================================================

  private updateCurrentQuantity() {

    if (
      !this.adjustment.warehouseId ||
      !this.adjustment.productId
    ) {

      this.currentQuantity = 0;

      this.inventoryExists = false;

      return;

    }


    const inventoryRecord =
      this.inventory.find(
        item =>
          item.productId ===
            this.adjustment.productId &&
          item.warehouseId ===
            this.adjustment.warehouseId
      );


    this.inventoryExists =
      !!inventoryRecord;


    this.currentQuantity =
      Number(
        inventoryRecord?.quantity ?? 0
      );

  }


  // =======================================================
  // GET REASONS
  // =======================================================

  getReasons(): string[] {

    if (
      this.adjustment.adjustmentType ===
      'INCREASE'
    ) {

      return this.increaseReasons;

    }


    if (
      this.adjustment.adjustmentType ===
      'DECREASE'
    ) {

      return this.decreaseReasons;

    }


    return [];

  }


  // =======================================================
  // SELECTED PRODUCT
  // =======================================================

  getSelectedProduct():
    ProductOption | undefined {

    return this.products.find(
      product =>
        product.id ===
        this.adjustment.productId
    );

  }


  // =======================================================
  // SELECTED WAREHOUSE
  // =======================================================

  getSelectedWarehouse():
    Warehouse | undefined {

    return this.warehouses.find(
      warehouse =>
        warehouse.id ===
        this.adjustment.warehouseId
    );

  }


  // =======================================================
  // CALCULATED QUANTITY
  // =======================================================

  getCalculatedQuantity():
    number {

    const quantity =
      Number(
        this.adjustment.quantity ?? 0
      );


    if (
      this.adjustment.adjustmentType ===
      'INCREASE'
    ) {

      return (
        this.currentQuantity +
        quantity
      );

    }


    if (
      this.adjustment.adjustmentType ===
      'DECREASE'
    ) {

      return (
        this.currentQuantity -
        quantity
      );

    }


    return this.currentQuantity;

  }


  // =======================================================
  // VALIDATE
  // =======================================================

  private async validateAdjustment():
    Promise<boolean> {

    // =====================================================
    // WAREHOUSE
    // =====================================================

    if (
      !this.adjustment.warehouseId
    ) {

      await this.dialog.alert(
        'Please select a warehouse.'
      );

      return false;

    }


    const warehouse =
      this.getSelectedWarehouse();


    if (!warehouse) {

      await this.dialog.alert(
        'Selected warehouse is invalid.'
      );

      return false;

    }


    // =====================================================
    // PRODUCT
    // =====================================================

    if (
      !this.adjustment.productId
    ) {

      await this.dialog.alert(
        'Please select a product.'
      );

      return false;

    }


    const product =
      this.getSelectedProduct();


    if (!product) {

      await this.dialog.alert(
        'Selected product is invalid.'
      );

      return false;

    }


    // =====================================================
    // TYPE
    // =====================================================

    if (
      this.adjustment.adjustmentType !==
        'INCREASE' &&
      this.adjustment.adjustmentType !==
        'DECREASE'
    ) {

      await this.dialog.alert(
        'Please select an adjustment type.'
      );

      return false;

    }


    // =====================================================
    // QUANTITY
    // =====================================================

    const quantity =
      Number(
        this.adjustment.quantity
      );


    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {

      await this.dialog.alert(
        'Please enter a valid adjustment quantity.'
      );

      return false;

    }


    // =====================================================
    // DECREASE VALIDATION
    // =====================================================
    //
    // Read the latest stock again right before saving.

    await this.refreshStock();


    if (
      this.adjustment.adjustmentType ===
      'DECREASE'
    ) {

      if (
        !this.inventoryExists
      ) {

        await this.dialog.alert(
          'No inventory exists for this product in the selected warehouse.'
        );

        return false;

      }


      if (
        quantity >
        this.currentQuantity
      ) {

        await this.dialog.alert(
          `Only ${this.currentQuantity} units are currently available.`
        );

        return false;

      }

    }


    // =====================================================
    // REASON
    // =====================================================

    if (
      !this.adjustment.reason
    ) {

      await this.dialog.alert(
        'Please select an adjustment reason.'
      );

      return false;

    }


    // =====================================================
    // DATE
    // =====================================================

    if (
      !this.adjustment.adjustmentDate
    ) {

      await this.dialog.alert(
        'Please select an adjustment date.'
      );

      return false;

    }


    // =====================================================
    // FUTURE DATE
    // =====================================================

    if (
      this.adjustment.adjustmentDate >
      this.today
    ) {

      await this.dialog.alert(
        'Adjustment date cannot be in the future.'
      );

      return false;

    }


    if (
      (this.adjustment.notes ?? '').trim().length > 500
    ) {

      await this.dialog.alert(
        'Notes must be 500 characters or fewer.'
      );

      return false;

    }


    return true;

  }


  // =======================================================
  // ADJUST STOCK
  // =======================================================

  async adjustStock(
    viewAdjustments: boolean
  ) {

    if (
      this.isSaving
    ) {

      return;

    }


    if (
      !await this.validateAdjustment()
    ) {

      return;

    }


    const product =
      this.getSelectedProduct();


    const warehouse =
      this.getSelectedWarehouse();


    if (
      !product ||
      !warehouse
    ) {

      await this.dialog.alert(
        'Unable to resolve adjustment information.'
      );

      return;

    }


    const quantity =
      Number(
        this.adjustment.quantity
      );


    const quantityAfter =
      this.getCalculatedQuantity();


    const actionText =
      this.adjustment.adjustmentType ===
        'INCREASE'
        ? 'increase'
        : 'decrease';


    const confirmed =
      await this.dialog.confirm(

        `Confirm stock adjustment?\n\n` +

        `Product: ${product.name}\n` +

        `Warehouse: ${warehouse.code} - ${warehouse.name}\n` +

        `Action: ${actionText}\n` +

        `Quantity: ${quantity}\n` +

        `Current Stock: ${this.currentQuantity}\n` +

        `Stock After Adjustment: ${quantityAfter}\n` +

        `Reason: ${this.adjustment.reason}`

      );


    if (!confirmed) {

      return;

    }


    this.isSaving =
      true;


    try {

      const adjustmentId =
        await this.stockAdjustmentService
          .createStockAdjustment({

            productId:
              product.id,

            productName:
              product.name,

            warehouseId:
              warehouse.id!,

            warehouseName:
              warehouse.name,

            warehouseCode:
              warehouse.code,

            adjustmentType:
              this.adjustment
                .adjustmentType as
                StockAdjustmentType,

            quantity,

            reason:
              this.adjustment.reason,

            adjustmentDate:
              this.adjustment
                .adjustmentDate,

            notes:
              this.adjustment
                .notes
                .trim()

          });


      await this.dialog.alert(
        'Stock adjusted successfully.'
      );


      // ===================================================
      // ADJUST & VIEW ADJUSTMENTS
      // ===================================================

      if (
        viewAdjustments
      ) {

        await this.router.navigate([
          '/stock-adjustments'
        ]);

        return;

      }


      // ===================================================
      // ADJUST STOCK ONLY
      // STAY ON PAGE AND RESET FORM
      // ===================================================

      this.clearForm();

    }


    catch (error: any) {

      console.error(
        'Error adjusting stock:',
        error
      );


      await this.dialog.alert(
        error?.message ??
        'Failed to adjust stock.'
      );

    }


    finally {

      this.isSaving =
        false;

    }

  }


  // =======================================================
  // CLEAR FORM
  // INTERNAL RESET WITHOUT SAVING CHECK
  // =======================================================

  private clearForm() {

    this.adjustment = {

      warehouseId: '',

      productId: '',

      adjustmentType: '',

      quantity: null,

      reason: '',

      adjustmentDate:
        this.getLocalDateString(),

      notes: ''

    };


    this.currentQuantity = 0;

    this.inventoryExists = false;

    this.inventory = [];

  }


  // =======================================================
  // RESET
  // =======================================================

  resetForm() {

    if (
      this.isSaving
    ) {

      return;

    }


    this.clearForm();

  }


  // =======================================================
  // CANCEL
  // =======================================================

  async cancel() {

    if (
      this.isSaving
    ) {

      return;

    }


    await this.router.navigate([
      '/stock-adjustments'
    ]);

  }


  // =======================================================
  // LOCAL DATE
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
  // DESTROY
  // =======================================================

  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}