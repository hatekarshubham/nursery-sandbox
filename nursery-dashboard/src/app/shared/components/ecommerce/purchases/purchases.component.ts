import { CommonModule } from '@angular/common';

import { RoleService } from '../../../../services/role.service';
import { FormsModule } from '@angular/forms';

import {
  Component,
  OnDestroy,
  OnInit,
  inject} from '@angular/core';
import { AppDialogService } from '../../../services/app-dialog.service';

import { RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { LIST_PAGE_SIZE } from '../../../../services/list-page';

import {
  Purchase,
  PurchaseService
} from '../../../../services/purchase.service';


@Component({
  selector: 'app-purchases',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],

  templateUrl: './purchases.component.html',

  styleUrl: './purchases.component.css'
})
export class PurchasesComponent
  implements OnInit, OnDestroy {

  readonly roles = inject(RoleService);

  private readonly dialog = inject(AppDialogService);



  // =======================================================
  // PURCHASES
  // =======================================================

  purchases: Purchase[] = [];


  // =======================================================
  // STATE
  // =======================================================

  isLoading = true;

  // How many newest records are loaded; "Load older" raises it.
  limitCount = LIST_PAGE_SIZE;

  hasMore = false;

  // Search box text
  searchText = '';

  private listSubscription?: Subscription;

  errorMessage = '';

  processingPurchaseId:
    string | null = null;


  // =======================================================
  // SUBSCRIPTION
  // =======================================================

  private subscription =
    new Subscription();


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(
    private purchaseService: PurchaseService
  ) {}


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadPurchases();

  }


  // =======================================================
  // LOAD PURCHASES
  // =======================================================

  private loadPurchases() {

    this.listSubscription?.unsubscribe();

    this.isLoading = true;

    this.errorMessage = '';


    const purchaseSubscription =
      this.purchaseService
        .getPurchases(this.limitCount)
        .subscribe({

          next: (purchases) => {

            // Newest purchase first.

            this.purchases =
              [...purchases].sort(
                (a, b) =>
                  this.getDateValue(
                    b.createdAt
                  ) -
                  this.getDateValue(
                    a.createdAt
                  )
              );


            this.hasMore =
              this.purchases.length >= this.limitCount;

            this.isLoading = false;

          },


          error: (error) => {

            console.error(
              'Error loading purchases:',
              error
            );


            this.purchases = [];

            this.errorMessage =
              'Failed to load purchases.';


            this.isLoading = false;

          }

        });


    this.listSubscription = purchaseSubscription;

    this.subscription.add(
      purchaseSubscription
    );

  }


  // =======================================================
  // COMPLETE PURCHASE
  // =======================================================
  //
  // Only PENDING purchases can be completed.
  //
  // Completing the purchase will:
  //
  // 1. Increase inventory
  // 2. Change status to COMPLETED
  //
  // PurchaseService performs both operations
  // inside one Firestore transaction.
  //
  // =======================================================

  async completePurchase(
    purchase: Purchase
  ) {

    if (
      !purchase.id
    ) {

      await this.dialog.alert(
        'Purchase ID is missing.'
      );

      return;

    }


    if (
      purchase.status !==
      'PENDING'
    ) {

      await this.dialog.alert(
        'Only pending purchases can be completed.'
      );

      return;

    }


    if (
      this.processingPurchaseId
    ) {

      return;

    }


    const confirmed =
      await this.dialog.confirm(
        'Complete this purchase?\n\n' +
        'The purchased quantities will be added to inventory.'
      );


    if (!confirmed) {

      return;

    }


    this.processingPurchaseId =
      purchase.id;


    try {

      await this.purchaseService
        .completePurchase(
          purchase.id
        );


      await this.dialog.alert(
        'Purchase completed successfully. Inventory has been updated.'
      );

    }


    catch (error: any) {

      console.error(
        'Error completing purchase:',
        error
      );


      await this.dialog.alert(
        error?.message ??
        'Failed to complete purchase.'
      );

    }


    finally {

      this.processingPurchaseId =
        null;

    }

  }


  // =======================================================
  // CANCEL PURCHASE
  // =======================================================
  //
  // Only PENDING purchases can be cancelled.
  //
  // Cancelling does NOT change inventory.
  //
  // =======================================================

  async cancelPurchase(
    purchase: Purchase
  ) {

    if (
      !purchase.id
    ) {

      await this.dialog.alert(
        'Purchase ID is missing.'
      );

      return;

    }


    if (
      purchase.status !==
      'PENDING'
    ) {

      await this.dialog.alert(
        'Only pending purchases can be cancelled.'
      );

      return;

    }


    if (
      this.processingPurchaseId
    ) {

      return;

    }


    const confirmed =
      await this.dialog.confirm(
        'Cancel this purchase?\n\n' +
        'Inventory will not be changed.'
      );


    if (!confirmed) {

      return;

    }


    this.processingPurchaseId =
      purchase.id;


    try {

      await this.purchaseService
        .cancelPurchase(
          purchase.id
        );


      await this.dialog.alert(
        'Purchase cancelled successfully.'
      );

    }


    catch (error: any) {

      console.error(
        'Error cancelling purchase:',
        error
      );


      await this.dialog.alert(
        error?.message ??
        'Failed to cancel purchase.'
      );

    }


    finally {

      this.processingPurchaseId =
        null;

    }

  }


  // =======================================================
  // CHECK IF PURCHASE IS PROCESSING
  // =======================================================

  isProcessing(
    purchase: Purchase
  ): boolean {

    return !!purchase.id &&
      this.processingPurchaseId ===
        purchase.id;

  }


  // =======================================================
  // GET ITEM COUNT
  // =======================================================

  getItemCount(
    purchase: Purchase
  ): number {

    return purchase.items?.length ?? 0;

  }


  // =======================================================
  // GET TOTAL QUANTITY
  // =======================================================

  getTotalQuantity(
    purchase: Purchase
  ): number {

    if (
      !purchase.items
    ) {

      return 0;

    }


    return purchase.items.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ?? 0
        ),
      0
    );

  }


  // =======================================================
  // PURCHASE DATE DISPLAY
  // =======================================================

  formatPurchaseDate(
    purchaseDate: any
  ): string {

    if (!purchaseDate) {

      return '-';

    }


    // -----------------------------------------------------
    // Current purchase form stores YYYY-MM-DD.
    // -----------------------------------------------------

    if (
      typeof purchaseDate === 'string'
    ) {

      const parts =
        purchaseDate.split('-');


      if (
        parts.length === 3
      ) {

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

      }


      return purchaseDate;

    }


    // -----------------------------------------------------
    // Firestore Timestamp support
    // -----------------------------------------------------

    if (
      typeof purchaseDate?.toDate ===
      'function'
    ) {

      return this.formatDate(
        purchaseDate.toDate()
      );

    }


    // -----------------------------------------------------
    // JS Date support
    // -----------------------------------------------------

    if (
      purchaseDate instanceof Date
    ) {

      return this.formatDate(
        purchaseDate
      );

    }


    return '-';

  }


  // =======================================================
  // FORMAT DATE
  // =======================================================

  private formatDate(
    date: Date
  ): string {

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const year =
      date.getFullYear();


    return `${day}/${month}/${year}`;

  }


  // =======================================================
  // GET DATE VALUE FOR SORTING
  // =======================================================

  private getDateValue(
    value: any
  ): number {

    if (!value) {

      return 0;

    }


    // -----------------------------------------------------
    // Firestore Timestamp
    // -----------------------------------------------------

    if (
      typeof value?.toDate ===
      'function'
    ) {

      return value
        .toDate()
        .getTime();

    }


    // -----------------------------------------------------
    // JavaScript Date
    // -----------------------------------------------------

    if (
      value instanceof Date
    ) {

      return value.getTime();

    }


    // -----------------------------------------------------
    // String
    // -----------------------------------------------------

    if (
      typeof value === 'string'
    ) {

      const date =
        new Date(value);


      return Number.isNaN(
        date.getTime()
      )
        ? 0
        : date.getTime();

    }


    return 0;

  }


  // =======================================================
  // DESTROY
  // =======================================================


  // Searches the records already loaded (the newest ones), so it
  // costs no extra reads. "Load older" brings more into the search.
  get filteredPurchases(): Purchase[] {

    const term = this.searchText.trim().toLowerCase();

    if (!term) {

      return this.purchases;

    }

    return this.purchases.filter(purchase =>
      [
        purchase.supplierName,
        purchase.invoiceNumber,
        purchase.warehouseName,
        purchase.notes,
        ...(purchase.items ?? []).map(item => item.productName)
      ].some(value =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );

  }


  loadMore(): void {

    this.limitCount += LIST_PAGE_SIZE;

    this.loadPurchases();

  }


  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}