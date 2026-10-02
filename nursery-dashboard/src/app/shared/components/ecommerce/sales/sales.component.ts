import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  SalesService,
  Sale
} from '../../../../services/sales.service';


// =======================================================
// SALES COMPONENT
// =======================================================

@Component({
  selector: 'app-sales',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './sales.component.html',

  styleUrl: './sales.component.css'
})
export class SalesComponent implements OnInit {


  // =====================================================
  // SALES
  // =====================================================

  sales: Sale[] = [];


  // =====================================================
  // LOADING
  // =====================================================

  isLoading = true;

  errorMessage = '';


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private salesService: SalesService
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadSales();

  }


  // =====================================================
  // LOAD SALES
  // =====================================================

  private loadSales(): void {

    this.salesService
      .getSales()
      .subscribe({

        next: (sales) => {

          console.log(
            'Sales loaded:',
            sales
          );


          this.sales =
            [...(sales ?? [])]
              .sort(
                (
                  a,
                  b
                ) => {

                  return (
                    this.getTimestamp(
                      b.createdAt
                    ) -
                    this.getTimestamp(
                      a.createdAt
                    )
                  );

                }
              );


          this.isLoading = false;

        },


        error: (error) => {

          console.error(
            'Error loading sales:',
            error
          );


          this.errorMessage =
            'Unable to load sales history.';


          this.isLoading = false;

        }

      });

  }


  // =====================================================
  // GET TIMESTAMP
  // =====================================================

  private getTimestamp(
    value: any
  ): number {

    if (!value) {

      return 0;

    }


    // Firestore Timestamp

    if (
      typeof value.toDate ===
      'function'
    ) {

      return value
        .toDate()
        .getTime();

    }


    // JavaScript Date

    if (
      value instanceof Date
    ) {

      return value.getTime();

    }


    // Fallback

    const date =
      new Date(
        value
      );


    return Number.isNaN(
      date.getTime()
    )
      ? 0
      : date.getTime();

  }


  // =====================================================
  // FORMAT DATE
  // =====================================================

  formatDate(
    value: any
  ): string {

    if (!value) {

      return '-';

    }


    let date: Date;


    if (
      typeof value.toDate ===
      'function'
    ) {

      date =
        value.toDate();

    }

    else {

      date =
        new Date(
          value
        );

    }


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '-';

    }


    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit'
      }
    );

  }


  // =====================================================
  // TOTAL QUANTITY
  // =====================================================

  getTotalQuantity(
    sale: Sale
  ): number {

    return (
      sale.items ?? []
    ).reduce(
      (
        total,
        item
      ) => {

        return (
          total +
          Number(
            item.quantity ?? 0
          )
        );

      },
      0
    );

  }


  // =====================================================
  // PRODUCT NAMES
  // =====================================================

  getProductNames(
    sale: Sale
  ): string {

    if (
      !sale.items ||
      sale.items.length === 0
    ) {

      return '-';

    }


    return sale.items
      .map(
        item =>
          item.productName
      )
      .join(', ');

  }

}