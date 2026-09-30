import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PurchaseItem {
  product: string;
  quantity: number;
  unitPrice: number;
  gst: number;
}

@Component({
  selector: 'app-add-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-purchase.component.html',
  styleUrl: './add-purchase.component.css'
})
export class AddPurchaseComponent {

  suppliers: string[] = [
    'Green Leaf Nursery',
    'Nature Plants',
    'Garden World',
    'Green Garden Suppliers'
  ];

  warehouses: string[] = [
    'Main Warehouse',
    'Secondary Warehouse',
    'Storage Warehouse'
  ];

  products: string[] = [
    'Areca Palm',
    'Money Plant',
    'Ceramic Pot',
    'Snake Plant',
    'Peace Lily',
    'Aloe Vera'
  ];

  gstOptions: number[] = [0, 5, 12, 18, 28];

  supplier: string = 'Green Leaf Nursery';

  warehouse: string = 'Main Warehouse';

  invoiceNumber: string = 'GL-458';

  purchaseDate: string = '2026-09-27';

  purchaseItems: PurchaseItem[] = [
    {
      product: 'Areca Palm',
      quantity: 100,
      unitPrice: 120,
      gst: 5
    },
    {
      product: 'Money Plant',
      quantity: 50,
      unitPrice: 40,
      gst: 5
    },
    {
      product: 'Ceramic Pot',
      quantity: 25,
      unitPrice: 180,
      gst: 18
    }
  ];


  // Add new product
  addProduct(): void {
    this.purchaseItems.push({
      product: this.products[0],
      quantity: 1,
      unitPrice: 0,
      gst: 5
    });
  }


  // Remove product
  removeProduct(index: number): void {
    if (this.purchaseItems.length > 1) {
      this.purchaseItems.splice(index, 1);
    }
  }


  // Product base amount
  getItemBaseAmount(item: PurchaseItem): number {
    return item.quantity * item.unitPrice;
  }


  // GST amount
  getItemGstAmount(item: PurchaseItem): number {
    const baseAmount = this.getItemBaseAmount(item);

    return baseAmount * item.gst / 100;
  }


  // Final amount including GST
  getItemAmount(item: PurchaseItem): number {
    return (
      this.getItemBaseAmount(item) +
      this.getItemGstAmount(item)
    );
  }


  // Subtotal
  getSubtotal(): number {
    return this.purchaseItems.reduce(
      (total, item) =>
        total + this.getItemBaseAmount(item),
      0
    );
  }


  // Total GST
  getTotalGst(): number {
    return this.purchaseItems.reduce(
      (total, item) =>
        total + this.getItemGstAmount(item),
      0
    );
  }


  // Grand Total
  getGrandTotal(): number {
    return this.getSubtotal() + this.getTotalGst();
  }


  // Save Purchase
  savePurchase(): void {

    const purchaseData = {
      supplier: this.supplier,
      warehouse: this.warehouse,
      invoiceNumber: this.invoiceNumber,
      purchaseDate: this.purchaseDate,
      items: this.purchaseItems,
      subtotal: this.getSubtotal(),
      gst: this.getTotalGst(),
      grandTotal: this.getGrandTotal()
    };

    console.log('Purchase Data:', purchaseData);

    alert('Purchase saved successfully!');
  }


  // Cancel
  cancelPurchase(): void {
    console.log('Purchase cancelled');
  }

}

