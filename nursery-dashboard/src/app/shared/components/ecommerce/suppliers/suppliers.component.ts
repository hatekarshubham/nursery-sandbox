import { CommonModule } from '@angular/common';
import { DuplicateError } from '../../../../services/unique-key';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialogService } from '../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';

import {
  Supplier,
  SupplierService
} from '../../../../services/supplier.service';

import {
  emailAddress,
  gstNumber,
  indianMobile,
  normalizeIndianMobile,
  optionalText,
  requiredText,
  upperInput
} from '../../../utils/form-validation';

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

  private destroyRef = inject(DestroyRef);


  private readonly dialog = inject(AppDialogService);


  constructor(
    private supplierService: SupplierService
  ) {}

  suppliers: Supplier[] = [];

  isLoading = true;

  // Search box text
  searchText = '';

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


  // Suppliers matching the search box (name first, also mobile,
  // email and GST number). Done in the browser on the list that is
  // already loaded, so searching costs no extra reads.
  get filteredSuppliers(): Supplier[] {

    const term = this.searchText.trim().toLowerCase();

    if (!term) {

      return this.suppliers;

    }

    return this.suppliers.filter(supplier =>
      [
        supplier.name,
        supplier.mobile,
        supplier.email,
        supplier.gstNumber
      ].some(value =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );

  }


  ngOnInit() {

    this.supplierService
      .getSuppliers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (suppliers) => {

          this.suppliers = suppliers;

          this.isLoading = false;

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


  upperGst(value: string) {

    return upperInput(value);

  }


  async saveSupplier() {

    if (!this.editingSupplierId) {
      return;
    }

    const name =
      this.editingSupplierName.trim();

    const mobile =
      normalizeIndianMobile(this.editingSupplierMobile);

    const error =
      requiredText(name, 'supplier name') ||
      indianMobile(this.editingSupplierMobile, true) ||
      emailAddress(this.editingSupplierEmail, false) ||
      gstNumber(this.editingSupplierGstNumber) ||
      optionalText(this.editingSupplierAddress, 'Address', 300) ||
      optionalText(this.editingSupplierNotes, 'Notes', 500);

    if (error) {

      await this.dialog.alert(error);

      return;

    }

    this.isSaving = true;

    try {

      await this.supplierService.updateSupplier(
        this.editingSupplierId,
        {
          name,
          mobile,
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

      await this.dialog.alert(
        'Supplier updated successfully.'
      );

    } catch (error) {

      console.error(
        'Error updating supplier:',
        error
      );

      this.isSaving = false;

      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to update supplier. Please try again.')
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

      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to update supplier status. Please try again.')
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

      await this.dialog.alert(
        'Supplier deleted successfully.'
      );

    } catch (error) {

      console.error(
        'Error deleting supplier:',
        error
      );

      this.isDeleting = false;

      await this.dialog.alert(
        'Failed to delete supplier. Please try again.'
      );

    }

  }

}