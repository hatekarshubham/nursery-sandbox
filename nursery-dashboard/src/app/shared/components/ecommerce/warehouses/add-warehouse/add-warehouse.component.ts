import { CommonModule } from '@angular/common';
import { sanitizeInvoicePrefix } from '../../../../../services/invoice-number';
import { DuplicateError } from '../../../../../services/unique-key';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialogService } from '../../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Warehouse,
  WarehouseService
} from '../../../../../services/warehouse.service';

import {
  duplicateValue,
  requiredText,
  shortCode,
  upperInput
} from '../../../../utils/form-validation';

@Component({
  selector: 'app-add-warehouse',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './add-warehouse.component.html',

  styleUrl: './add-warehouse.component.css'
})
export class AddWarehouseComponent implements OnInit {

  private destroyRef = inject(DestroyRef);


  private readonly dialog = inject(AppDialogService);


  warehouseName = '';

  warehouseCode = '';

  invoicePrefix = '';

  isActive = true;

  isSaving = false;

  private warehouses: Warehouse[] = [];


  constructor(
    private warehouseService: WarehouseService,
    private router: Router
  ) {}

  ngOnInit() {

    this.warehouseService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(warehouses => {

        this.warehouses = warehouses ?? [];

      });

  }

  onNameInput(value: string) {

    this.warehouseName = upperInput(value);

  }


  onCodeInput(value: string) {

    this.warehouseCode = upperInput(value);

  }


  get invoicePreviewPrefix(): string {

    return (
      this.invoicePrefix ||
      sanitizeInvoicePrefix(this.warehouseCode) ||
      'W1'
    );

  }


  onInvoicePrefixInput(value: string) {

    this.invoicePrefix = sanitizeInvoicePrefix(value);

  }


  // =====================================================
  // SAVE & VIEW ALL
  // =====================================================

  async saveAndViewAll() {

    const saved =
      await this.saveWarehouse();

    if (saved) {

      await this.router.navigate([
        '/warehouses'
      ]);

    }

  }


  // =====================================================
  // SAVE & ADD ANOTHER
  // =====================================================

  async saveAndAddAnother() {

    const saved =
      await this.saveWarehouse();

    if (saved) {

      this.resetForm();

    }

  }


  // =====================================================
  // SAVE WAREHOUSE
  // =====================================================

  private async saveWarehouse(): Promise<boolean> {

    if (this.isSaving) {
      return false;
    }


    // -----------------------------------------------------
    // NAME VALIDATION
    // -----------------------------------------------------

    const name =
      this.warehouseName.trim().toUpperCase();

    const normalizedCode =
      this.warehouseCode.trim().toUpperCase();

    const error =
      requiredText(name, 'warehouse name') ||
      shortCode(normalizedCode, 'Warehouse code') ||
      duplicateValue(
        normalizedCode,
        this.warehouses.map(warehouse => warehouse.code),
        'warehouse code'
      );

    if (error) {

      await this.dialog.alert(error);

      return false;

    }


    // -----------------------------------------------------
    // SAVE
    // -----------------------------------------------------

    this.isSaving = true;


    try {

      const result =
        await this.warehouseService
          .addWarehouse({

            name,

            code:
              normalizedCode,

            invoicePrefix:
              this.invoicePrefix,

            isActive:
              this.isActive

          });


      await this.dialog.alert(
        'Warehouse added successfully!'
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding warehouse:',
        error
      );


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to add warehouse. Please try again.')
      );


      return false;

    }

    finally {

      this.isSaving = false;

    }

  }


  // =====================================================
  // RESET FORM
  // =====================================================

  resetForm() {

    if (this.isSaving) {
      return;
    }


    this.warehouseName = '';

    this.warehouseCode = '';

    this.invoicePrefix = '';

    this.isActive = true;

  }

}