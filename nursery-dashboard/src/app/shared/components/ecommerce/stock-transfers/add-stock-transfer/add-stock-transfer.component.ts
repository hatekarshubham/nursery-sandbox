import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import {
  Subscription,
  combineLatest
} from 'rxjs';

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
    FormsModule
  ],

  templateUrl:
    './add-stock-transfer.component.html',

  styleUrl:
    './add-stock-transfer.component.css'
})
export class AddStockTransferComponent
  implements OnInit, OnDestroy {


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
      combineLatest([

        this.warehouseService
          .getActiveWarehouses(),

        this.productService
          .getProducts(),

        this.inventoryService
          .getInventory()

      ])
        .subscribe({

          next: ([
            warehouses,
            products,
            inventory
          ]) => {

            // =============================================
            // WAREHOUSES
            // =============================================

            this.warehouses =
              warehouses;


            // =============================================
            // PRODUCTS
            // =============================================

            this.products =
              products

                .filter(
                  product =>
                    !!product.id &&
                    product.isActive !== false
                )

                .map(
                  product => ({

                    id:
                      product.id,

                    name:
                      product.name ?? '',

                    isActive:
                      product.isActive !== false

                  })
                );


            // =============================================
            // INVENTORY
            // =============================================

            this.inventory =
              inventory;


            // =============================================
            // REFRESH AVAILABLE QUANTITY
            // =============================================

            this.updateAvailableQuantity();


            this.isLoading =
              false;

          },


          error: (error) => {

            console.error(
              'Error loading stock transfer data:',
              error
            );


            this.errorMessage =
              'Failed to load stock transfer data.';


            this.isLoading =
              false;

          }

        });


    this.subscription.add(
      dataSubscription
    );

  }


  // =======================================================
  // PRODUCTS AVAILABLE IN SOURCE WAREHOUSE
  // =======================================================

  getAvailableProducts():
    ProductOption[] {

    if (
      !this.transfer.fromWarehouseId
    ) {

      return [];

    }


    return this.products.filter(
      product => {

        const inventoryRecord =
          this.inventory.find(
            inventoryItem =>
              inventoryItem.productId ===
                product.id &&
              inventoryItem.warehouseId ===
                this.transfer.fromWarehouseId
          );


        return (
          inventoryRecord !== undefined &&
          Number(
            inventoryRecord.quantity ?? 0
          ) > 0
        );

      }
    );

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

  onDestinationWarehouseChange() {

    if (
      this.transfer.toWarehouseId ===
      this.transfer.fromWarehouseId
    ) {

      this.transfer.toWarehouseId = '';


      alert(
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

  private validateTransfer():
    boolean {

    // =====================================================
    // SOURCE WAREHOUSE
    // =====================================================

    if (
      !this.transfer.fromWarehouseId
    ) {

      alert(
        'Please select a source warehouse.'
      );

      return false;

    }


    const sourceWarehouse =
      this.getSelectedSourceWarehouse();


    if (!sourceWarehouse) {

      alert(
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

      alert(
        'Please select a destination warehouse.'
      );

      return false;

    }


    const destinationWarehouse =
      this.getSelectedDestinationWarehouse();


    if (!destinationWarehouse) {

      alert(
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

      alert(
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

      alert(
        'Please select a product.'
      );

      return false;

    }


    const product =
      this.getSelectedProduct();


    if (!product) {

      alert(
        'Selected product is invalid.'
      );

      return false;

    }


    // =====================================================
    // AVAILABLE STOCK
    // =====================================================

    this.updateAvailableQuantity();


    if (
      this.availableQuantity <= 0
    ) {

      alert(
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

      alert(
        'Please enter a valid transfer quantity.'
      );

      return false;

    }


    if (
      quantity >
      this.availableQuantity
    ) {

      alert(
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

      alert(
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

      alert(
        'Transfer date cannot be in the future.'
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

  private confirmTransfer():
    boolean {

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


    return window.confirm(

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
      !this.validateTransfer()
    ) {

      return;

    }


    const transferData =
      this.buildTransferData();


    if (!transferData) {

      alert(
        'Unable to resolve transfer information.'
      );

      return;

    }


    if (
      !this.confirmTransfer()
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


      console.log(
        'Stock transfer completed:',
        transferId
      );


      alert(
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


      alert(
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
      !this.validateTransfer()
    ) {

      return;

    }


    const transferData =
      this.buildTransferData();


    if (!transferData) {

      alert(
        'Unable to resolve transfer information.'
      );

      return;

    }


    if (
      !this.confirmTransfer()
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


      console.log(
        'Stock transfer completed:',
        transferId
      );


      alert(
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


      alert(
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