import { Routes } from '@angular/router';

import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { ProductsComponent } from './shared/components/ecommerce/products/products.component';
import { CategoryChartComponent } from './shared/components/ecommerce/category-chart/category-chart.component';
import { AddProductComponent } from './shared/components/ecommerce/products/add-product/add-product.component';
import { CategoriesComponent } from './shared/components/ecommerce/categories/categories.component';
import { AddCategoryComponent } from './shared/components/ecommerce/categories/add-category/add-category.component';
import { SuppliersComponent } from './shared/components/ecommerce/suppliers/suppliers.component';
import { AddSupplierComponent } from './shared/components/ecommerce/suppliers/add-supplier/add-supplier.component';
import { WarehousesComponent } from './shared/components/ecommerce/warehouses/warehouses.component';
import { AddWarehouseComponent } from './shared/components/ecommerce/warehouses/add-warehouse/add-warehouse.component';

export const routes: Routes = [

  // Root URL → Login
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // Dashboard Layout
  {
    path: '',
    component: AppLayoutComponent,

    children: [

      // Dashboard
      {
        path: 'dashboard',
        component: EcommerceComponent,
      },
      // Categories
      {
        path: 'categories',
        component: CategoriesComponent,
      },
      {
        path: 'categories/add-category',
        component: AddCategoryComponent,
      },

      // Products
      {
        path: 'products',
         component: ProductsComponent,
      },
      {
        path: 'products/add-product',
        component: AddProductComponent,
      },

      // Category Chart
      {
        path: 'category-chart',
        component: CategoryChartComponent,
      },

      // Suppliers
      {
        path: 'suppliers',
        component: SuppliersComponent,
      },
      {
        path: 'suppliers/add-supplier',
        component: AddSupplierComponent,
      },
      // Warehouses
      {
        path: 'warehouses',
        component: WarehousesComponent,
      },
      {
        path: 'warehouses/add-warehouse',
        component: AddWarehouseComponent,
      },

    ]
  },

  // Login Page
  {
    path: 'login',
    component: SignInComponent,
  },

  // Not Found Page
  {
    path: '**',
    component: NotFoundComponent,
  },

];