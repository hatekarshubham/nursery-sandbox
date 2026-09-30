import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface StockTransfer {
  date: string;
  product: string;
  fromWarehouse: string;
  toWarehouse: string;
  qty: number;
  status: string;
}

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-transfer.component.html',
  styleUrl: './stock-transfer.component.css'
})
export class StockTransferComponent {

  stockTransfers: StockTransfer[] = [
    {
      date: '29 Sep 2026',
      product: 'Areca Palm',
      fromWarehouse: 'Main Warehouse',
      toWarehouse: 'Pune Warehouse',
      qty: 50,
      status: 'Pending'
    },
    {
      date: '28 Sep 2026',
      product: 'Money Plant',
      fromWarehouse: 'Main Warehouse',
      toWarehouse: 'Mumbai Warehouse',
      qty: 30,
      status: 'Completed'
    },
    {
      date: '27 Sep 2026',
      product: 'Snake Plant',
      fromWarehouse: 'Pune Warehouse',
      toWarehouse: 'Main Warehouse',
      qty: 20,
      status: 'Pending'
    }
  ];

  statusOptions = ['Pending', 'Completed'];

  viewStockTransfer(transfer: StockTransfer): void {
    console.log('View Stock Transfer:', transfer);
  }
}
