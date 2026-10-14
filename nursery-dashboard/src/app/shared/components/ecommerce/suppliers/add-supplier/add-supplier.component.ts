import { CommonModule } from '@angular/common';
import { DuplicateError } from '../../../../../services/unique-key';
import { Component, inject} from '@angular/core';
import { AppDialogService } from '../../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SupplierService } from '../../../../../services/supplier.service';

import {
  emailAddress,
  gstNumber,
  indianMobile,
  normalizeIndianMobile,
  optionalText,
  requiredText,
  upperInput
} from '../../../../utils/form-validation';

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

  upperGst(value: string) {

    return upperInput(value);

  }


  private readonly dialog = inject(AppDialogService);


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

    const name =
      this.supplier.name.trim();

    const mobile =
      normalizeIndianMobile(this.supplier.mobile);

    const error =
      requiredText(name, 'supplier name') ||
      indianMobile(this.supplier.mobile, true) ||
      emailAddress(this.supplier.email, false) ||
      gstNumber(this.supplier.gstNumber) ||
      optionalText(this.supplier.address, 'Address', 300) ||
      optionalText(this.supplier.notes, 'Notes', 500);

    if (error) {

      await this.dialog.alert(error);

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

          name,

          mobile,

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


      await this.dialog.alert(
        'Supplier added successfully!'
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding supplier:',
        error
      );


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to add supplier. Please try again.')
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