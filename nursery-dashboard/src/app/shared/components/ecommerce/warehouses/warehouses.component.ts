import { CommonModule } from '@angular/common';
import { DuplicateError } from '../../../../services/unique-key';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialogService } from '../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';

import {
  Warehouse,
  WarehouseService
} from '../../../../services/warehouse.service';

import {
  duplicateValue,
  requiredText,
  shortCode,
  upperInput
} from '../../../utils/form-validation';


@Component({
  selector: 'app-warehouses',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './warehouses.component.html',

  styleUrl: './warehouses.component.css'
})
export class WarehousesComponent implements OnInit {

  private destroyRef = inject(DestroyRef);


  private readonly dialog = inject(AppDialogService);


  constructor(
    private warehouseService: WarehouseService
  ) {}


  // =========================
  // WAREHOUSES
  // =========================

  warehouses: Warehouse[] = [];

  isLoading = true;


  // =========================
  // EDIT STATE
  // =========================

  editingWarehouseId: string | null = null;

  editingWarehouseName = '';

  editingWarehouseCode = '';

  isSaving = false;


  // =========================
  // STATUS STATE
  // =========================

  isUpdatingStatus = false;


  // =========================
  // INIT
  // =========================

  ngOnInit() {

    this.warehouseService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (warehouses) => {

          this.warehouses = warehouses;

          this.isLoading = false;

        },

        error: (error) => {

          console.error(
            'Error loading warehouses:',
            error
          );

          this.isLoading = false;

        }

      });

  }


  // =========================
  // EDIT WAREHOUSE
  // =========================

  editWarehouse(
    warehouse: Warehouse
  ) {

    if (!warehouse.id) {

      console.error(
        'Cannot edit warehouse without an ID.'
      );

      return;

    }


    this.editingWarehouseId =
      warehouse.id;


    this.editingWarehouseName =
      upperInput(warehouse.name);


    this.editingWarehouseCode =
      upperInput(warehouse.code);

  }


  // =========================
  // CANCEL EDIT
  // =========================

  cancelEdit() {

    if (this.isSaving) {
      return;
    }


    this.editingWarehouseId = null;

    this.editingWarehouseName = '';

    this.editingWarehouseCode = '';

  }


  // =========================
  // SAVE WAREHOUSE
  // =========================

  upperCode(value: string) {

    return upperInput(value);

  }


  upperName(value: string) {

    return upperInput(value);

  }


  async saveWarehouse() {

    if (!this.editingWarehouseId) {
      return;
    }


    // -------------------------
    // NAME VALIDATION
    // -------------------------

    const name =
      this.editingWarehouseName.trim().toUpperCase();

    const normalizedCode =
      this.editingWarehouseCode.trim().toUpperCase();

    const error =
      requiredText(name, 'warehouse name') ||
      shortCode(normalizedCode, 'Warehouse code') ||
      duplicateValue(
        normalizedCode,
        this.warehouses
          .filter(
            warehouse =>
              warehouse.id !== this.editingWarehouseId
          )
          .map(warehouse => warehouse.code),
        'warehouse code'
      );

    if (error) {

      await this.dialog.alert(error);

      return;

    }


    this.isSaving = true;


    try {

      await this.warehouseService
        .updateWarehouse(
          this.editingWarehouseId,
          {
            name,

            code:
              normalizedCode
          }
        );


      this.isSaving = false;


      this.cancelEdit();


      await this.dialog.alert(
        'Warehouse updated successfully.'
      );

    }

    catch (error) {

      console.error(
        'Error updating warehouse:',
        error
      );


      this.isSaving = false;


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to update warehouse. Please try again.')
      );

    }

  }


  // =========================
  // TOGGLE WAREHOUSE STATUS
  // =========================

  async toggleWarehouseStatus(
    warehouse: Warehouse
  ) {

    if (!warehouse.id) {

      console.error(
        'Cannot update warehouse status without an ID.'
      );

      return;

    }


    if (this.isUpdatingStatus) {
      return;
    }


    const newStatus =
      !warehouse.isActive;


    this.isUpdatingStatus = true;


    try {

      await this.warehouseService
        .updateWarehouseStatus(
          warehouse.id,
          newStatus
        );


      warehouse.isActive =
        newStatus;


      console.log(
        `Warehouse "${warehouse.name}" is now ${
          newStatus
            ? 'Active'
            : 'Inactive'
        }.`
      );


      this.isUpdatingStatus = false;

    }

    catch (error) {

      console.error(
        'Error updating warehouse status:',
        error
      );


      this.isUpdatingStatus = false;


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to update warehouse status. Please try again.')
      );

    }

  }

}