import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Category, CategoryService } from '../../../../services/category.service';

@Component({
  selector: 'app-categories',
  imports: [CommonModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {

  categories: Category[] = [];

  isLoading = true;

  constructor(
    private categoryService: CategoryService
  ) {}

  ngOnInit() {

    this.categoryService.getCategories().subscribe({

      next: (categories) => {

        this.categories = categories;

        this.isLoading = false;

        console.log(
          'Categories loaded:',
          categories
        );

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

}