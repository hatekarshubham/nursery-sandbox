import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  SalesService,
  Sale,
  SaleItem
} from '../../../../services/sales.service';

import {
  ProductService
} from '../../../../services/product.service';

import {
  Category,
  CategoryService
} from '../../../../services/category.service';

import {
  Supplier,
  SupplierService
} from '../../../../services/supplier.service';

import {
  Warehouse,
  WarehouseService
} from '../../../../services/warehouse.service';


type DatePreset =
  | 'today'
  | 'last7'
  | 'thisMonth'
  | 'custom';


interface ResolvedLine {

  categoryId: string;

  categoryName: string;

  supplierId: string;

  supplierName: string;

  quantity: number;

  gstAmount: number;

  total: number;

}


interface BreakdownRow {

  name: string;

  quantity: number;

  amount: number;

}


@Component({
  selector: 'app-sales',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './sales.component.html',

  styleUrl: './sales.component.css'
})
export class SalesComponent implements OnInit {


  sales: Sale[] = [];

  categories: Category[] = [];

  suppliers: Supplier[] = [];

  warehouses: Warehouse[] = [];

  isLoading = true;

  isRangeLoading = false;

  errorMessage = '';

  rangeErrorMessage = '';


  datePreset: DatePreset = 'today';

  fromDate = '';

  toDate = '';

  selectedCategory = '';

  selectedSupplier = '';

  selectedWarehouse = '';

  selectedPayment = '';


  private productById = new Map<string, any>();

  // About three months. Wider ranges are queried for the
  // screen only and are not added to this window.
  private readonly maxCacheDays = 92;

  private cacheFrom: Date | null = null;

  private cacheTo: Date | null = null;

  private extraSales: Sale[] | null = null;

  private extraFrom: Date | null = null;

  private extraTo: Date | null = null;

  private rangeRequestId = 0;

  private initialLoad: Promise<void> | null = null;


  constructor(
    private salesService: SalesService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private warehouseService: WarehouseService
  ) {}


  ngOnInit(): void {

    this.applyPreset('today');

    this.loadProducts();

    this.loadCategories();

    this.loadSuppliers();

    this.loadWarehouses();

  }


  applyPreset(
    preset: Exclude<DatePreset, 'custom'>
  ): void {

    const today = this.startOfDay(new Date());

    this.datePreset = preset;

    if (preset === 'today') {

      this.fromDate = this.toInputDate(today);

      this.toDate = this.toInputDate(today);

    } else if (preset === 'last7') {

      const from = new Date(today);

      from.setDate(from.getDate() - 6);

      this.fromDate = this.toInputDate(from);

      this.toDate = this.toInputDate(today);

    } else {

      const monthStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      this.fromDate = this.toInputDate(monthStart);

      this.toDate = this.toInputDate(today);

    }

    void this.ensureCoverage();

  }


  onFromDateInput(event: Event): void {

    this.fromDate = (event.target as HTMLInputElement).value;

    this.datePreset = 'custom';

    void this.ensureCoverage();

  }


  onToDateInput(event: Event): void {

    this.toDate = (event.target as HTMLInputElement).value;

    this.datePreset = 'custom';

    void this.ensureCoverage();

  }


  get dateRangeInvalid(): boolean {

    if (!this.fromDate || !this.toDate) {

      return false;

    }

    return this.fromDate > this.toDate;

  }


  get paymentOptions(): string[] {

    const modes = new Set<string>([
      'Cash',
      'UPI'
    ]);

    for (const sale of this.salesForCurrentRange()) {

      if (sale.paymentMode) {

        modes.add(sale.paymentMode);

      }

    }

    return [...modes];

  }


  get filteredSales(): Sale[] {

    if (this.dateRangeInvalid) {

      return [];

    }

    const from = this.parseInputDate(this.fromDate);

    const to = this.parseInputDate(this.toDate);

    if (to) {

      to.setHours(23, 59, 59, 999);

    }

    return this.salesForCurrentRange().filter(sale => {

      const timestamp = this.getTimestamp(sale.createdAt);

      if (from && timestamp < from.getTime()) {

        return false;

      }

      if (to && timestamp > to.getTime()) {

        return false;

      }

      if (
        this.selectedWarehouse &&
        sale.warehouseId !== this.selectedWarehouse
      ) {

        return false;

      }

      if (
        this.selectedPayment &&
        sale.paymentMode !== this.selectedPayment
      ) {

        return false;

      }

      return this.visibleLines(sale).length > 0;

    });

  }


  get usesLineTotals(): boolean {

    return !!(
      this.selectedCategory ||
      this.selectedSupplier
    );

  }


  get invoiceCount(): number {

    return this.filteredSales.length;

  }


  get quantitySold(): number {

    return this.filteredSales.reduce(
      (total, sale) =>
        total +
        this.visibleLines(sale).reduce(
          (lineTotal, line) =>
            lineTotal + line.quantity,
          0
        ),
      0
    );

  }


  get gstCollected(): number {

    if (!this.usesLineTotals) {

      return this.filteredSales.reduce(
        (total, sale) =>
          total + Number(sale.gstAmount ?? 0),
        0
      );

    }

    return this.sumVisible(
      line => line.gstAmount
    );

  }


  get totalSales(): number {

    if (!this.usesLineTotals) {

      return this.filteredSales.reduce(
        (total, sale) =>
          total + Number(sale.grandTotal ?? 0),
        0
      );

    }

    return this.sumVisible(
      line => line.total
    );

  }


  get categoryBreakdown(): BreakdownRow[] {

    return this.buildBreakdown(
      line => line.categoryName || 'Uncategorised'
    );

  }


  get supplierBreakdown(): BreakdownRow[] {

    return this.buildBreakdown(
      line => line.supplierName || 'No supplier'
    );

  }


  private async ensureCoverage(): Promise<void> {

    if (
      this.dateRangeInvalid ||
      !this.fromDate ||
      !this.toDate
    ) {

      return;

    }

    const requestedStart = this.parseInputDate(this.fromDate);

    const requestedEnd = this.parseInputDate(this.toDate);

    if (!requestedStart || !requestedEnd) {

      return;

    }

    requestedEnd.setHours(23, 59, 59, 999);

    const todayEnd = this.endOfDay(new Date());

    const fetchEnd =
      requestedEnd.getTime() > todayEnd.getTime()
        ? todayEnd
        : requestedEnd;

    const requestId = ++this.rangeRequestId;

    if (requestedStart.getTime() > fetchEnd.getTime()) {

      this.extraSales = [];

      this.extraFrom = requestedStart;

      this.extraTo = requestedEnd;

      this.isRangeLoading = false;

      return;

    }

    try {

      if (!this.cacheFrom || !this.cacheTo) {

        if (!this.initialLoad) {

          this.initialLoad = this.loadInitialWindow();

        }

        await this.initialLoad;

      }

      if (
        requestId !== this.rangeRequestId ||
        !this.cacheFrom ||
        !this.cacheTo
      ) {

        return;

      }

      if (
        this.rangeIsInside(
          requestedStart,
          fetchEnd,
          this.cacheFrom,
          this.cacheTo
        )
      ) {

        this.extraSales = null;

        this.extraFrom = null;

        this.extraTo = null;

        this.rangeErrorMessage = '';

        return;

      }

      const mergedStart =
        requestedStart.getTime() < this.cacheFrom.getTime()
          ? requestedStart
          : this.cacheFrom;

      const mergedEnd =
        fetchEnd.getTime() > this.cacheTo.getTime()
          ? fetchEnd
          : this.cacheTo;

      const canExtend =
        this.spanDays(mergedStart, mergedEnd) <=
        this.maxCacheDays;

      this.isRangeLoading = true;

      this.rangeErrorMessage = '';

      if (canExtend) {

        const gaps: Sale[] = [];

        if (requestedStart.getTime() < this.cacheFrom.getTime()) {

          const gapEnd = new Date(this.cacheFrom.getTime() - 1);

          gaps.push(
            ...await this.salesService.getSalesByDateRange(
              requestedStart,
              gapEnd
            )
          );

        }

        if (fetchEnd.getTime() > this.cacheTo.getTime()) {

          const gapStart = new Date(this.cacheTo.getTime() + 1);

          gaps.push(
            ...await this.salesService.getSalesByDateRange(
              gapStart,
              fetchEnd
            )
          );

        }

        if (requestId !== this.rangeRequestId) {

          return;

        }

        this.sales = this.mergeSales(this.sales, gaps);

        this.cacheFrom = mergedStart;

        this.cacheTo = mergedEnd;

        this.extraSales = null;

        this.extraFrom = null;

        this.extraTo = null;

      } else {

        const loaded =
          await this.salesService.getSalesByDateRange(
            requestedStart,
            fetchEnd
          );

        if (requestId !== this.rangeRequestId) {

          return;

        }

        this.extraSales = this.sortSales(loaded);

        this.extraFrom = requestedStart;

        this.extraTo = fetchEnd;

      }

    } catch (error) {

      if (requestId !== this.rangeRequestId) {

        return;

      }

      console.error(
        'Error loading sales for date range:',
        error
      );

      this.rangeErrorMessage =
        'Unable to load sales for this date range.';

    } finally {

      if (requestId === this.rangeRequestId) {

        this.isRangeLoading = false;

      }

    }

  }


  private async loadInitialWindow(): Promise<void> {

    this.isLoading = true;

    this.errorMessage = '';

    try {

      const start = this.initialWindowStart();

      const end = this.endOfDay(new Date());

      const loaded =
        await this.salesService.getSalesByDateRange(
          start,
          end
        );

      this.sales = this.sortSales(loaded);

      this.cacheFrom = start;

      this.cacheTo = end;

      this.isLoading = false;

    } catch (error) {

      console.error(
        'Error loading sales:',
        error
      );

      this.errorMessage =
        'Unable to load sales history.';

      this.isLoading = false;

      this.initialLoad = null;

      throw error;

    }

  }


  private salesForCurrentRange(): Sale[] {

    const requestedStart = this.parseInputDate(this.fromDate);

    const requestedEnd = this.parseInputDate(this.toDate);

    if (
      !requestedStart ||
      !requestedEnd ||
      this.dateRangeInvalid
    ) {

      return [];

    }

    requestedEnd.setHours(23, 59, 59, 999);

    const todayEnd = this.endOfDay(new Date());

    const fetchEnd =
      requestedEnd.getTime() > todayEnd.getTime()
        ? todayEnd
        : requestedEnd;

    if (requestedStart.getTime() > fetchEnd.getTime()) {

      return [];

    }

    if (
      this.extraSales &&
      this.extraFrom &&
      this.extraTo &&
      requestedStart.getTime() === this.extraFrom.getTime() &&
      fetchEnd.getTime() === this.extraTo.getTime()
    ) {

      return this.extraSales;

    }

    if (
      this.cacheFrom &&
      this.cacheTo &&
      this.rangeIsInside(
        requestedStart,
        fetchEnd,
        this.cacheFrom,
        this.cacheTo
      )
    ) {

      return this.sales;

    }

    return [];

  }


  private initialWindowStart(): Date {

    const today = this.startOfDay(new Date());

    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const last7Start = new Date(today);

    last7Start.setDate(last7Start.getDate() - 6);

    return monthStart.getTime() < last7Start.getTime()
      ? monthStart
      : last7Start;

  }


  private rangeIsInside(
    start: Date,
    end: Date,
    windowStart: Date,
    windowEnd: Date
  ): boolean {

    return (
      start.getTime() >= windowStart.getTime() &&
      end.getTime() <= windowEnd.getTime()
    );

  }


  private spanDays(
    start: Date,
    end: Date
  ): number {

    const milliseconds = end.getTime() - start.getTime();

    return Math.floor(milliseconds / 86400000) + 1;

  }


  private sortSales(
    sales: Sale[]
  ): Sale[] {

    return [...sales].sort(
      (a, b) =>
        this.getTimestamp(b.createdAt) -
        this.getTimestamp(a.createdAt)
    );

  }


  private mergeSales(
    current: Sale[],
    extra: Sale[]
  ): Sale[] {

    const byId = new Map<string, Sale>();

    for (const sale of [...current, ...extra]) {

      const key = sale.id || sale.invoiceNumber;

      byId.set(key, sale);

    }

    return this.sortSales([...byId.values()]);

  }


  private loadProducts(): void {

    this.productService
      .getProducts()
      .subscribe({

        next: (products: any[]) => {

          this.productById = new Map(
            (products ?? [])
              .filter(product => product.id)
              .map(product => [product.id, product])
          );

        },

        error: (error) => {

          console.error(
            'Error loading products for sales summary:',
            error
          );

        }

      });

  }


  private loadCategories(): void {

    this.categoryService
      .getCategories()
      .subscribe({

        next: (categories) => {

          this.categories = [...(categories ?? [])].sort(
            (a, b) =>
              a.name.localeCompare(b.name)
          );

        },

        error: (error) => {

          console.error(
            'Error loading categories:',
            error
          );

        }

      });

  }


  private loadSuppliers(): void {

    this.supplierService
      .getSuppliers()
      .subscribe({

        next: (suppliers) => {

          this.suppliers = [...(suppliers ?? [])].sort(
            (a, b) =>
              a.name.localeCompare(b.name)
          );

        },

        error: (error) => {

          console.error(
            'Error loading suppliers:',
            error
          );

        }

      });

  }


  private loadWarehouses(): void {

    this.warehouseService
      .getWarehouses()
      .subscribe({

        next: (warehouses) => {

          this.warehouses = [...(warehouses ?? [])].sort(
            (a, b) =>
              a.name.localeCompare(b.name)
          );

        },

        error: (error) => {

          console.error(
            'Error loading warehouses:',
            error
          );

        }

      });

  }


  private visibleLines(
    sale: Sale
  ): ResolvedLine[] {

    return (sale.items ?? [])
      .filter(item => this.lineMatches(item))
      .map(item => this.resolveLine(item));

  }


  private lineMatches(
    item: SaleItem
  ): boolean {

    const line = this.resolveLine(item);

    if (this.selectedCategory) {

      const category = this.categories.find(
        entry => entry.id === this.selectedCategory
      );

      const idMatches =
        line.categoryId === this.selectedCategory;

      const nameMatches =
        !!category &&
        line.categoryName === category.name;

      if (!idMatches && !nameMatches) {

        return false;

      }

    }

    if (this.selectedSupplier) {

      const supplier = this.suppliers.find(
        entry => entry.id === this.selectedSupplier
      );

      const idMatches =
        line.supplierId === this.selectedSupplier;

      const nameMatches =
        !!supplier &&
        line.supplierName === supplier.name;

      if (!idMatches && !nameMatches) {

        return false;

      }

    }

    return true;

  }


  private resolveLine(
    item: SaleItem
  ): ResolvedLine {

    const product =
      this.productById.get(item.productId);

    return {

      categoryId:
        item.categoryId ||
        product?.categoryId ||
        '',

      categoryName:
        item.categoryName ||
        product?.category ||
        'Uncategorised',

      supplierId:
        item.supplierId ||
        product?.supplierId ||
        '',

      supplierName:
        item.supplierName ||
        product?.supplier ||
        'No supplier',

      quantity:
        Number(item.quantity ?? 0),

      gstAmount:
        Number(item.gstAmount ?? 0),

      total:
        Number(item.total ?? 0)

    };

  }


  private sumVisible(
    pick: (line: ResolvedLine) => number
  ): number {

    return this.filteredSales.reduce(
      (total, sale) =>
        total +
        this.visibleLines(sale).reduce(
          (lineTotal, line) =>
            lineTotal + pick(line),
          0
        ),
      0
    );

  }


  private buildBreakdown(
    nameOf: (line: ResolvedLine) => string
  ): BreakdownRow[] {

    const rows = new Map<string, BreakdownRow>();

    for (const sale of this.filteredSales) {

      for (const line of this.visibleLines(sale)) {

        const name = nameOf(line);

        const current = rows.get(name) ?? {
          name,
          quantity: 0,
          amount: 0
        };

        current.quantity += line.quantity;

        current.amount += line.total;

        rows.set(name, current);

      }

    }

    return [...rows.values()].sort(
      (a, b) => b.amount - a.amount
    );

  }


  private getTimestamp(
    value: any
  ): number {

    if (!value) {

      return 0;

    }

    if (typeof value.toDate === 'function') {

      return value.toDate().getTime();

    }

    if (value instanceof Date) {

      return value.getTime();

    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();

  }


  formatDate(
    value: any
  ): string {

    if (!value) {

      return '-';

    }

    const date =
      typeof value.toDate === 'function'
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) {

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


  formatInputLabel(
    value: string
  ): string {

    const date = this.parseInputDate(value);

    if (!date) {

      return '-';

    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  }


  private parseInputDate(
    value: string
  ): Date | null {

    if (!value) {

      return null;

    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {

      return null;

    }

    return new Date(year, month - 1, day);

  }


  private startOfDay(
    date: Date
  ): Date {

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  }


  private endOfDay(
    date: Date
  ): Date {

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999
    );

  }


  private toInputDate(
    date: Date
  ): string {

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;

  }

}
