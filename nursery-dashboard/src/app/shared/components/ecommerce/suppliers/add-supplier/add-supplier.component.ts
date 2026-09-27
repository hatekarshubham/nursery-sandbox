import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SupplierService } from '../../../../../services/supplier.service';

@Component({
  selector: 'app-add-supplier',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-supplier.component.html',
  styleUrl: './add-supplier.component.css'
})
export class AddSupplierComponent {

  supplier = {
    name: '',
    mobile: '',
    email: '',
    address: '',
    gstNumber: '',
    notes: '',
    isActive: true
  };

  supplierId: string | null = null;

  isSaving = false;


  constructor(
    private supplierService: SupplierService,
    private router: Router
  ) {}


  // =====================================================
  // SAVE & VIEW ALL
  // =====================================================

  async saveAndViewAll() {

    const saved = await this.saveSupplier();

    if (saved) {

      await this.router.navigate([
        '/suppliers'
      ]);

    }

  }


  // =====================================================
  // SAVE & ADD ANOTHER
  // =====================================================

  async saveAndAddAnother() {

    const saved = await this.saveSupplier();

    if (saved) {

      this.resetForm();

    }

  }


  // =====================================================
  // SAVE SUPPLIER
  // =====================================================

  private async saveSupplier(): Promise<boolean> {

    if (this.isSaving) {
      return false;
    }


    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (!this.supplier.name.trim()) {

      alert(
        'Please enter a supplier name.'
      );

      return false;

    }


    if (!this.supplier.mobile.trim()) {

      alert(
        'Please enter a supplier mobile number.'
      );

      return false;

    }


    // -----------------------------------------------------
    // SAVE
    // -----------------------------------------------------

    this.isSaving = true;

    try {

      console.log(
        'Supplier before Firestore:',
        this.supplier
      );


      const result =
        await this.supplierService.addSupplier({

          name:
            this.supplier.name.trim(),

          mobile:
            this.supplier.mobile.trim(),

          email:
            this.supplier.email.trim(),

          address:
            this.supplier.address.trim(),

          gstNumber:
            this.supplier.gstNumber
              .trim()
              .toUpperCase(),

          notes:
            this.supplier.notes.trim(),

          isActive:
            this.supplier.isActive

        });


      this.supplierId = result.id;


      console.log(
        'Supplier added to Firestore:',
        result.id
      );


      alert(
        `Supplier added successfully!\nSupplier ID: ${result.id}`
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding supplier:',
        error
      );


      alert(
        'Failed to add supplier. Please try again.'
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


    this.supplier = {

      name: '',

      mobile: '',

      email: '',

      address: '',

      gstNumber: '',

      notes: '',

      isActive: true

    };


    this.supplierId = null;

  }

}