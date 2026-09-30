import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface StockAdjustment {
  date: string;
  product: string;
  warehouse: string;
  type: string;
  qty: number;
  before: number;
  after: number;
  reason: string;
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-adjustment.component.html',
  styleUrl: './stock-adjustment.component.css'
})
export class StockAdjustmentComponent {

  stockAdjustments: StockAdjustment[] = [
    {
      date: '29 Sep 2026',
      product: 'Areca Palm',
      warehouse: 'Main Warehouse',
      type: 'Increase',
      qty: 20,
      before: 80,
      after: 100,
      reason: 'New stock received'
    },
    {
      date: '28 Sep 2026',
      product: 'Money Plant',
      warehouse: 'Pune Warehouse',
      type: 'Decrease',
      qty: 10,
      before: 50,
      after: 40,
      reason: 'Damaged plants'
    },
    {
      date: '27 Sep 2026',
      product: 'Snake Plant',
      warehouse: 'Main Warehouse',
      type: 'Increase',
      qty: 15,
      before: 35,
      after: 50,
      reason: 'Stock correction'
    },
    {
      date: '26 Sep 2026',
      product: 'Peace Lily',
      warehouse: 'Mumbai Warehouse',
      type: 'Decrease',
      qty: 5,
      before: 25,
      after: 20,
      reason: 'Expired plants'
    }
  ];

  viewStockAdjustment(adjustment: StockAdjustment): void {
    console.log('View Stock Adjustment:', adjustment);
  }
}
