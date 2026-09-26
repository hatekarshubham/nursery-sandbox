import { Routes } from '@angular/router';

import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { CalenderComponent } from './pages/calender/calender.component';
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

      // Ecommerce
      {
        path: 'ecommerce',
        component: EcommerceComponent,
      },
      {
        path: 'products',
         component: ProductsComponent,
      },
      {
        path: 'products/add-product',
        component: AddProductComponent,
      },
      {
        path: 'category-chart',
        component: CategoryChartComponent,
      },

      // Calendar
      {
        path: 'calendar',
        component: CalenderComponent,
      },

      // Profile
      {
        path: 'profile',
        component: ProfileComponent,
      },

      // Form Elements
      {
        path: 'form-elements',
        component: FormElementsComponent,
      },

      // Basic Tables
      {
        path: 'basic-tables',
        component: BasicTablesComponent,
      },

      // Blank
      {
        path: 'blank',
        component: BlankComponent,
      },

      // Invoice
      {
        path: 'invoice',
        component: InvoicesComponent,
      },

      // Line Chart
      {
        path: 'line-chart',
        component: LineChartComponent,
      },

      // Bar Chart
      {
        path: 'bar-chart',
        component: BarChartComponent,
      },

      // Alerts
      {
        path: 'alerts',
        component: AlertsComponent,
      },

      // Avatars
      {
        path: 'avatars',
        component: AvatarElementComponent,
      },

      // Badges
      {
        path: 'badge',
        component: BadgesComponent,
      },

      // Buttons
      {
        path: 'buttons',
        component: ButtonsComponent,
      },

      // Images
      {
        path: 'images',
        component: ImagesComponent,
      },

      // Videos
      {
        path: 'videos',
        component: VideosComponent,
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