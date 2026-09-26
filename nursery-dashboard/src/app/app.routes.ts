import { Routes } from '@angular/router';

import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { ProductsComponent } from './shared/components/ecommerce/products/products.component';
import { CategoryChartComponent } from './shared/components/ecommerce/category-chart/category-chart.component';
import { AddProductComponent } from './shared/components/ecommerce/products/add-product/add-product.component';

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