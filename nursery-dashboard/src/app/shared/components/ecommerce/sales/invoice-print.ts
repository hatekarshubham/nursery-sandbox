// Opens a clean window with one invoice and the browser print dialog.
// The sale is already saved. This does not change stock or the invoice number.
// The preview stays open so Print can be used again if the printer fails.

export interface InvoicePrintInput {

  invoiceNumber: string;
  createdAt: Date;
  customerName: string;
  customerMobile: string;
  warehouseName: string;
  items: {
    productName: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    gst: number;
    gstAmount: number;
    subtotal: number;
    total: number;
  }[];
  subtotal: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  paymentMode: string;

}

export async function printInvoiceDocument(
  input: InvoicePrintInput
): Promise<void> {
  

    const invoice = input;


    // ===================================================
    // CREATE PRODUCT ROWS
    // ===================================================

    const productRows =
      invoice.items
        .map(
          (
            item,
            index
          ) => {

            return `
              <tr>

                <td class="serial">
                  ${index + 1}
                </td>

                <td class="product">

                  <div class="product-name">
                    ${escapeHtml(
                      item.productName
                    )}
                  </div>

                  ${
                    item.barcode
                      ? `
                        <div class="barcode">
                          ${escapeHtml(
                            item.barcode
                          )}
                        </div>
                      `
                      : ''
                  }

                </td>

                <td class="center">
                  ${item.quantity}
                </td>

                <td class="right">
                  ₹${formatMoney(
                    item.unitPrice
                  )}
                </td>

                <td class="right">

                  ₹${formatMoney(
                    item.gstAmount
                  )}

                  <div class="gst-percent">
                    ${item.gst}%
                  </div>

                </td>

                <td class="right amount">
                  ₹${formatMoney(
                    item.total
                  )}
                </td>

              </tr>
            `;

          }
        )
        .join('');


    // ===================================================
    // CUSTOMER NAME
    // ===================================================

    const customerName =
      invoice.customerName
        ? escapeHtml(
            invoice.customerName
          )
        : 'Walk-in Customer';


    // ===================================================
    // CUSTOMER MOBILE
    // ===================================================

    const customerMobile =
      invoice.customerMobile
        ? escapeHtml(
            invoice.customerMobile
          )
        : '-';


    // ===================================================
    // OPEN CLEAN PRINT WINDOW
    // ===================================================

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=900,height=900'
      );


    if (!printWindow) {

      throw new Error(
        'Unable to open print window. Please allow pop-ups for this site.'
      );

    }


    // ===================================================
    // WRITE CLEAN INVOICE
    // ===================================================

    printWindow.document.open();


    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          ${escapeHtml(
            invoice.invoiceNumber
          )}
        </title>


        <style>

          /* ===============================================
             PAGE
             =============================================== */

          @page {

            size: A4 portrait;

            margin: 12mm;

          }


          * {

            box-sizing: border-box;

          }


          html,
          body {

            margin: 0;

            padding: 0;

            background: #ffffff;

            color: #1f2937;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

            -webkit-print-color-adjust: exact;

            print-color-adjust: exact;

          }


          body {

            padding: 0;

          }


          .invoice {

            width: 100%;

            max-width: 800px;

            margin: 0 auto;

          }


          /* ===============================================
             NURSERY HEADER
             =============================================== */

          .business-header {

            text-align: center;

            padding-bottom: 18px;

            border-bottom: 2px solid #111827;

          }


          .business-name {

            margin: 0;

            font-size: 28px;

            line-height: 1.2;

            font-weight: 700;

            letter-spacing: .2px;

            color: #111827;

          }


          .business-subtitle {

            margin-top: 6px;

            font-size: 11px;

            letter-spacing: 2.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          /* ===============================================
             SALES INVOICE
             =============================================== */

          .invoice-title {

            margin-top: 18px;

            text-align: center;

          }


          .invoice-title h2 {

            margin: 0;

            font-size: 16px;

            letter-spacing: 2px;

            color: #111827;

          }


          /* ===============================================
             INVOICE META
             =============================================== */

          .meta {

            display: grid;

            grid-template-columns:
              1fr
              1fr;

            gap: 30px;

            margin-top: 20px;

            padding: 14px 0;

            border-top: 1px solid #d1d5db;

            border-bottom: 1px solid #d1d5db;

          }


          .meta-right {

            text-align: right;

          }


          .meta-row {

            margin-bottom: 6px;

            font-size: 12px;

            line-height: 1.5;

          }


          .meta-row:last-child {

            margin-bottom: 0;

          }


          .meta-label {

            color: #6b7280;

          }


          .meta-value {

            margin-left: 6px;

            font-weight: 600;

            color: #111827;

          }


          /* ===============================================
             CUSTOMER
             =============================================== */

          .customer {

            margin-top: 18px;

            padding: 14px;

            border: 1px solid #e5e7eb;

            border-radius: 6px;

          }


          .section-label {

            margin-bottom: 10px;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: 1.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          .customer-grid {

            display: grid;

            grid-template-columns:
              1fr
              1fr;

            gap: 30px;

          }


          .customer-label {

            margin-bottom: 4px;

            font-size: 10px;

            color: #9ca3af;

          }


          .customer-value {

            font-size: 12px;

            font-weight: 600;

            color: #111827;

          }


          /* ===============================================
             PRODUCTS TABLE
             =============================================== */

          .products {

            margin-top: 22px;

          }


          table {

            width: 100%;

            border-collapse: collapse;

          }


          thead {

            display: table-header-group;

          }


          th {

            padding:
              9px
              7px;

            border-top: 1.5px solid #374151;

            border-bottom: 1.5px solid #374151;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: .5px;

            text-transform: uppercase;

            color: #4b5563;

          }


          td {

            padding:
              11px
              7px;

            border-bottom: 1px solid #e5e7eb;

            font-size: 11px;

            vertical-align: top;

          }


          tr {

            page-break-inside: avoid;

          }


          .serial {

            width: 35px;

            color: #6b7280;

          }


          .product {

            width: 36%;

          }


          .product-name {

            font-weight: 600;

            color: #111827;

          }


          .barcode {

            margin-top: 4px;

            font-size: 8px;

            font-family: monospace;

            color: #9ca3af;

          }


          .center {

            text-align: center;

          }


          .right {

            text-align: right;

            white-space: nowrap;

          }


          .amount {

            font-weight: 600;

            color: #111827;

          }


          .gst-percent {

            margin-top: 3px;

            font-size: 8px;

            color: #9ca3af;

          }


          /* ===============================================
             SUMMARY
             =============================================== */

          .summary {

            display: grid;

            grid-template-columns:
              1fr
              300px;

            gap: 50px;

            margin-top: 24px;

            page-break-inside: avoid;

          }


          .payment-title {

            margin-bottom: 6px;

            font-size: 9px;

            font-weight: 700;

            letter-spacing: 1.5px;

            text-transform: uppercase;

            color: #6b7280;

          }


          .payment-value {

            font-size: 12px;

            font-weight: 600;

            color: #111827;

          }


          .total-row {

            display: flex;

            justify-content: space-between;

            gap: 20px;

            margin-bottom: 9px;

            font-size: 11px;

          }


          .total-label {

            color: #6b7280;

          }


          .total-value {

            font-weight: 600;

            color: #111827;

          }


          .grand-total {

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            gap: 20px;

            margin-top: 12px;

            padding-top: 12px;

            border-top: 2px solid #111827;

          }


          .grand-total-label {

            font-size: 13px;

            font-weight: 700;

            color: #111827;

          }


          .grand-total-value {

            font-size: 20px;

            font-weight: 700;

            color: #111827;

          }


          /* ===============================================
             FOOTER
             =============================================== */

          .footer {

            margin-top: 45px;

            padding-top: 16px;

            border-top: 1px solid #e5e7eb;

            text-align: center;

            page-break-inside: avoid;

          }


          .thank-you {

            font-size: 12px;

            font-weight: 600;

            color: #374151;

          }


          .footer-invoice {

            margin-top: 5px;

            font-size: 9px;

            color: #9ca3af;

          }


          /* ===============================================
             PRINT
             =============================================== */

          @media print {

            html,
            body {

              width: 100%;

              margin: 0;

              padding: 0;

            }


            .invoice {

              max-width: none;

            }

          }

        </style>

      </head>


      <body>


        <div class="invoice">


          <!-- =============================================
               BUSINESS
               ============================================= -->

          <div class="business-header">

            <h1 class="business-name">
              Gayatri Nursery
            </h1>

          </div>


          <!-- =============================================
               TITLE
               ============================================= -->

          <div class="invoice-title">

            <h2>
              SALES INVOICE
            </h2>

          </div>


          <!-- =============================================
               META
               ============================================= -->

          <div class="meta">


            <div>

              <div class="meta-row">

                <span class="meta-label">
                  Invoice:
                </span>

                <span class="meta-value">
                  ${escapeHtml(
                    invoice.invoiceNumber
                  )}
                </span>

              </div>


              <div class="meta-row">

                <span class="meta-label">
                  Date:
                </span>

                <span class="meta-value">
                  ${escapeHtml(
                    formatInvoiceDate(
                      invoice.createdAt
                    )
                  )}
                </span>

              </div>

            </div>


            <div class="meta-right">

              <div class="meta-row">

                <span class="meta-label">
                  Warehouse:
                </span>

                <span class="meta-value">
                  ${
                    escapeHtml(
                      invoice.warehouseName
                    ) || '-'
                  }
                </span>

              </div>

            </div>


          </div>


          <!-- =============================================
               CUSTOMER
               ============================================= -->

          <div class="customer">

            <div class="section-label">
              Customer
            </div>


            <div class="customer-grid">


              <div>

                <div class="customer-label">
                  Name
                </div>

                <div class="customer-value">
                  ${customerName}
                </div>

              </div>


              <div>

                <div class="customer-label">
                  Mobile
                </div>

                <div class="customer-value">
                  ${customerMobile}
                </div>

              </div>


            </div>

          </div>


          <!-- =============================================
               PRODUCTS
               ============================================= -->

          <div class="products">

            <table>

              <thead>

                <tr>

                  <th style="text-align:left;">
                    #
                  </th>

                  <th style="text-align:left;">
                    Product
                  </th>

                  <th style="text-align:center;">
                    Qty
                  </th>

                  <th style="text-align:right;">
                    Rate
                  </th>

                  <th style="text-align:right;">
                    GST
                  </th>

                  <th style="text-align:right;">
                    Amount
                  </th>

                </tr>

              </thead>


              <tbody>

                ${productRows}

              </tbody>

            </table>

          </div>


          <!-- =============================================
               SUMMARY
               ============================================= -->

          <div class="summary">


            <div>

              <div class="payment-title">
                Payment
              </div>

              <div class="payment-value">
                ${escapeHtml(
                  invoice.paymentMode
                )}
              </div>

            </div>


            <div>


              <div class="total-row">

                <span class="total-label">
                  Subtotal
                </span>

                <span class="total-value">
                  ₹${formatMoney(
                    invoice.subtotal
                  )}
                </span>

              </div>


              <div class="total-row">

                <span class="total-label">
                  GST
                </span>

                <span class="total-value">
                  ₹${formatMoney(
                    invoice.gstAmount
                  )}
                </span>

              </div>


              <div class="total-row">

                <span class="total-label">
                  Discount
                </span>

                <span class="total-value">
                  - ₹${formatMoney(
                    invoice.discount
                  )}
                </span>

              </div>


              <div class="grand-total">

                <span class="grand-total-label">
                  Grand Total
                </span>

                <span class="grand-total-value">
                  ₹${formatMoney(
                    invoice.grandTotal
                  )}
                </span>

              </div>


            </div>


          </div>


          <!-- =============================================
               FOOTER
               ============================================= -->

          <div class="footer">

            <div class="thank-you">
              Thank you for your purchase!
            </div>

            <div class="footer-invoice">
              ${escapeHtml(
                invoice.invoiceNumber
              )}
            </div>

          </div>


        </div>


        <script>

          window.onload = function () {

            var closed = false;

            function finish() {

              if (closed) {

                return;

              }

              closed = true;

              window.close();

            }

            window.addEventListener(
              'afterprint',
              finish
            );

            window.focus();

            window.print();

            setTimeout(
              function () {

                window.addEventListener(
                  'focus',
                  finish
                );

                if (document.hasFocus()) {

                  finish();

                }

              },
              400
            );

          };

        </script>


      </body>

      </html>
    `);


    printWindow.document.close();

}

function formatMoney(value: number): string {

  return Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

}

function formatInvoiceDate(date: Date): string {

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

}

function escapeHtml(value: string): string {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}
