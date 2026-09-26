import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
    private categoryService: CategoryService
  ) {}

  async addCategory() {

    const name = this.categoryName.trim();
    const code = this.categoryCode.trim().toUpperCase();

    // Validate category name
    if (!name) {
      alert('Please enter a category name.');
      return;
    }

    // Validate category code
    if (!code) {
      alert('Please enter a category code.');
      return;
    }

    try {

      this.isSaving = true;

      console.log('Adding category:', {
        name,
        code
      });

      const result = await this.categoryService.addCategory(
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

      // Clear the form
      this.resetForm();

    } catch (error) {

      console.error(
        'Error adding category:',
        error
      );

      alert(
        'Failed to add category. Please try again.'
      );

    } finally {

      this.isSaving = false;

    }
  }

  resetForm() {

    this.categoryName = '';
    this.categoryCode = '';

  }

}