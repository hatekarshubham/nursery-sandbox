import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Supplier,
  SupplierService
} from '../../../../services/supplier.service';

import { AlertService } from '../../../../shared/services/alert.service';

@Component({
  selector: 'app-suppliers',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css'
})
export class SuppliersComponent implements OnInit {

  constructor(
    private supplierService: SupplierService
  ) {}

  private alertService = inject(AlertService);

  suppliers: Supplier[] = [];

  isLoading = true;

  // Edit state
  editingSupplierId: string | null = null;

  editingSupplierName = '';
  editingSupplierMobile = '';
  editingSupplierEmail = '';
  editingSupplierAddress = '';
  editingSupplierGstNumber = '';
  editingSupplierNotes = '';

  // Delete state
  isDeleteModalOpen = false;
  supplierToDelete: Supplier | null = null;
  isDeleting = false;

  // Save state
  isSaving = false;

  // Status state
  isUpdatingStatus = false;


  ngOnInit() {

    this.supplierService
      .getSuppliers()
      .subscribe({

        next: (suppliers) => {

          this.suppliers = suppliers;

          this.isLoading = false;

          console.log(
            'Suppliers loaded:',
            suppliers
          );

        },

        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );

          this.isLoading = false;

        }

      });

  }


  editSupplier(supplier: Supplier) {

    if (!supplier.id) {

      console.error(
        'Cannot edit supplier without an ID.'
      );

      return;

    }

    this.editingSupplierId = supplier.id;

    this.editingSupplierName = supplier.name;
    this.editingSupplierMobile = supplier.mobile;
    this.editingSupplierEmail = supplier.email;
    this.editingSupplierAddress = supplier.address;
    this.editingSupplierGstNumber = supplier.gstNumber;
    this.editingSupplierNotes = supplier.notes;

  }


  cancelEdit() {

    if (this.isSaving) {
      return;
    }

    this.editingSupplierId = null;

    this.editingSupplierName = '';
    this.editingSupplierMobile = '';
    this.editingSupplierEmail = '';
    this.editingSupplierAddress = '';
    this.editingSupplierGstNumber = '';
    this.editingSupplierNotes = '';

  }


  async saveSupplier() {

    if (!this.editingSupplierId) {
      return;
    }

    if (!this.editingSupplierName.trim()) {

      this.alertService.warning(
        'Supplier Name Required',
        'Please enter a supplier name.'
      );

      return;

    }

    if (!this.editingSupplierMobile.trim()) {

      this.alertService.warning(
        'Supplier Mobile Required',
        'Please enter a supplier mobile number.'
      );

      return;

    }

    this.isSaving = true;

    try {

      await this.supplierService.updateSupplier(
        this.editingSupplierId,
        {
          name: this.editingSupplierName.trim(),
          mobile: this.editingSupplierMobile.trim(),
          email: this.editingSupplierEmail.trim(),
          address: this.editingSupplierAddress.trim(),
          gstNumber:
            this.editingSupplierGstNumber
              .trim()
              .toUpperCase(),
          notes: this.editingSupplierNotes.trim()
        }
      );

      this.isSaving = false;

      this.cancelEdit();

      this.alertService.success(
        'Supplier Updated Successfully',
        'Supplier updated successfully.'
      );

    } catch (error) {

      console.error(
        'Error updating supplier:',
        error
      );

      this.isSaving = false;

      this.alertService.error(
        'Update Failed',
        'Failed to update supplier. Please try again.'
      );

    }

  }


  async toggleSupplierStatus(
    supplier: Supplier
  ) {

    if (!supplier.id) {

      console.error(
        'Cannot update supplier status without an ID.'
      );

      return;

    }

    if (this.isUpdatingStatus) {
      return;
    }

    const newStatus =
      !supplier.isActive;

    this.isUpdatingStatus = true;

    try {

      await this.supplierService
        .updateSupplierStatus(
          supplier.id,
          newStatus
        );

      supplier.isActive = newStatus;

      console.log(
        `Supplier "${supplier.name}" is now ${
          newStatus
            ? 'Active'
            : 'Inactive'
        }.`
      );

      this.isUpdatingStatus = false;

    } catch (error) {

      console.error(
        'Error updating supplier status:',
        error
      );

      this.isUpdatingStatus = false;

      this.alertService.error(
        'Status Update Failed',
        'Failed to update supplier status. Please try again.'
      );

    }

  }


  openDeleteModal(
    supplier: Supplier
  ) {

    if (!supplier.id) {

      console.error(
        'Cannot delete supplier without an ID.'
      );

      return;

    }

    this.supplierToDelete = supplier;

    this.isDeleteModalOpen = true;

  }


  closeDeleteModal() {

    if (this.isDeleting) {
      return;
    }

    this.isDeleteModalOpen = false;

    this.supplierToDelete = null;

  }


  async confirmDelete() {

    if (!this.supplierToDelete?.id) {
      return;
    }

    this.isDeleting = true;

    try {

      await this.supplierService
        .deleteSupplier(
          this.supplierToDelete.id
        );

      console.log(
        'Supplier deleted:',
        this.supplierToDelete.id
      );

      this.isDeleting = false;

      this.isDeleteModalOpen = false;

      this.supplierToDelete = null;

      this.alertService.success(
        'Supplier Deleted Successfully',
        'Supplier deleted successfully.'
      );

    } catch (error) {

      console.error(
        'Error deleting supplier:',
        error
      );

      this.isDeleting = false;

      this.alertService.error(
        'Delete Failed',
        'Failed to delete supplier. Please try again.'
      );

    }

  }

}