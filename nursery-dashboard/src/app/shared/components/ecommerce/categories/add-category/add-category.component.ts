import { CommonModule } from '@angular/common';
import { DuplicateError } from '../../../../../services/unique-key';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialogService } from '../../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Category,
  CategoryService
} from '../../../../../services/category.service';

import {
  duplicateValue,
  requiredText,
  shortCode,
  upperInput
} from '../../../../utils/form-validation';

@Component({
  selector: 'app-add-category',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-category.component.html',
  styleUrl: './add-category.component.css'
})
export class AddCategoryComponent implements OnInit {

  private destroyRef = inject(DestroyRef);


  private readonly dialog = inject(AppDialogService);


  categoryName = '';
  categoryCode = '';

  isSaving = false;

  private categories: Category[] = [];

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit() {

    this.categoryService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(categories => {

        this.categories = categories ?? [];

      });

  }

  onNameInput(value: string) {

    this.categoryName = upperInput(value);

  }

  onCodeInput(value: string) {

    this.categoryCode = upperInput(value);

  }


  // =====================================================
  // SAVE & VIEW ALL
  // =====================================================

  async saveAndViewAll() {

    const saved = await this.saveCategory();

    if (saved) {

      await this.router.navigate([
        '/categories'
      ]);

    }

  }


  // =====================================================
  // SAVE & ADD ANOTHER
  // =====================================================

  async saveAndAddAnother() {

    const saved = await this.saveCategory();

    if (saved) {

      this.resetForm();

    }

  }


  // =====================================================
  // SAVE CATEGORY
  // =====================================================

  private async saveCategory(): Promise<boolean> {

    if (this.isSaving) {
      return false;
    }

    const name =
      this.categoryName.trim().toUpperCase();

    const code =
      this.categoryCode.trim().toUpperCase();

    const error =
      requiredText(name, 'category name') ||
      shortCode(code, 'Category code', 50) ||
      duplicateValue(
        name,
        this.categories.map(category => category.name),
        'category name'
      ) ||
      duplicateValue(
        code,
        this.categories.map(category => category.code),
        'category code'
      );

    if (error) {

      await this.dialog.alert(error);

      return false;

    }


    try {

      this.isSaving = true;

      console.log(
        'Adding category:',
        {
          name,
          code
        }
      );


      const result =
        await this.categoryService
          .addCategory(
            name,
            code
          );


      console.log(
        'Category added successfully:',
        result.id
      );


      await this.dialog.alert(
        'Category added successfully!'
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding category:',
        error
      );


      await this.dialog.alert(
        (error instanceof DuplicateError
          ? error.message
          : 'Failed to add category. Please try again.')
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

    this.categoryName = '';

    this.categoryCode = '';

  }

}