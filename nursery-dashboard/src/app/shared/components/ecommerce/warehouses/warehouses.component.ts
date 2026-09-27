import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Warehouse,
  WarehouseService
} from '../../../../services/warehouse.service';


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
      .subscribe({

        next: (warehouses) => {

          this.warehouses = warehouses;

          this.isLoading = false;

          console.log(
            'Warehouses loaded:',
            warehouses
          );

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
      warehouse.name;


    this.editingWarehouseCode =
      warehouse.code;

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

  async saveWarehouse() {

    if (!this.editingWarehouseId) {
      return;
    }


    // -------------------------
    // NAME VALIDATION
    // -------------------------

    if (!this.editingWarehouseName.trim()) {

      alert(
        'Please enter a warehouse name.'
      );

      return;

    }


    // -------------------------
    // CODE VALIDATION
    // -------------------------

    if (!this.editingWarehouseCode.trim()) {

      alert(
        'Please enter a warehouse code.'
      );

      return;

    }


    // -------------------------
    // DUPLICATE CODE CHECK
    // -------------------------

    const normalizedCode =
      this.editingWarehouseCode
        .trim()
        .toUpperCase();


    const duplicateWarehouse =
      this.warehouses.find(
        (warehouse) =>
          warehouse.id !==
            this.editingWarehouseId &&
          warehouse.code
            .trim()
            .toUpperCase() ===
            normalizedCode
      );


    if (duplicateWarehouse) {

      alert(
        'Another warehouse already uses this code.'
      );

      return;

    }


    this.isSaving = true;


    try {

      await this.warehouseService
        .updateWarehouse(
          this.editingWarehouseId,
          {
            name:
              this.editingWarehouseName
                .trim(),

            code:
              normalizedCode
          }
        );


      this.isSaving = false;


      this.cancelEdit();


      alert(
        'Warehouse updated successfully.'
      );

    }

    catch (error) {

      console.error(
        'Error updating warehouse:',
        error
      );


      this.isSaving = false;


      alert(
        'Failed to update warehouse. Please try again.'
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


      alert(
        'Failed to update warehouse status. Please try again.'
      );

    }

  }

}