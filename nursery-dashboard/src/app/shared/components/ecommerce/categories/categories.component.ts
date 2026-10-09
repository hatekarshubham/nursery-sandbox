import { CommonModule } from '@angular/common';
import { Component, OnInit, inject} from '@angular/core';
import { AppDialogService } from '../../../services/app-dialog.service';
import { FormsModule } from '@angular/forms';

import {
  Category,
  CategoryService
} from '../../../../services/category.service';

import {
  duplicateValue,
  requiredText,
  shortCode,
  upperInput
} from '../../../utils/form-validation';

@Component({
  selector: 'app-categories',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {

  private readonly dialog = inject(AppDialogService);


  categories: Category[] = [];

  isLoading = true;

  // =========================
  // EDIT CATEGORY
  // =========================

  editingCategoryId: string | null = null;
  editingCategoryName = '';
  editingCategoryCode = '';

  // =========================
  // DELETE MODAL
  // =========================

  isDeleteModalOpen = false;
  categoryToDelete: Category | null = null;
  deleteProductCount = 0;
  isCheckingProducts = false;
  isDeleting = false;

  constructor(
    private categoryService: CategoryService
  ) {}

  // =========================
  // LOAD CATEGORIES
  // =========================

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoading = false;

        console.log('Categories loaded:', categories);
      },

      error: (error) => {
        console.error(
          'Error loading categories:',
          error
        );

        this.isLoading = false;
      }
    });
  }

  // =========================
  // EDIT CATEGORY
  // =========================

  editCategory(category: Category) {
    if (!category.id) {
      console.error(
        'Cannot edit category without an ID.'
      );
      return;
    }

    this.editingCategoryId = category.id;
    this.editingCategoryName = upperInput(category.name);
    this.editingCategoryCode = upperInput(category.code);
  }

  onEditNameInput(value: string) {

    this.editingCategoryName = upperInput(value);

  }

  onEditCodeInput(value: string) {

    this.editingCategoryCode = upperInput(value);

  }

  cancelEdit() {
    this.editingCategoryId = null;
    this.editingCategoryName = '';
    this.editingCategoryCode = '';
  }

  async saveCategory() {
    if (!this.editingCategoryId) {
      return;
    }

    const name =
      this.editingCategoryName.trim().toUpperCase();

    const code =
      this.editingCategoryCode.trim().toUpperCase();

    const others =
      this.categories.filter(
        category =>
          category.id !== this.editingCategoryId
      );

    const error =
      requiredText(name, 'category name') ||
      shortCode(code, 'Category code', 50) ||
      duplicateValue(
        name,
        others.map(category => category.name),
        'category name'
      ) ||
      duplicateValue(
        code,
        others.map(category => category.code),
        'category code'
      );

    if (error) {
      await this.dialog.alert(error);
      return;
    }

    try {
      await this.categoryService.updateCategory(
        this.editingCategoryId,
        name,
        code
      );

      await this.dialog.alert(
        'Category updated successfully.'
      );

      this.cancelEdit();

    } catch (error) {
      console.error(
        'Error updating category:',
        error
      );

      await this.dialog.alert(
        'Failed to update category. Please try again.'
      );
    }
  }

  // =========================
  // CATEGORY STATUS
  // =========================

  async toggleCategoryStatus(
    category: Category
  ) {
    if (!category.id) {
      console.error(
        'Cannot update category status without an ID.'
      );
      return;
    }

    const newStatus =
      !category.isActive;

    try {
      await this.categoryService.updateCategoryStatus(
        category.id,
        newStatus
      );

      await this.dialog.alert(
        newStatus
          ? 'Category activated successfully.'
          : 'Category made inactive successfully.'
      );

    } catch (error) {
      console.error(
        'Error updating category status:',
        error
      );

      await this.dialog.alert(
        'Failed to update category status. Please try again.'
      );
    }
  }

  // =========================
  // OPEN DELETE MODAL
  // =========================

  async openDeleteModal(
    category: Category
  ) {
    if (!category.id) {
      console.error(
        'Cannot delete category without an ID.'
      );
      return;
    }

    this.categoryToDelete = category;

    this.deleteProductCount = 0;

    this.isDeleteModalOpen = true;

    this.isCheckingProducts = true;

    try {
      this.deleteProductCount =
        await this.categoryService.getProductCountByCategory(
          category.name
        );

    } catch (error) {
      console.error(
        'Error checking product count:',
        error
      );

      this.closeDeleteModal();

      await this.dialog.alert(
        'Failed to check products in this category. Please try again.'
      );

      return;

    } finally {
      this.isCheckingProducts = false;
    }
  }

  // =========================
  // CLOSE DELETE MODAL
  // =========================

  closeDeleteModal() {

    // Don't allow closing while deletion
    // is currently in progress.
    if (this.isDeleting) {
      return;
    }

    this.isDeleteModalOpen = false;

    this.categoryToDelete = null;

    this.deleteProductCount = 0;

    this.isCheckingProducts = false;
  }

  // =========================
  // CONFIRM DELETE
  // =========================

  async confirmDelete() {

    if (!this.categoryToDelete?.id) {
      return;
    }

    this.isDeleting = true;

    try {

      const result =
        await this.categoryService.deleteCategoryAndProducts(
          this.categoryToDelete.id,
          this.categoryToDelete.name
        );

      /*
       * IMPORTANT:
       *
       * Reset isDeleting BEFORE closing the modal.
       *
       * Otherwise closeDeleteModal() sees
       * isDeleting === true and refuses to close.
       */

      this.isDeleting = false;

      this.isDeleteModalOpen = false;

      this.categoryToDelete = null;

      this.deleteProductCount = 0;

      this.isCheckingProducts = false;

      await this.dialog.alert(
        `Category deleted successfully.\n\n` +
        `Products deleted: ${result.productsDeleted}`
      );

    } catch (error) {

      console.error(
        'Error deleting category:',
        error
      );

      this.isDeleting = false;

      await this.dialog.alert(
        'Failed to delete category. Please try again.'
      );
    }
  }
}