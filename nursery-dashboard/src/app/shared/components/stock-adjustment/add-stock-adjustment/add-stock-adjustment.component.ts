import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-stock-adjustment.component.html',
  styleUrl: './add-stock-adjustment.component.css'
})
export class AddStockAdjustmentComponent {

  warehouse: string = '';
  product: string = '';
  adjustmentType: string = '';
  quantity: number | null = null;
  reason: string = '';
  adjustmentDate: string = '';
  notes: string = '';

  warehouses: string[] = [
    'Main Warehouse',
    'Pune Warehouse',
    'Mumbai Warehouse'
  ];

  products: string[] = [
    'Areca Palm',
    'Money Plant',
    'Snake Plant',
    'Peace Lily'
  ];

  adjustmentTypes: string[] = [
    'Increase Stock',
    'Decrease Stock'
  ];

  saveStockAdjustment(): void {
    const stockAdjustment = {
      warehouse: this.warehouse,
      product: this.product,
      adjustmentType: this.adjustmentType,
      quantity: this.quantity,
      reason: this.reason,
      adjustmentDate: this.adjustmentDate,
      notes: this.notes
    };

    console.log('Stock Adjustment:', stockAdjustment);
  }

  cancel(): void {
    this.warehouse = '';
    this.product = '';
    this.adjustmentType = '';
    this.quantity = null;
    this.reason = '';
    this.adjustmentDate = '';
    this.notes = '';
  }
}
