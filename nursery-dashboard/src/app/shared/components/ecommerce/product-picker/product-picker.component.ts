import { CommonModule } from '@angular/common';

import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  DestroyRef,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ProductService } from '../../../../services/product.service';

import { InventoryService } from '../../../../services/inventory.service';


// How many of a supplier's products are listed straight away.
const SUPPLIER_LIST_LIMIT = 300;

// How many suggestions are shown for a warehouse before typing.
const SUGGESTION_COUNT = 20;

// How many rows the dropdown shows at once.
const MAX_ROWS = 50;

const DROPDOWN_HEIGHT = 260;


// =========================================================
// PRODUCT PICKER
// =========================================================
//
// One reusable "find a product" dropdown for every screen that
// picks products. It never loads the whole catalogue.
//
// Two modes:
//
//   1. With a supplier (supplierId is set): the supplier's products
//      are listed as soon as the box is clicked, and typing narrows
//      the list. One read per product of that supplier, shared by
//      all rows for 2 minutes. If a supplier has more than 300
//      products it falls back to search.
//
//   2. With a warehouse (warehouseId is set, no supplier): clicking the
//      box suggests up to 20 products that are in that warehouse
//      (with onlyInStock, only those with stock), each showing its
//      quantity. About 40 reads. Typing searches ALL products, as below.
//
//   3. Without a supplier: type 2 or more letters and the server
//      finds products whose name has a word starting with it
//      ("ro" finds "Red Rose"). At most about 60 reads per search.
//      A barcode (typed or scanned, e.g. GN-12345678) is looked up
//      exactly: 1 read.
//
// The dropdown floats above the page, so it is never cut off by
// tables or cards around it.
//
// Usage:
//
//   <app-product-picker
//     [selectedName]="item.productName"
//     [supplierId]="purchase.supplierId"
//     (productSelected)="onPicked(item, $event)">
//   </app-product-picker>
//
// =========================================================

@Component({
  selector: 'app-product-picker',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './product-picker.component.html'
})
export class ProductPickerComponent
  implements OnChanges {

  private readonly productService = inject(ProductService);

  private readonly inventoryService = inject(InventoryService);

  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('box') private box?: ElementRef<HTMLInputElement>;


  constructor() {

    // The dropdown is positioned from the box, so close it when the
    // page (or any scroll area behind it) scrolls, rather than leave
    // it floating in the wrong place. Scrolling inside the dropdown
    // list itself is fine.
    const onScroll = (event: Event) => {

      if (
        this.isOpen &&
        !this.host.nativeElement.contains(event.target as Node)
      ) {

        this.isOpen = false;

        this.text = this.selectedName ?? '';

      }

    };

    document.addEventListener('scroll', onScroll, true);

    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('scroll', onScroll, true)
    );

  }


  // Name of the product currently chosen (shown in the box).
  @Input() selectedName = '';

  // Only show products of this supplier (optional).
  @Input() supplierId = '';

  @Input() placeholder =
    'Search by name or scan barcode...';

  @Input() disabled = false;

  // Suggest products of this warehouse when the box is clicked
  // (optional; ignored when a supplier is set).
  @Input() warehouseId = '';

  // With warehouseId: suggest only products that have stock.
  @Input() onlyInStock = false;

  // Inactive products are hidden unless this is true.
  @Input() includeInactive = false;


  @Output() productSelected =
    new EventEmitter<any>();


  text = '';

  results: any[] = [];

  isOpen = false;

  isSearching = false;

  message = '';

  // Small grey line above the suggestions.
  hint = '';

  activeIndex = -1;


  // Warehouse suggestions, once loaded (with the stock quantity).
  private suggestions: any[] = [];

  private suggestionsKey = '';

  private suggestionsAt = 0;

  // Supplier mode: the supplier's products, once loaded.
  private supplierProducts: any[] | null = null;

  private supplierTooLarge = false;

  private loadedForSupplier = '';

  private searchTimer: ReturnType<typeof setTimeout> | null =
    null;

  // Ignores answers from older searches.
  private searchId = 0;


  ngOnChanges(changes: SimpleChanges) {

    if (changes['selectedName']) {

      this.text = this.selectedName ?? '';

    }

    if (changes['warehouseId'] || changes['onlyInStock']) {

      this.suggestions = [];

      this.suggestionsKey = '';

      this.results = [];

      this.isOpen = false;

    }

    if (changes['supplierId'] && !changes['supplierId'].firstChange) {

      this.supplierProducts = null;

      this.supplierTooLarge = false;

      this.loadedForSupplier = '';

      this.results = [];

      this.isOpen = false;

    }

  }


  // =======================================================
  // WHERE THE DROPDOWN SITS
  // =======================================================
  //
  // Placed with fixed positioning from the box's position, so no
  // table, card or scroll area can cut it off. Opens upwards when
  // there is no room below.
  //

  private get rect(): DOMRect | null {

    return this.box?.nativeElement.getBoundingClientRect() ?? null;

  }

  get opensUpwards(): boolean {

    const rect = this.rect;

    return (
      !!rect &&
      window.innerHeight - rect.bottom < DROPDOWN_HEIGHT &&
      rect.top > DROPDOWN_HEIGHT
    );

  }

  get dropdownLeft(): number {

    return this.rect?.left ?? 0;

  }

  get dropdownWidth(): number {

    return Math.max(this.rect?.width ?? 0, 260);

  }

  get dropdownTop(): number | null {

    const rect = this.rect;

    return rect && !this.opensUpwards ? rect.bottom + 4 : null;

  }

  get dropdownBottom(): number | null {

    const rect = this.rect;

    return rect && this.opensUpwards
      ? window.innerHeight - rect.top + 4
      : null;

  }


  // =======================================================
  // MODE
  // =======================================================

  private get supplierMode(): boolean {

    return !!this.supplierId && !this.supplierTooLarge;

  }


  private async ensureSupplierProducts() {

    if (
      !this.supplierId ||
      this.loadedForSupplier === this.supplierId
    ) {

      return;

    }

    const supplierId = this.supplierId;

    this.isSearching = true;

    try {

      const list =
        await this.productService.getProductsBySupplier(
          supplierId,
          SUPPLIER_LIST_LIMIT
        );

      if (supplierId !== this.supplierId) {

        return;

      }

      this.supplierTooLarge = list.length > SUPPLIER_LIST_LIMIT;

      this.supplierProducts = list;

      this.loadedForSupplier = supplierId;

    } catch (error) {

      console.error('Could not load supplier products:', error);

      this.supplierProducts = null;

      this.message = 'Could not load products. Please try again.';

    } finally {

      this.isSearching = false;

    }

  }


  private get suggestionMode(): boolean {

    return !this.supplierId && !!this.warehouseId;

  }


  // Up to 20 products stocked in the warehouse, with their quantity.
  private async showSuggestions() {

    const key = `${this.warehouseId}|${this.onlyInStock}`;

    const fresh =
      this.suggestionsKey === key &&
      Date.now() - this.suggestionsAt < 60 * 1000;

    if (!fresh) {

      this.isSearching = true;

      try {

        const records =
          await this.inventoryService.getInventoryPreview(
            this.warehouseId,
            this.onlyInStock,
            SUGGESTION_COUNT
          );

        const products =
          await this.productService.getProductsByIds(
            records.map(record => record.productId)
          );

        const byId = new Map(
          products.map(product => [product.id, product])
        );

        this.suggestions = records
          .map(record => {

            const product = byId.get(record.productId);

            return product
              ? { ...product, stockHere: Number(record.quantity ?? 0) }
              : null;

          })
          .filter(
            (product): product is any =>
              !!product &&
              (this.includeInactive || product.isActive !== false)
          )
          .sort((a, b) =>
            String(a.name ?? '').localeCompare(String(b.name ?? ''))
          );

        this.suggestionsKey = key;

        this.suggestionsAt = Date.now();

      } catch (error) {

        console.error('Could not load suggestions:', error);

        this.suggestions = [];

      } finally {

        this.isSearching = false;

      }

    }

    // The user may have started typing while this loaded.
    if (this.text.trim() !== '' && this.text !== this.selectedName) {

      return;

    }

    this.results = this.suggestions;

    this.hint =
      this.suggestions.length > 0
        ? 'Type a name or scan a barcode to search all products.'
        : 'Type 2 letters of a name, or scan a barcode.';

    this.message =
      this.suggestions.length === 0 ? this.hint : '';

    this.activeIndex = this.results.length > 0 ? 0 : -1;

  }


  // Filters the supplier's products in the browser (no reads).
  private filterSupplierProducts(term: string) {

    const words = term.toLowerCase().split(/\s+/).filter(Boolean);

    const list = (this.supplierProducts ?? []).filter(product =>
      this.includeInactive || product.isActive !== false
    );

    const matches =
      words.length === 0
        ? list
        : list.filter(product => {

            const name = String(product.name ?? '').toLowerCase();

            const barcode = String(product.barcode ?? '').toLowerCase();

            return words.every(
              word => name.includes(word) || barcode.includes(word)
            );

          });

    this.results = matches.slice(0, MAX_ROWS);

    this.message =
      this.results.length === 0
        ? 'No products found for this supplier.'
        : '';

    this.activeIndex = this.results.length > 0 ? 0 : -1;

  }


  // =======================================================
  // TYPING
  // =======================================================

  async onFocus(event: FocusEvent) {

    (event.target as HTMLInputElement).select();

    if (this.supplierId) {

      this.isOpen = true;

      await this.ensureSupplierProducts();

      if (this.supplierMode) {

        // Show everything when the box still holds a chosen name.
        this.filterSupplierProducts(
          this.text === this.selectedName ? '' : this.text
        );

      }

      return;

    }

    if (this.suggestionMode) {

      this.isOpen = true;

      if (this.text === '' || this.text === this.selectedName) {

        await this.showSuggestions();

      }

      return;

    }

    if (this.results.length > 0) {

      this.isOpen = true;

    }

  }


  async onInput(value: string) {

    this.text = value;

    this.activeIndex = -1;

    if (this.searchTimer) {

      clearTimeout(this.searchTimer);

    }

    const term = value.trim();

    // ----- supplier mode: instant, in the browser -----

    if (this.supplierId && this.supplierMode) {

      this.isOpen = true;

      await this.ensureSupplierProducts();

      if (this.supplierMode) {

        this.filterSupplierProducts(term);

        return;

      }

    }

    // ----- server search -----

    if (term.length === 0 && this.suggestionMode) {

      this.searchId++;

      this.isOpen = true;

      await this.showSuggestions();

      return;

    }

    if (term.length < 2) {

      this.searchId++;

      this.results = [];

      this.hint = '';

      this.isSearching = false;

      this.message =
        term.length === 0
          ? ''
          : 'Type at least 2 letters.';

      this.isOpen = term.length > 0;

      return;

    }

    this.isOpen = true;

    this.isSearching = true;

    this.searchTimer = setTimeout(
      () => this.runSearch(term),
      250
    );

  }


  onKeydown(event: KeyboardEvent) {

    if (event.key === 'ArrowDown') {

      event.preventDefault();

      this.isOpen = true;

      this.activeIndex = Math.min(
        this.activeIndex + 1,
        this.results.length - 1
      );

    } else if (event.key === 'ArrowUp') {

      event.preventDefault();

      this.activeIndex = Math.max(
        this.activeIndex - 1,
        0
      );

    } else if (event.key === 'Escape') {

      this.isOpen = false;

    } else if (event.key === 'Enter') {

      // Enter is also how a barcode scanner finishes a scan,
      // so never let it submit a surrounding form.
      event.preventDefault();

      this.onEnter();

    }

  }


  private async onEnter() {

    if (this.searchTimer) {

      clearTimeout(this.searchTimer);

      this.searchTimer = null;

    }

    const term = this.text.trim();

    if (this.activeIndex >= 0 && this.results[this.activeIndex]) {

      this.choose(this.results[this.activeIndex]);

      return;

    }

    if (!term) {

      return;

    }

    if (this.supplierMode && this.supplierProducts) {

      this.filterSupplierProducts(term);

      if (this.results.length === 1) {

        this.choose(this.results[0]);

      }

      return;

    }

    // Search now (no waiting) and take the only / first match.
    await this.runSearch(term);

    if (this.results.length === 1 || this.looksLikeBarcode(term)) {

      if (this.results[0]) {

        this.choose(this.results[0]);

      }

    }

  }


  // =======================================================
  // SERVER SEARCH
  // =======================================================

  private looksLikeBarcode(term: string): boolean {

    return /^gn-?\d+$/i.test(term) || /^\d{6,}$/.test(term);

  }


  private normalizeBarcode(term: string): string {

    const digits = term.replace(/^gn-?/i, '');

    return `GN-${digits}`;

  }


  private async runSearch(term: string) {

    const id = ++this.searchId;

    this.isSearching = true;

    try {

      let found: any[] = [];

      if (this.looksLikeBarcode(term)) {

        const product =
          await this.productService.findProductByBarcode(
            this.normalizeBarcode(term)
          );

        if (
          product &&
          (!this.supplierId ||
            product.supplierId === this.supplierId)
        ) {

          found = [product];

        }

      } else {

        found = await this.productService.searchProducts(
          term,
          { supplierId: this.supplierId || undefined }
        );

      }

      if (id !== this.searchId) {

        return;

      }

      this.hint = '';

      this.results = found.filter(
        product =>
          this.includeInactive ||
          product.isActive !== false
      );

      this.message =
        this.results.length === 0
          ? this.looksLikeBarcode(term)
            ? 'No product with this barcode.'
            : 'No products found.'
          : '';

      this.activeIndex = this.results.length > 0 ? 0 : -1;

    } catch (error) {

      if (id !== this.searchId) {

        return;

      }

      console.error('Product search failed:', error);

      this.results = [];

      this.message =
        'Search failed. Please try again.';

    } finally {

      if (id === this.searchId) {

        this.isSearching = false;

      }

    }

  }


  // =======================================================
  // CHOOSE
  // =======================================================

  choose(product: any) {

    this.text = product.name ?? '';

    this.isOpen = false;

    this.results = [];

    this.productSelected.emit(product);

  }


  clear() {

    this.text = '';

    this.results = [];

    this.isOpen = false;

    this.message = '';

    this.productSelected.emit(null);

  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {

    if (
      !this.host.nativeElement.contains(event.target as Node)
    ) {

      this.isOpen = false;

      // Put the chosen name back if the user typed but did not pick.
      this.text = this.selectedName ?? '';

    }

  }

}
