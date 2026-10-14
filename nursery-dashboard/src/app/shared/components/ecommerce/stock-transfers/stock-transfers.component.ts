import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { LIST_PAGE_SIZE } from '../../../../services/list-page';

import {
  StockTransfer,
  StockTransferService
} from '../../../../services/stock-transfer.service';


@Component({
  selector: 'app-stock-transfers',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],

  templateUrl: './stock-transfers.component.html',

  styleUrl: './stock-transfers.component.css'
})
export class StockTransfersComponent
  implements OnInit, OnDestroy {


  // =======================================================
  // STOCK TRANSFERS
  // =======================================================

  stockTransfers: StockTransfer[] = [];


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

  selectedTransfer:
    StockTransfer | null = null;


  // =======================================================
  // SUBSCRIPTIONS
  // =======================================================

  private subscription =
    new Subscription();


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(
    private stockTransferService:
      StockTransferService
  ) {}


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadStockTransfers();

  }


  // =======================================================
  // LOAD STOCK TRANSFERS
  // =======================================================

  private loadStockTransfers() {

    this.listSubscription?.unsubscribe();

    this.isLoading = true;

    this.errorMessage = '';


    const stockTransferSubscription =
      this.stockTransferService
        .getStockTransfers(this.limitCount)
        .subscribe({

          next: (transfers) => {

            // =============================================
            // NEWEST TRANSFER FIRST
            // =============================================

            this.stockTransfers =
              [...transfers].sort(
                (a, b) =>
                  this.getDateValue(
                    b.createdAt
                  ) -
                  this.getDateValue(
                    a.createdAt
                  )
              );


            this.hasMore =
              this.stockTransfers.length >= this.limitCount;

            this.isLoading = false;

          },


          error: (error) => {

            console.error(
              'Error loading stock transfers:',
              error
            );


            this.stockTransfers = [];


            this.errorMessage =
              'Failed to load stock transfers.';


            this.isLoading = false;

          }

        });


    this.listSubscription = stockTransferSubscription;

    this.subscription.add(
      stockTransferSubscription
    );

  }


  // =======================================================
  // OPEN TRANSFER DETAILS
  // =======================================================

  openTransferDetails(
    transfer: StockTransfer
  ) {

    this.selectedTransfer =
      transfer;

  }


  // =======================================================
  // CLOSE TRANSFER DETAILS
  // =======================================================

  closeTransferDetails() {

    this.selectedTransfer =
      null;

  }


  // =======================================================
  // FORMAT TRANSFER DATE
  // =======================================================

  formatTransferDate(
    transferDate: any
  ): string {

    if (!transferDate) {

      return '-';

    }


    // =====================================================
    // YYYY-MM-DD
    // =====================================================

    if (
      typeof transferDate === 'string'
    ) {

      const parts =
        transferDate.split('-');


      if (
        parts.length === 3
      ) {

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

      }


      return transferDate;

    }


    // =====================================================
    // FIRESTORE TIMESTAMP
    // =====================================================

    if (
      typeof transferDate?.toDate ===
      'function'
    ) {

      return this.formatDate(
        transferDate.toDate()
      );

    }


    // =====================================================
    // JAVASCRIPT DATE
    // =====================================================

    if (
      transferDate instanceof Date
    ) {

      return this.formatDate(
        transferDate
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
  get filteredStockTransfers(): StockTransfer[] {

    const term = this.searchText.trim().toLowerCase();

    if (!term) {

      return this.stockTransfers;

    }

    return this.stockTransfers.filter(transfer =>
      [
        transfer.productName,
        transfer.fromWarehouseName,
        transfer.toWarehouseName,
        transfer.notes
      ].some(value =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );

  }


  loadMore(): void {

    this.limitCount += LIST_PAGE_SIZE;

    this.loadStockTransfers();

  }


  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}