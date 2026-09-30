import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-stock-transfer.component.html',
  styleUrl: './add-stock-transfer.component.css'
})
export class AddStockTransferComponent {

  fromWarehouse: string = '';
  toWarehouse: string = '';
  product: string = '';
  quantity: number | null = null;
  transferDate: string = '';
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

  saveStockTransfer(): void {
    const stockTransfer = {
      fromWarehouse: this.fromWarehouse,
      toWarehouse: this.toWarehouse,
      product: this.product,
      quantity: this.quantity,
      transferDate: this.transferDate,
      notes: this.notes
    };

    console.log('Stock Transfer:', stockTransfer);
  }

  cancel(): void {
    this.fromWarehouse = '';
    this.toWarehouse = '';
    this.product = '';
    this.quantity = null;
    this.transferDate = '';
    this.notes = '';
  }
}