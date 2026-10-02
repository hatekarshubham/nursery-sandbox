import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { Subscription } from 'rxjs';

import {
  StockAdjustment,
  StockAdjustmentService
} from '../../../../services/stock-adjustment.service';


@Component({
  selector: 'app-stock-adjustments',

  standalone: true,

  imports: [
    CommonModule
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

    this.isLoading = true;

    this.errorMessage = '';


    const adjustmentSubscription =
      this.stockAdjustmentService
        .getStockAdjustments()
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

  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}