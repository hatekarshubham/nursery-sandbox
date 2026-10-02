import { CommonModule } from '@angular/common';

import {
  AfterViewChecked,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import JsBarcode from 'jsbarcode';

import {
  ProductService
} from '../../../../../services/product.service';


// =========================================================
// BARCODE PRODUCT
// =========================================================

interface BarcodeProduct {

  id: string;

  name: string;

  category: string;

  barcode: string;

  unitPrice: number;

  isActive: boolean;


  // =======================================================
  // PRINT SELECTION
  // =======================================================

  selected: boolean;

  labelQuantity: number;

}


// =========================================================
// PRINT LABEL
// =========================================================

interface BarcodePrintLabel {

  renderId: string;

  productId: string;

  productName: string;

  category: string;

  barcode: string;

  unitPrice: number;

}


// =========================================================
// LABEL SHEET SETTINGS
// =========================================================

interface LabelSheetSettings {

  // =======================================================
  // PAGE
  // =======================================================

  pageWidthMm: number;

  pageHeightMm: number;


  // =======================================================
  // GRID
  // =======================================================

  columns: number;

  rows: number;


  // =======================================================
  // LABEL SIZE
  // =======================================================

  labelWidthMm: number;

  labelHeightMm: number;


  // =======================================================
  // GAPS
  // =======================================================

  horizontalGapMm: number;

  verticalGapMm: number;


  // =======================================================
  // PAGE MARGINS
  // =======================================================

  marginTopMm: number;

  marginRightMm: number;

  marginBottomMm: number;

  marginLeftMm: number;


  // =======================================================
  // START POSITION
  // =======================================================

  startPosition: number;

}


// =========================================================
// COMPONENT
// =========================================================

@Component({

  selector: 'app-print-barcodes',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './print-barcodes.component.html',

  styleUrl:
    './print-barcodes.component.css'

})
export class PrintBarcodesComponent
  implements OnInit, OnDestroy, AfterViewChecked {


  // =======================================================
  // PRODUCTS
  // =======================================================

  products: BarcodeProduct[] = [];


  // =======================================================
  // SEARCH
  // =======================================================

  searchText = '';


  // =======================================================
  // LOADING
  // =======================================================

  isLoading = true;

  errorMessage = '';


  // =======================================================
  // PREVIEW
  // =======================================================

  isPreviewOpen = false;


  // =======================================================
  // GENERATED PRINT LABELS
  // =======================================================

  printLabels:
    BarcodePrintLabel[] = [];


  // =======================================================
  // LABEL SHEET SETTINGS
  // =======================================================

  labelSettings: LabelSheetSettings = {

    pageWidthMm: 210,

    pageHeightMm: 297,


    // Grid

    columns: 3,

    rows: 7,


    // Label size

    labelWidthMm: 60,

    labelHeightMm: 38,


    // Gaps

    horizontalGapMm: 3,

    verticalGapMm: 3,


    // Margins

    marginTopMm: 10,

    marginRightMm: 10,

    marginBottomMm: 10,

    marginLeftMm: 10,


    // Start from first label

    startPosition: 1

  };


  // =======================================================
  // LABEL SETTINGS ERROR
  // =======================================================

  labelSettingsError = '';


  // =======================================================
  // BARCODE RENDER FLAG
  // =======================================================

  private shouldRenderBarcodes =
    false;


  // =======================================================
  // SUBSCRIPTIONS
  // =======================================================

  private subscription =
    new Subscription();


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

  constructor(

    private productService:
      ProductService

  ) {}


  // =======================================================
  // INIT
  // =======================================================

  ngOnInit() {

    this.loadProducts();

    this.validateLabelSettings();

  }


  // =======================================================
  // AFTER VIEW CHECKED
  // =======================================================

  ngAfterViewChecked() {

    if (
      !this.shouldRenderBarcodes
    ) {

      return;

    }


    this.shouldRenderBarcodes =
      false;


    this.renderBarcodes();

  }


  // =======================================================
  // LOAD PRODUCTS
  // =======================================================

  private loadProducts() {

    this.isLoading = true;

    this.errorMessage = '';


    const productsSubscription =

      this.productService
        .getProducts()
        .subscribe({

          next: (products: any[]) => {

            this.products =
              products

                .filter(
                  product =>
                    product.isActive !== false
                )

                .map(
                  product => ({

                    id:
                      product.id ?? '',

                    name:
                      product.name ?? '',

                    category:
                      product.category ?? '',

                    barcode:
                      product.barcode ?? '',

                    unitPrice:
                      Number(
                        product.unitPrice ?? 0
                      ),

                    isActive:
                      product.isActive !== false,

                    selected:
                      false,

                    labelQuantity:
                      1

                  })
                )

                .sort(
                  (a, b) =>
                    a.name.localeCompare(
                      b.name
                    )
                );


            this.isLoading =
              false;


            console.log(
              'Barcode products loaded:',
              this.products
            );

          },


          error: (error) => {

            console.error(
              'Error loading products for barcode printing:',
              error
            );


            this.products = [];


            this.errorMessage =
              'Failed to load products.';


            this.isLoading =
              false;

          }

        });


    this.subscription.add(
      productsSubscription
    );

  }


  // =======================================================
  // FILTERED PRODUCTS
  // =======================================================

  get filteredProducts():
    BarcodeProduct[] {

    const search =
      this.searchText
        .trim()
        .toLowerCase();


    if (!search) {

      return this.products;

    }


    return this.products.filter(
      product =>

        product.name
          .toLowerCase()
          .includes(search) ||

        product.category
          .toLowerCase()
          .includes(search) ||

        product.barcode
          .toLowerCase()
          .includes(search)

    );

  }


  // =======================================================
  // CAN SELECT PRODUCT
  // =======================================================

  canSelectProduct(
    product: BarcodeProduct
  ): boolean {

    return !!product.barcode;

  }


  // =======================================================
  // PRODUCT SELECTION CHANGE
  // =======================================================

  onProductSelectionChange(
    product: BarcodeProduct
  ) {

    if (
      !this.canSelectProduct(
        product
      )
    ) {

      product.selected =
        false;

      return;

    }


    if (!product.selected) {

      product.labelQuantity =
        1;

    }

  }


  // =======================================================
  // SELECT ALL
  // =======================================================

  toggleSelectAll(
    checked: boolean
  ) {

    this.filteredProducts
      .forEach(
        product => {

          if (
            this.canSelectProduct(
              product
            )
          ) {

            product.selected =
              checked;


            if (
              checked &&
              (
                !product.labelQuantity ||
                product.labelQuantity < 1
              )
            ) {

              product.labelQuantity =
                1;

            }

          }

        }
      );

  }


  // =======================================================
  // ALL SELECTED
  // =======================================================

  get allSelected():
    boolean {

    const selectableProducts =
      this.filteredProducts.filter(
        product =>
          this.canSelectProduct(
            product
          )
      );


    if (
      selectableProducts.length === 0
    ) {

      return false;

    }


    return selectableProducts.every(
      product =>
        product.selected
    );

  }


  // =======================================================
  // SELECTED PRODUCTS
  // =======================================================

  get selectedProducts():
    BarcodeProduct[] {

    return this.products.filter(
      product =>
        product.selected &&
        this.canSelectProduct(
          product
        )
    );

  }


  // =======================================================
  // SELECTED PRODUCT COUNT
  // =======================================================

  get selectedProductCount():
    number {

    return this.selectedProducts.length;

  }


  // =======================================================
  // TOTAL LABELS
  // =======================================================

  get totalLabels():
    number {

    return this.selectedProducts
      .reduce(
        (
          total,
          product
        ) => {

          const quantity =
            Number(
              product.labelQuantity ?? 0
            );


          if (
            !Number.isFinite(
              quantity
            ) ||
            quantity <= 0
          ) {

            return total;

          }


          return (
            total +
            Math.floor(
              quantity
            )
          );

        },
        0
      );

  }


  // =======================================================
  // QUANTITY CHANGE
  // =======================================================

  onQuantityChange(
    product: BarcodeProduct
  ) {

    let quantity =
      Number(
        product.labelQuantity
      );


    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity < 1
    ) {

      quantity = 1;

    }


    product.labelQuantity =
      Math.floor(
        quantity
      );

  }


  // =======================================================
  // INCREASE QUANTITY
  // =======================================================

  increaseQuantity(
    product: BarcodeProduct
  ) {

    product.labelQuantity =
      Number(
        product.labelQuantity ?? 0
      ) + 1;

  }


  // =======================================================
  // DECREASE QUANTITY
  // =======================================================

  decreaseQuantity(
    product: BarcodeProduct
  ) {

    const currentQuantity =
      Number(
        product.labelQuantity ?? 1
      );


    product.labelQuantity =
      Math.max(
        1,
        currentQuantity - 1
      );

  }


  // =======================================================
  // CLEAR SELECTION
  // =======================================================

  clearSelection() {

    this.products.forEach(
      product => {

        product.selected =
          false;

        product.labelQuantity =
          1;

      }
    );


    this.printLabels = [];


    this.isPreviewOpen =
      false;

  }


  // =======================================================
  // LABELS PER PAGE
  // =======================================================

  get labelsPerPage():
    number {

    const columns =
      Math.floor(
        Number(
          this.labelSettings.columns
        )
      );


    const rows =
      Math.floor(
        Number(
          this.labelSettings.rows
        )
      );


    if (
      columns <= 0 ||
      rows <= 0
    ) {

      return 0;

    }


    return columns * rows;

  }


  // =======================================================
  // REQUIRED SHEET WIDTH
  // =======================================================

  get requiredSheetWidthMm():
    number {

    const settings =
      this.labelSettings;


    const columns =
      Math.max(
        1,
        Math.floor(
          Number(
            settings.columns
          )
        )
      );


    return (

      Number(
        settings.marginLeftMm
      ) +

      (
        columns *
        Number(
          settings.labelWidthMm
        )
      ) +

      (
        (columns - 1) *
        Number(
          settings.horizontalGapMm
        )
      ) +

      Number(
        settings.marginRightMm
      )

    );

  }


  // =======================================================
  // REQUIRED SHEET HEIGHT
  // =======================================================

  get requiredSheetHeightMm():
    number {

    const settings =
      this.labelSettings;


    const rows =
      Math.max(
        1,
        Math.floor(
          Number(
            settings.rows
          )
        )
      );


    return (

      Number(
        settings.marginTopMm
      ) +

      (
        rows *
        Number(
          settings.labelHeightMm
        )
      ) +

      (
        (rows - 1) *
        Number(
          settings.verticalGapMm
        )
      ) +

      Number(
        settings.marginBottomMm
      )

    );

  }


  // =======================================================
  // AVAILABLE PAGE WIDTH
  // =======================================================

  get availablePageWidthMm():
    number {

    return (

      Number(
        this.labelSettings.pageWidthMm
      ) -

      Number(
        this.labelSettings.marginLeftMm
      ) -

      Number(
        this.labelSettings.marginRightMm
      )

    );

  }


  // =======================================================
  // AVAILABLE PAGE HEIGHT
  // =======================================================

  get availablePageHeightMm():
    number {

    return (

      Number(
        this.labelSettings.pageHeightMm
      ) -

      Number(
        this.labelSettings.marginTopMm
      ) -

      Number(
        this.labelSettings.marginBottomMm
      )

    );

  }


  // =======================================================
  // GRID WIDTH
  // =======================================================

  get gridWidthMm():
    number {

    const columns =
      Math.max(
        1,
        Math.floor(
          Number(
            this.labelSettings.columns
          )
        )
      );


    return (

      (
        columns *
        Number(
          this.labelSettings.labelWidthMm
        )
      ) +

      (
        (columns - 1) *
        Number(
          this.labelSettings.horizontalGapMm
        )
      )

    );

  }


  // =======================================================
  // GRID HEIGHT
  // =======================================================

  get gridHeightMm():
    number {

    const rows =
      Math.max(
        1,
        Math.floor(
          Number(
            this.labelSettings.rows
          )
        )
      );


    return (

      (
        rows *
        Number(
          this.labelSettings.labelHeightMm
        )
      ) +

      (
        (rows - 1) *
        Number(
          this.labelSettings.verticalGapMm
        )
      )

    );

  }


  // =======================================================
  // UNUSED WIDTH
  // =======================================================

  get unusedWidthMm():
    number {

    return (

      Number(
        this.labelSettings.pageWidthMm
      ) -

      this.requiredSheetWidthMm

    );

  }


  // =======================================================
  // UNUSED HEIGHT
  // =======================================================

  get unusedHeightMm():
    number {

    return (

      Number(
        this.labelSettings.pageHeightMm
      ) -

      this.requiredSheetHeightMm

    );

  }


  // =======================================================
  // EMPTY LABELS BEFORE START
  // =======================================================

  get startingEmptyLabels():
    number {

    const startPosition =
      Math.floor(
        Number(
          this.labelSettings.startPosition
        )
      );


    if (
      startPosition <= 1
    ) {

      return 0;

    }


    return startPosition - 1;

  }


  // =======================================================
  // FIRST PAGE AVAILABLE LABELS
  // =======================================================

  get firstPageAvailableLabels():
    number {

    return Math.max(

      0,

      this.labelsPerPage -
      this.startingEmptyLabels

    );

  }


  // =======================================================
  // TOTAL PAGES
  // =======================================================

  get totalPages():
    number {

    if (
      this.printLabels.length === 0 ||
      this.labelsPerPage <= 0
    ) {

      return 0;

    }


    const occupiedPositions =

      this.startingEmptyLabels +
      this.printLabels.length;


    return Math.ceil(

      occupiedPositions /
      this.labelsPerPage

    );

  }


  // =======================================================
  // CAN PRINT
  // =======================================================

  get canPrint():
    boolean {

    return (

      this.printLabels.length > 0 &&
      !this.labelSettingsError

    );

  }


  // =======================================================
  // SETTINGS CHANGE
  // =======================================================

  onLabelSettingsChange() {

    this.validateLabelSettings();


    if (
      this.isPreviewOpen &&
      this.printLabels.length > 0
    ) {

      this.shouldRenderBarcodes =
        true;

    }

  }


  // =======================================================
  // VALIDATE SETTINGS
  // =======================================================

  validateLabelSettings():
    boolean {

    this.labelSettingsError = '';


    const settings =
      this.labelSettings;


    if (
      !Number.isFinite(
        Number(
          settings.pageWidthMm
        )
      ) ||
      Number(
        settings.pageWidthMm
      ) <= 0
    ) {

      this.labelSettingsError =
        'Page width must be greater than 0 mm.';

      return false;

    }


    if (
      !Number.isFinite(
        Number(
          settings.pageHeightMm
        )
      ) ||
      Number(
        settings.pageHeightMm
      ) <= 0
    ) {

      this.labelSettingsError =
        'Page height must be greater than 0 mm.';

      return false;

    }


    if (
      !Number.isInteger(
        Number(
          settings.columns
        )
      ) ||
      Number(
        settings.columns
      ) < 1
    ) {

      this.labelSettingsError =
        'Columns must be a whole number greater than 0.';

      return false;

    }


    if (
      !Number.isInteger(
        Number(
          settings.rows
        )
      ) ||
      Number(
        settings.rows
      ) < 1
    ) {

      this.labelSettingsError =
        'Rows must be a whole number greater than 0.';

      return false;

    }


    if (
      !Number.isFinite(
        Number(
          settings.labelWidthMm
        )
      ) ||
      Number(
        settings.labelWidthMm
      ) <= 0
    ) {

      this.labelSettingsError =
        'Label width must be greater than 0 mm.';

      return false;

    }


    if (
      !Number.isFinite(
        Number(
          settings.labelHeightMm
        )
      ) ||
      Number(
        settings.labelHeightMm
      ) <= 0
    ) {

      this.labelSettingsError =
        'Label height must be greater than 0 mm.';

      return false;

    }


    if (
      !Number.isFinite(
        Number(
          settings.horizontalGapMm
        )
      ) ||
      Number(
        settings.horizontalGapMm
      ) < 0
    ) {

      this.labelSettingsError =
        'Horizontal gap cannot be negative.';

      return false;

    }


    if (
      !Number.isFinite(
        Number(
          settings.verticalGapMm
        )
      ) ||
      Number(
        settings.verticalGapMm
      ) < 0
    ) {

      this.labelSettingsError =
        'Vertical gap cannot be negative.';

      return false;

    }


    const margins = [

      Number(
        settings.marginTopMm
      ),

      Number(
        settings.marginRightMm
      ),

      Number(
        settings.marginBottomMm
      ),

      Number(
        settings.marginLeftMm
      )

    ];


    if (
      margins.some(
        margin =>
          !Number.isFinite(
            margin
          ) ||
          margin < 0
      )
    ) {

      this.labelSettingsError =
        'Page margins must be valid numbers and cannot be negative.';

      return false;

    }


    if (
      this.requiredSheetWidthMm >
      Number(
        settings.pageWidthMm
      )
    ) {

      this.labelSettingsError =

        `The configured labels require ` +
        `${this.requiredSheetWidthMm.toFixed(2)} mm width, ` +
        `but the page width is only ` +
        `${Number(settings.pageWidthMm).toFixed(2)} mm.`;

      return false;

    }


    if (
      this.requiredSheetHeightMm >
      Number(
        settings.pageHeightMm
      )
    ) {

      this.labelSettingsError =

        `The configured labels require ` +
        `${this.requiredSheetHeightMm.toFixed(2)} mm height, ` +
        `but the page height is only ` +
        `${Number(settings.pageHeightMm).toFixed(2)} mm.`;

      return false;

    }


    if (
      !Number.isInteger(
        Number(
          settings.startPosition
        )
      ) ||
      Number(
        settings.startPosition
      ) < 1
    ) {

      this.labelSettingsError =
        'Start position must be a whole number starting from 1.';

      return false;

    }


    if (
      Number(
        settings.startPosition
      ) >
      this.labelsPerPage
    ) {

      this.labelSettingsError =

        `Start position cannot be greater than ` +
        `${this.labelsPerPage}, because the configured ` +
        `sheet contains ${this.labelsPerPage} labels per page.`;

      return false;

    }


    return true;

  }


  // =======================================================
  // RESET SETTINGS
  // =======================================================

  resetLabelSettings() {

    this.labelSettings = {

      pageWidthMm: 210,

      pageHeightMm: 297,

      columns: 3,

      rows: 7,

      labelWidthMm: 60,

      labelHeightMm: 38,

      horizontalGapMm: 3,

      verticalGapMm: 3,

      marginTopMm: 10,

      marginRightMm: 10,

      marginBottomMm: 10,

      marginLeftMm: 10,

      startPosition: 1

    };


    this.validateLabelSettings();


    if (
      this.isPreviewOpen &&
      this.printLabels.length > 0
    ) {

      this.shouldRenderBarcodes =
        true;

    }

  }


  // =======================================================
  // PREVIEW BARCODES
  // =======================================================

  previewBarcodes() {

    if (
      this.selectedProducts.length === 0
    ) {

      alert(
        'Please select at least one product.'
      );

      return;

    }


    const invalidQuantity =
      this.selectedProducts.find(
        product =>
          !Number.isInteger(
            Number(
              product.labelQuantity
            )
          ) ||
          Number(
            product.labelQuantity
          ) < 1
      );


    if (invalidQuantity) {

      alert(
        `Please enter a valid label quantity for ${invalidQuantity.name}.`
      );

      return;

    }


    this.validateLabelSettings();


    const generatedLabels:
      BarcodePrintLabel[] = [];


    this.selectedProducts
      .forEach(
        product => {

          const quantity =
            Math.floor(
              Number(
                product.labelQuantity
              )
            );


          for (
            let copyNumber = 1;
            copyNumber <= quantity;
            copyNumber++
          ) {

            generatedLabels.push({

              renderId:
                `${product.id}-${copyNumber}`,

              productId:
                product.id,

              productName:
                product.name,

              category:
                product.category,

              barcode:
                product.barcode,

              unitPrice:
                product.unitPrice

            });

          }

        }
      );


    this.printLabels =
      generatedLabels;


    this.isPreviewOpen =
      true;


    this.shouldRenderBarcodes =
      true;


    console.log(
      'Products selected for barcode printing:',
      this.selectedProducts
    );


    console.log(
      'Generated barcode labels:',
      this.printLabels
    );


    console.log(
      'Total labels:',
      this.printLabels.length
    );


    console.log(
      'Label sheet settings:',
      this.labelSettings
    );


    console.log(
      'Labels per page:',
      this.labelsPerPage
    );


    console.log(
      'Required sheet width:',
      this.requiredSheetWidthMm,
      'mm'
    );


    console.log(
      'Required sheet height:',
      this.requiredSheetHeightMm,
      'mm'
    );


    console.log(
      'Estimated pages:',
      this.totalPages
    );

  }


  // =======================================================
  // RENDER BARCODES
  // =======================================================

  private renderBarcodes() {

    this.printLabels
      .forEach(
        label => {

          const elementId =
            this.getBarcodeElementId(
              label.renderId
            );


          const element =
            document.getElementById(
              elementId
            );


          if (!element) {

            console.warn(
              'Barcode SVG element not found:',
              elementId
            );

            return;

          }


          try {

            JsBarcode(
              element,
              label.barcode,
              {

                format:
                  'CODE128',

                width:
                  1.5,

                height:
                  45,

                displayValue:
                  false,

                margin:
                  0

              }
            );

          }

          catch (error) {

            console.error(
              `Failed to render barcode ${label.barcode}:`,
              error
            );

          }

        }
      );

  }


  // =======================================================
  // BARCODE ELEMENT ID
  // =======================================================

  getBarcodeElementId(
    renderId: string
  ): string {

    const safeId =
      renderId.replace(
        /[^a-zA-Z0-9_-]/g,
        '-'
      );


    return (
      `barcode-${safeId}`
    );

  }


  // =======================================================
  // CLOSE PREVIEW
  // =======================================================

  closePreview() {

    this.isPreviewOpen =
      false;

  }


  // =======================================================
  // ESCAPE HTML FOR PRINT DOCUMENT
  // =======================================================

  private escapePrintHtml(
    value: string
  ): string {

    return String(
      value ?? ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  }


  // =======================================================
  // PRINT BARCODES
  // =======================================================

  printBarcodes() {

    // =====================================================
    // CHECK LABELS
    // =====================================================

    if (
      this.printLabels.length === 0
    ) {

      alert(
        'There are no barcode labels to print.'
      );

      return;

    }


    // =====================================================
    // VALIDATE SETTINGS
    // =====================================================

    if (
      !this.validateLabelSettings()
    ) {

      alert(
        this.labelSettingsError
      );

      return;

    }


    // =====================================================
    // RENDER CURRENT PREVIEW
    // =====================================================

    this.renderBarcodes();


    // =====================================================
    // CREATE CLEAN PRINT WINDOW
    // =====================================================

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=1000,height=800'
      );


    if (!printWindow) {

      alert(
        'Unable to open print window. Please allow pop-ups for this site.'
      );

      return;

    }


    // =====================================================
    // CREATE LABEL HTML
    // =====================================================

    const labelsHtml =
      this.printLabels
        .map(
          label => {

            const barcodeElement =
              document.getElementById(
                this.getBarcodeElementId(
                  label.renderId
                )
              );


            const barcodeSvg =
              barcodeElement
                ? barcodeElement.outerHTML
                : '';


            const productName =
              this.escapePrintHtml(
                label.productName
              );


            const category =
              this.escapePrintHtml(
                label.category
              );


            const barcode =
              this.escapePrintHtml(
                label.barcode
              );


            return `

              <div class="barcode-label">

                <div class="nursery-name">
                  Gayatri Nursery
                </div>


                <div class="product-name">
                  ${productName}
                </div>


                ${
                  category
                    ? `
                      <div class="category">
                        ${category}
                      </div>
                    `
                    : ''
                }


                <div class="barcode-container">

                  ${barcodeSvg}

                </div>


                <div class="barcode-value">
                  ${barcode}
                </div>


                <div class="price">
                  ₹${Number(
                    label.unitPrice
                  ).toFixed(2)}
                </div>

              </div>

            `;

          }
        )
        .join('');


    // =====================================================
    // EMPTY POSITIONS
    // =====================================================

    const emptyLabelsHtml =
      Array.from(
        {
          length:
            this.startingEmptyLabels
        }
      )
        .map(
          () => `

            <div class="empty-label"></div>

          `
        )
        .join('');


    // =====================================================
    // SETTINGS
    // =====================================================

    const settings =
      this.labelSettings;


    const pageWidth =
      Number(
        settings.pageWidthMm
      );


    const pageHeight =
      Number(
        settings.pageHeightMm
      );


    const labelWidth =
      Number(
        settings.labelWidthMm
      );


    const labelHeight =
      Number(
        settings.labelHeightMm
      );


    const horizontalGap =
      Number(
        settings.horizontalGapMm
      );


    const verticalGap =
      Number(
        settings.verticalGapMm
      );


    const marginTop =
      Number(
        settings.marginTopMm
      );


    const marginRight =
      Number(
        settings.marginRightMm
      );


    const marginBottom =
      Number(
        settings.marginBottomMm
      );


    const marginLeft =
      Number(
        settings.marginLeftMm
      );


    const columns =
      Number(
        settings.columns
      );


    // =====================================================
    // CLEAN PRINT DOCUMENT
    // =====================================================

    printWindow.document.open();


    printWindow.document.write(`

      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8">


          <title>
            Gayatri Nursery
          </title>


          <style>

            @page {

              size:
                ${pageWidth}mm
                ${pageHeight}mm;

              margin: 0;

            }


            * {

              box-sizing: border-box;

            }


            html,
            body {

              margin: 0;

              padding: 0;

              width: 100%;

              background: #ffffff;

              color: #000000;

              font-family:
                Arial,
                Helvetica,
                sans-serif;

            }


            body {

              -webkit-print-color-adjust:
                exact;

              print-color-adjust:
                exact;

            }


            /* =========================================== */
            /* LABEL SHEET */
            /* =========================================== */

            .label-sheet {

              width:
                ${pageWidth}mm;

              min-height:
                ${pageHeight}mm;

              padding:
                ${marginTop}mm
                ${marginRight}mm
                ${marginBottom}mm
                ${marginLeft}mm;

              display: grid;

              grid-template-columns:
                repeat(
                  ${columns},
                  ${labelWidth}mm
                );

              grid-auto-rows:
                ${labelHeight}mm;

              column-gap:
                ${horizontalGap}mm;

              row-gap:
                ${verticalGap}mm;

              align-content: start;

              justify-content: start;

            }


            /* =========================================== */
            /* LABEL */
            /* =========================================== */

            .barcode-label {

              width:
                ${labelWidth}mm;

              height:
                ${labelHeight}mm;

              overflow: hidden;

              padding: 2mm;

              display: flex;

              flex-direction: column;

              align-items: center;

              justify-content: center;

              text-align: center;

              page-break-inside:
                avoid;

              break-inside:
                avoid;

            }


            /* =========================================== */
            /* EMPTY POSITION */
            /* =========================================== */

            .empty-label {

              width:
                ${labelWidth}mm;

              height:
                ${labelHeight}mm;

            }


            /* =========================================== */
            /* GAYATRI NURSERY */
            /* =========================================== */

            .nursery-name {

              width: 100%;

              margin-bottom: 1mm;

              font-size: 10pt;

              line-height: 1.1;

              font-weight: 700;

              color: #166534;

              white-space: nowrap;

              overflow: hidden;

              text-overflow: ellipsis;

            }


            /* =========================================== */
            /* PRODUCT NAME */
            /* =========================================== */

            .product-name {

              width: 100%;

              font-size: 9pt;

              line-height: 1.1;

              font-weight: 700;

              white-space: nowrap;

              overflow: hidden;

              text-overflow: ellipsis;

            }


            /* =========================================== */
            /* CATEGORY */
            /* =========================================== */

            .category {

              width: 100%;

              margin-top: 0.6mm;

              font-size: 7pt;

              line-height: 1;

              color: #555555;

              white-space: nowrap;

              overflow: hidden;

              text-overflow: ellipsis;

            }


            /* =========================================== */
            /* BARCODE */
            /* =========================================== */

            .barcode-container {

              width: 100%;

              height: 13mm;

              margin-top: 1.2mm;

              display: flex;

              align-items: center;

              justify-content: center;

              overflow: hidden;

            }


            .barcode-container svg {

              display: block;

              width: auto;

              max-width: 100%;

              height: 12mm;

            }


            /* =========================================== */
            /* BARCODE VALUE */
            /* =========================================== */

            .barcode-value {

              width: 100%;

              margin-top: 0.6mm;

              font-family:
                "Courier New",
                monospace;

              font-size: 7.5pt;

              line-height: 1;

              font-weight: 700;

              letter-spacing: 0.2px;

              white-space: nowrap;

              overflow: hidden;

            }


            /* =========================================== */
            /* PRICE */
            /* =========================================== */

            .price {

              margin-top: 0.8mm;

              font-size: 9pt;

              line-height: 1;

              font-weight: 700;

            }


            /* =========================================== */
            /* PRINT */
            /* =========================================== */

            @media print {

              html,
              body {

                margin: 0 !important;

                padding: 0 !important;

              }


              .label-sheet {

                margin: 0 !important;

              }

            }

          </style>

        </head>


        <body>

          <div class="label-sheet">

            ${emptyLabelsHtml}

            ${labelsHtml}

          </div>


          <script>

            window.onload =
              function () {

                setTimeout(
                  function () {

                    window.focus();

                    window.print();

                  },
                  300
                );

              };


            window.onafterprint =
              function () {

                window.close();

              };

          <\/script>

        </body>

      </html>

    `);


    printWindow.document.close();

  }


  // =======================================================
  // DESTROY
  // =======================================================

  ngOnDestroy() {

    this.subscription
      .unsubscribe();

  }

}