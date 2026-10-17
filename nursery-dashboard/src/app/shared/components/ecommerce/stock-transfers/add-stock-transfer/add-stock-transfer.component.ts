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
  StockTransferService
} from '../../../../../services/stock-transfer.service';


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
  selector: 'app-add-stock-transfer',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ProductPickerComponent
  ],

  templateUrl:
    './add-stock-transfer.component.html',

  styleUrl:
    './add-stock-transfer.component.css'
})
export class AddStockTransferComponent
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
  // AVAILABLE STOCK
  // =======================================================

  availableQuantity = 0;


  // =======================================================
  // DATE
  // =======================================================

  today =
    this.getLocalDateString();


  // =======================================================
  // TRANSFER FORM
  // =======================================================

  transfer = {

    fromWarehouseId: '',

    toWarehouseId: '',

    productId: '',

    quantity: null as number | null,

    transferDate:
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

    private stockTransferService:
      StockTransferService,

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
  // LOAD MASTER DATA
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
  // PRODUCT PICKED (from the product picker)
  // =======================================================
  //
  // The picker searches Firestore, so the whole product list is
  // never loaded. Stock for the chosen product in the source
  // warehouse is read with one small query.
  //
  // =======================================================

  async onProductPicked(
    product: any | null
  ) {

    this.transfer.quantity = null;

    if (!product) {

      this.transfer.productId = '';

      this.inventory = [];

      this.availableQuantity = 0;

      return;

    }

    if (!this.products.some(entry => entry.id === product.id)) {

      this.products.push({

        id: product.id,

        name: product.name ?? '',

        isActive: product.isActive !== false

      });

    }

    this.transfer.productId = product.id;

    this.availableQuantity = 0;

    await this.refreshStock();

  }


  // Reads the chosen product's stock in the source warehouse.
  private async refreshStock() {

    const productId = this.transfer.productId;

    const warehouseId = this.transfer.fromWarehouseId;

    if (!productId || !warehouseId) {

      this.inventory = [];

      this.availableQuantity = 0;

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
        productId !== this.transfer.productId ||
        warehouseId !== this.transfer.fromWarehouseId
      ) {

        return;

      }

      this.inventory = record ? [record] : [];

      this.updateAvailableQuantity();

    } catch (error) {

      console.error('Error reading stock:', error);

      this.inventory = [];

      this.availableQuantity = 0;

    }

  }


  // =======================================================
  // DESTINATION WAREHOUSES
  // =======================================================

  getDestinationWarehouses():
    Warehouse[] {

    if (
      !this.transfer.fromWarehouseId
    ) {

      return this.warehouses;

    }


    return this.warehouses.filter(
      warehouse =>
        warehouse.id !==
        this.transfer.fromWarehouseId
    );

  }


  // =======================================================
  // SOURCE WAREHOUSE CHANGE
  // =======================================================

  onSourceWarehouseChange() {

    // Product must be selected again because available
    // products depend on the source warehouse.

    this.transfer.productId = '';

    this.inventory = [];

    this.transfer.quantity = null;

    this.availableQuantity = 0;


    // Prevent source and destination from becoming equal.

    if (
      this.transfer.toWarehouseId ===
      this.transfer.fromWarehouseId
    ) {

      this.transfer.toWarehouseId = '';

    }

  }


  // =======================================================
  // DESTINATION WAREHOUSE CHANGE
  // =======================================================

  async onDestinationWarehouseChange() {

    if (
      this.transfer.toWarehouseId ===
      this.transfer.fromWarehouseId
    ) {

      this.transfer.toWarehouseId = '';


      await this.dialog.alert(
        'Source and destination warehouses cannot be the same.'
      );

    }

  }


  // =======================================================
  // PRODUCT CHANGE
  // =======================================================

  onProductChange() {

    this.transfer.quantity = null;

    this.updateAvailableQuantity();

  }


  // =======================================================
  // UPDATE AVAILABLE QUANTITY
  // =======================================================

  private updateAvailableQuantity() {

    if (
      !this.transfer.fromWarehouseId ||
      !this.transfer.productId
    ) {

      this.availableQuantity = 0;

      return;

    }


    const inventoryRecord =
      this.inventory.find(
        inventoryItem =>
          inventoryItem.productId ===
            this.transfer.productId &&
          inventoryItem.warehouseId ===
            this.transfer.fromWarehouseId
      );


    this.availableQuantity =
      Number(
        inventoryRecord?.quantity ?? 0
      );

  }


  // =======================================================
  // SELECTED PRODUCT
  // =======================================================

  getSelectedProduct():
    ProductOption | undefined {

    return this.products.find(
      product =>
        product.id ===
        this.transfer.productId
    );

  }


  // =======================================================
  // SELECTED SOURCE WAREHOUSE
  // =======================================================

  getSelectedSourceWarehouse():
    Warehouse | undefined {

    return this.warehouses.find(
      warehouse =>
        warehouse.id ===
        this.transfer.fromWarehouseId
    );

  }


  // =======================================================
  // SELECTED DESTINATION WAREHOUSE
  // =======================================================

  getSelectedDestinationWarehouse():
    Warehouse | undefined {

    return this.warehouses.find(
      warehouse =>
        warehouse.id ===
        this.transfer.toWarehouseId
    );

  }


  // =======================================================
  // VALIDATE TRANSFER
  // =======================================================

  private async validateTransfer():
    Promise<boolean> {

    // =====================================================
    // SOURCE WAREHOUSE
    // =====================================================

    if (
      !this.transfer.fromWarehouseId
    ) {

      await this.dialog.alert(
        'Please select a source warehouse.'
      );

      return false;

    }


    const sourceWarehouse =
      this.getSelectedSourceWarehouse();


    if (!sourceWarehouse) {

      await this.dialog.alert(
        'Selected source warehouse is invalid.'
      );

      return false;

    }


    // =====================================================
    // DESTINATION WAREHOUSE
    // =======================================================

    if (
      !this.transfer.toWarehouseId
    ) {

      await this.dialog.alert(
        'Please select a destination warehouse.'
      );

      return false;

    }


    const destinationWarehouse =
      this.getSelectedDestinationWarehouse();


    if (!destinationWarehouse) {

      await this.dialog.alert(
        'Selected destination warehouse is invalid.'
      );

      return false;

    }


    // =====================================================
    // SAME WAREHOUSE
    // =====================================================

    if (
      this.transfer.fromWarehouseId ===
      this.transfer.toWarehouseId
    ) {

      await this.dialog.alert(
        'Source and destination warehouses cannot be the same.'
      );

      return false;

    }


    // =====================================================
    // PRODUCT
    // =====================================================

    if (
      !this.transfer.productId
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
    // AVAILABLE STOCK
    // =====================================================
    //
    // Read the latest stock again right before saving.

    await this.refreshStock();


    if (
      this.availableQuantity <= 0
    ) {

      await this.dialog.alert(
        'The selected product has no available stock in the source warehouse.'
      );

      return false;

    }


    // =====================================================
    // QUANTITY
    // =====================================================

    const quantity =
      Number(
        this.transfer.quantity
      );


    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {

      await this.dialog.alert(
        'Please enter a valid transfer quantity.'
      );

      return false;

    }


    if (
      quantity >
      this.availableQuantity
    ) {

      await this.dialog.alert(
        `Only ${this.availableQuantity} units are available in the source warehouse.`
      );

      return false;

    }


    // =====================================================
    // DATE
    // =====================================================

    if (
      !this.transfer.transferDate
    ) {

      await this.dialog.alert(
        'Please select a transfer date.'
      );

      return false;

    }


    // =====================================================
    // FUTURE DATE
    // =====================================================

    if (
      this.transfer.transferDate >
      this.today
    ) {

      await this.dialog.alert(
        'Transfer date cannot be in the future.'
      );

      return false;

    }


    if (
      this.transfer.notes.trim().length > 500
    ) {

      await this.dialog.alert(
        'Notes must be 500 characters or fewer.'
      );

      return false;

    }


    return true;

  }


  // =======================================================
  // BUILD TRANSFER DATA
  // =======================================================

  private buildTransferData() {

    const product =
      this.getSelectedProduct();


    const sourceWarehouse =
      this.getSelectedSourceWarehouse();


    const destinationWarehouse =
      this.getSelectedDestinationWarehouse();


    if (
      !product ||
      !sourceWarehouse ||
      !destinationWarehouse
    ) {

      return null;

    }


    return {

      productId:
        product.id,

      productName:
        product.name,

      fromWarehouseId:
        sourceWarehouse.id!,

      fromWarehouseName:
        sourceWarehouse.name,

      fromWarehouseCode:
        sourceWarehouse.code,

      toWarehouseId:
        destinationWarehouse.id!,

      toWarehouseName:
        destinationWarehouse.name,

      toWarehouseCode:
        destinationWarehouse.code,

      quantity:
        Number(
          this.transfer.quantity
        ),

      transferDate:
        this.transfer.transferDate,

      notes:
        this.transfer.notes.trim()

    };

  }


  // =======================================================
  // CONFIRM TRANSFER
  // =======================================================

  private async confirmTransfer():
    Promise<boolean> {

    const product =
      this.getSelectedProduct();


    const sourceWarehouse =
      this.getSelectedSourceWarehouse();


    const destinationWarehouse =
      this.getSelectedDestinationWarehouse();


    if (
      !product ||
      !sourceWarehouse ||
      !destinationWarehouse
    ) {

      return false;

    }


    const quantity =
      Number(
        this.transfer.quantity
      );


    return await this.dialog.confirm(

      `Transfer ${quantity} unit(s) of ${product.name}?\n\n` +

      `From: ${sourceWarehouse.code} - ${sourceWarehouse.name}\n` +

      `To: ${destinationWarehouse.code} - ${destinationWarehouse.name}`

    );

  }


  // =======================================================
  // TRANSFER STOCK
  // =======================================================
  //
  // Completes transfer and stays on this page.
  //
  // =======================================================

  async transferStock() {

    if (
      this.isSaving
    ) {

      return;

    }


    if (
      !await this.validateTransfer()
    ) {

      return;

    }


    const transferData =
      this.buildTransferData();


    if (!transferData) {

      await this.dialog.alert(
        'Unable to resolve transfer information.'
      );

      return;

    }


    if (
      !await this.confirmTransfer()
    ) {

      return;

    }


    this.isSaving =
      true;


    try {

      const transferId =
        await this.stockTransferService
          .createStockTransfer(
            transferData
          );


      await this.dialog.alert(
        'Stock transferred successfully.'
      );


      // Stay on this page and prepare for another transfer.

      this.resetFormAfterSave();

    }


    catch (error: any) {

      console.error(
        'Error transferring stock:',
        error
      );


      await this.dialog.alert(
        error?.message ??
        'Failed to transfer stock.'
      );

    }


    finally {

      this.isSaving =
        false;

    }

  }


  // =======================================================
  // TRANSFER & VIEW TRANSFERS
  // =======================================================

  async transferAndViewTransfers() {

    if (
      this.isSaving
    ) {

      return;

    }


    if (
      !await this.validateTransfer()
    ) {

      return;

    }


    const transferData =
      this.buildTransferData();


    if (!transferData) {

      await this.dialog.alert(
        'Unable to resolve transfer information.'
      );

      return;

    }


    if (
      !await this.confirmTransfer()
    ) {

      return;

    }


    this.isSaving =
      true;


    try {

      const transferId =
        await this.stockTransferService
          .createStockTransfer(
            transferData
          );


      await this.dialog.alert(
        'Stock transferred successfully.'
      );


      await this.router.navigate([
        '/stock-transfers'
      ]);

    }


    catch (error: any) {

      console.error(
        'Error transferring stock:',
        error
      );


      await this.dialog.alert(
        error?.message ??
        'Failed to transfer stock.'
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


    this.clearForm();

  }


  // =======================================================
  // RESET AFTER SUCCESSFUL TRANSFER
  // =======================================================

  private resetFormAfterSave() {

    this.clearForm();

  }


  // =======================================================
  // CLEAR FORM
  // =======================================================

  private clearForm() {

    this.transfer = {

      fromWarehouseId: '',

      toWarehouseId: '',

      productId: '',

      quantity: null,

      transferDate:
        this.getLocalDateString(),

      notes: ''

    };


    this.availableQuantity = 0;

    this.inventory = [];

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
  // DESTROY
  // =======================================================

  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}