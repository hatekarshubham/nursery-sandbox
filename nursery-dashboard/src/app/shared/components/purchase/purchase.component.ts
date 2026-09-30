import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Purchase {
  id: number;
  productName: string;
  category: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  status: 'Completed' | 'Pending';
}

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase.component.html',
  styleUrl: './purchase.component.css'
})
export class PurchaseComponent {

  purchases: Purchase[] = [
    {
      id: 1,
      productName: 'Gold Bucket 3L',
      category: 'Gold Buckets',
      supplier: 'ABC Suppliers',
      quantity: 50,
      unitPrice: 40,
      totalAmount: 2000,
      purchaseDate: '2026-09-20',
      status: 'Completed'
    },
    {
      id: 2,
      productName: 'Classic Mug',
      category: 'Mugs',
      supplier: 'XYZ Traders',
      quantity: 30,
      unitPrice: 45,
      totalAmount: 1350,
      purchaseDate: '2026-09-21',
      status: 'Completed'
    },
    {
      id: 3,
      productName: 'Small Round Planter',
      category: 'Planters',
      supplier: 'Green Garden Supplies',
      quantity: 25,
      unitPrice: 80,
      totalAmount: 2000,
      purchaseDate: '2026-09-22',
      status: 'Pending'
    },
    {
      id: 4,
      productName: 'Small Storage Container',
      category: 'Containers',
      supplier: 'Home Store Suppliers',
      quantity: 40,
      unitPrice: 60,
      totalAmount: 2400,
      purchaseDate: '2026-09-23',
      status: 'Completed'
    }
  ];

  getTotalPurchaseAmount(): number {
    return this.purchases.reduce(
      (total, purchase) => total + purchase.totalAmount,
      0
    );
  }

  getTotalQuantity(): number {
    return this.purchases.reduce(
      (total, purchase) => total + purchase.quantity,
      0
    );
  }

}
