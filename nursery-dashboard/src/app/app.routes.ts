import { Routes } from '@angular/router';

import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';

import { ProductsComponent } from './shared/components/ecommerce/products/products.component';
import { AddProductComponent } from './shared/components/ecommerce/products/add-product/add-product.component';

import { PrintBarcodesComponent } from './shared/components/ecommerce/barcodes/print-barcodes/print-barcodes.component';

import { CategoriesComponent } from './shared/components/ecommerce/categories/categories.component';
import { AddCategoryComponent } from './shared/components/ecommerce/categories/add-category/add-category.component';

import { SuppliersComponent } from './shared/components/ecommerce/suppliers/suppliers.component';
import { AddSupplierComponent } from './shared/components/ecommerce/suppliers/add-supplier/add-supplier.component';

import { WarehousesComponent } from './shared/components/ecommerce/warehouses/warehouses.component';
import { AddWarehouseComponent } from './shared/components/ecommerce/warehouses/add-warehouse/add-warehouse.component';

import { PurchasesComponent } from './shared/components/ecommerce/purchases/purchases.component';
import { AddPurchaseComponent } from './shared/components/ecommerce/purchases/add-purchase/add-purchase.component';

import { StockTransfersComponent } from './shared/components/ecommerce/stock-transfers/stock-transfers.component';
import { AddStockTransferComponent } from './shared/components/ecommerce/stock-transfers/add-stock-transfer/add-stock-transfer.component';

import { StockAdjustmentsComponent } from './shared/components/ecommerce/stock-adjustments/stock-adjustments.component';
import { AddStockAdjustmentComponent } from './shared/components/ecommerce/stock-adjustments/add-stock-adjustment/add-stock-adjustment.component';

import { SalesComponent } from './shared/components/ecommerce/sales/sales.component';
import { CreateSaleComponent } from './shared/components/ecommerce/sales/create-sale/create-sale.component';




export const routes: Routes = [

  // =======================================================
  // ROOT URL → LOGIN
  // =======================================================

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },


  // =======================================================
  // DASHBOARD LAYOUT
  // =======================================================

  {
    path: '',
    component: AppLayoutComponent,

    children: [

      // ===================================================
      // CATEGORIES
      // ===================================================

      {
        path: 'categories',
        component: CategoriesComponent,
      },

      {
        path: 'categories/add-category',
        component: AddCategoryComponent,
      },


      // ===================================================
      // PRODUCTS
      // ===================================================

      {
        path: 'products',
        component: ProductsComponent,
      },

      {
        path: 'products/add-product',
        component: AddProductComponent,
      },

      {
        path: 'products/print-barcodes',
        component: PrintBarcodesComponent,
      },


      // ===================================================
      // SUPPLIERS
      // ===================================================

      {
        path: 'suppliers',
        component: SuppliersComponent,
      },

      {
        path: 'suppliers/add-supplier',
        component: AddSupplierComponent,
      },


      // ===================================================
      // WAREHOUSES
      // ===================================================

      {
        path: 'warehouses',
        component: WarehousesComponent,
      },

      {
        path: 'warehouses/add-warehouse',
        component: AddWarehouseComponent,
      },


      // ===================================================
      // PURCHASES
      // ===================================================

      {
        path: 'purchases',
        component: PurchasesComponent,
      },

      {
        path: 'purchases/add-purchase',
        component: AddPurchaseComponent,
      },


      // ===================================================
      // STOCK TRANSFERS
      // ===================================================

      {
        path: 'stock-transfers',
        component: StockTransfersComponent,
      },

      {
        path: 'stock-transfers/add-stock-transfer',
        component: AddStockTransferComponent,
      },


      // ===================================================
      // STOCK ADJUSTMENTS
      // ===================================================

      {
        path: 'stock-adjustments',
        component: StockAdjustmentsComponent,
      },

      {
        path: 'stock-adjustments/add-stock-adjustment',
        component: AddStockAdjustmentComponent,
      },

      // ===================================================
      // SALES
      // ===================================================
          
      {
        path: 'sales',
        component: SalesComponent,
      },
      
      {
        path: 'sales/create-sale',
        component: CreateSaleComponent,
      },

    ]
  },


  // =======================================================
  // LOGIN
  // =======================================================

  {
    path: 'login',
    component: SignInComponent,
  },


  // =======================================================
  // NOT FOUND
  // =======================================================

  {
    path: '**',
    component: NotFoundComponent,
  },

];