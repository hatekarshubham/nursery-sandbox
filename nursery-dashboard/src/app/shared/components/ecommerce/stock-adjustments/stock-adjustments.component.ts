import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { Subscription } from 'rxjs';

import { LIST_PAGE_SIZE } from '../../../../services/list-page';

import {
  StockAdjustment,
  StockAdjustmentService
} from '../../../../services/stock-adjustment.service';


@Component({
  selector: 'app-stock-adjustments',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './stock-adjustments.component.html',

  styleUrl:
    './stock-adjustments.component.css'
})
export class StockAdjustmentsComponent
  implements OnInit, OnDestroy {


  // =======================================================
  // STOCK ADJUSTMENTS
  // =======================================================

  stockAdjustments:
    StockAdjustment[] = [];


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


  // =======================================================
  // DETAILS MODAL
  // =======================================================

  selectedAdjustment:
    StockAdjustment | null = null;


  // =======================================================
  // SUBSCRIPTIONS
  // =======================================================

  private subscription =
    new Subscription();


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(
    private stockAdjustmentService:
      StockAdjustmentService
  ) {}


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadStockAdjustments();

  }


  // =======================================================
  // LOAD STOCK ADJUSTMENTS
  // =======================================================

  private loadStockAdjustments() {

    this.listSubscription?.unsubscribe();

    this.isLoading = true;

    this.errorMessage = '';


    const adjustmentSubscription =
      this.stockAdjustmentService
        .getStockAdjustments(this.limitCount)
        .subscribe({

          next: (adjustments) => {

            // =============================================
            // NEWEST FIRST
            // =============================================

            this.stockAdjustments =
              [...adjustments].sort(
                (a, b) =>
                  this.getDateValue(
                    b.createdAt
                  ) -
                  this.getDateValue(
                    a.createdAt
                  )
              );


            this.hasMore =
              this.stockAdjustments.length >= this.limitCount;

            this.isLoading = false;

          },


          error: (error) => {

            console.error(
              'Error loading stock adjustments:',
              error
            );


            this.stockAdjustments = [];


            this.errorMessage =
              'Failed to load stock adjustments.';


            this.isLoading = false;

          }

        });


    this.listSubscription = adjustmentSubscription;

    this.subscription.add(
      adjustmentSubscription
    );

  }


  // =======================================================
  // OPEN DETAILS
  // =======================================================

  openAdjustmentDetails(
    adjustment: StockAdjustment
  ) {

    this.selectedAdjustment =
      adjustment;

  }


  // =======================================================
  // CLOSE DETAILS
  // =======================================================

  closeAdjustmentDetails() {

    this.selectedAdjustment =
      null;

  }


  // =======================================================
  // FORMAT ADJUSTMENT DATE
  // =======================================================

  formatAdjustmentDate(
    adjustmentDate: any
  ): string {

    if (!adjustmentDate) {

      return '-';

    }


    // =====================================================
    // YYYY-MM-DD
    // =====================================================

    if (
      typeof adjustmentDate ===
      'string'
    ) {

      const parts =
        adjustmentDate.split('-');


      if (
        parts.length === 3
      ) {

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

      }


      return adjustmentDate;

    }


    // =====================================================
    // FIRESTORE TIMESTAMP
    // =====================================================

    if (
      typeof adjustmentDate?.toDate ===
      'function'
    ) {

      return this.formatDate(
        adjustmentDate.toDate()
      );

    }


    // =====================================================
    // JAVASCRIPT DATE
    // =====================================================

    if (
      adjustmentDate instanceof Date
    ) {

      return this.formatDate(
        adjustmentDate
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
  // GET CREATED DATE VALUE
  // =======================================================

  private getDateValue(
    value: any
  ): number {

    if (!value) {

      return 0;

    }


    // =====================================================
    // FIRESTORE TIMESTAMP
    // =====================================================

    if (
      typeof value?.toDate ===
      'function'
    ) {

      return value
        .toDate()
        .getTime();

    }


    // =====================================================
    // JAVASCRIPT DATE
    // =====================================================

    if (
      value instanceof Date
    ) {

      return value.getTime();

    }


    // =====================================================
    // STRING
    // =====================================================

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
  get filteredStockAdjustments(): StockAdjustment[] {

    const term = this.searchText.trim().toLowerCase();

    if (!term) {

      return this.stockAdjustments;

    }

    return this.stockAdjustments.filter(adjustment =>
      [
        adjustment.productName,
        adjustment.warehouseName,
        adjustment.reason,
        adjustment.notes
      ].some(value =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );

  }


  loadMore(): void {

    this.limitCount += LIST_PAGE_SIZE;

    this.loadStockAdjustments();

  }


  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}