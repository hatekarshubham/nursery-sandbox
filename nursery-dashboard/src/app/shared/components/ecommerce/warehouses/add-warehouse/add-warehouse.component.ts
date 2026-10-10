import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  WarehouseService
} from '../../../../../services/warehouse.service';

import { AlertService } from '../../../../../shared/services/alert.service';

@Component({
  selector: 'app-add-warehouse',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './add-warehouse.component.html',

  styleUrl: './add-warehouse.component.css'
})
export class AddWarehouseComponent {

  warehouseName = '';

  warehouseCode = '';

  isActive = true;

  isSaving = false;


  private alertService = inject(AlertService);


  constructor(
    private warehouseService: WarehouseService,
    private router: Router
  ) {}


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

    if (!this.warehouseName.trim()) {

      this.alertService.warning(
        'Warehouse Name Required',
        'Please enter a warehouse name.'
      );

      return false;

    }


    // -----------------------------------------------------
    // CODE VALIDATION
    // -----------------------------------------------------

    if (!this.warehouseCode.trim()) {

      this.alertService.warning(
        'Warehouse Code Required',
        'Please enter a warehouse code.'
      );

      return false;

    }


    const normalizedCode =
      this.warehouseCode
        .trim()
        .toUpperCase();


    // -----------------------------------------------------
    // SAVE
    // -----------------------------------------------------

    this.isSaving = true;


    try {

      const result =
        await this.warehouseService
          .addWarehouse({

            name:
              this.warehouseName.trim(),

            code:
              normalizedCode,

            isActive:
              this.isActive

          });


      console.log(
        'Warehouse added successfully:',
        result.id
      );


      this.alertService.success(
        'Warehouse Added Successfully',
        `Warehouse added successfully! Warehouse ID: ${result.id}`
      );


      return true;

    }


    catch (error) {

      console.error(
        'Error adding warehouse:',
        error
      );


      this.alertService.error(
        'Failed to Add Warehouse',
        'Failed to add warehouse. Please try again.'
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

    this.isActive = true;

  }

}