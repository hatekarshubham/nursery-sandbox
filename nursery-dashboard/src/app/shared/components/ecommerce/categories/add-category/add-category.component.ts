import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CategoryService } from '../../../../../services/category.service';

@Component({
  selector: 'app-add-category',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-category.component.html',
  styleUrl: './add-category.component.css'
})
export class AddCategoryComponent {

  categoryName = '';
  categoryCode = '';

  isSaving = false;

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}


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
      this.categoryName.trim();

    const code =
      this.categoryCode
        .trim()
        .toUpperCase();


    // Validate category name

    if (!name) {

      alert(
        'Please enter a category name.'
      );

      return false;

    }


    // Validate category code

    if (!code) {

      alert(
        'Please enter a category code.'
      );

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


      alert(
        `Category added successfully!\nCategory ID: ${result.id}`
      );


      return true;

    }

    catch (error) {

      console.error(
        'Error adding category:',
        error
      );


      alert(
        'Failed to add category. Please try again.'
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