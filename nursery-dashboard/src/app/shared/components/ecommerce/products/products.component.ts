import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Product {
  id: number;
  name: string;
  description: string;
  unitPrice: number;
  quantity: string;
  image: string;
}

@Component({
  selector: 'app-products',
  imports: [CommonModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent {

  tableData: Product[] = [

    {
      id: 1,
      name: 'KITCHENFRESH 1',
      description:
        'Compact kitchen storage container designed for convenient everyday food and household storage.',
      unitPrice: 22.50,
      quantity: 'AS/R',
      image: '/images/product/product-01.jpg',
    },

    {
      id: 2,
      name: 'KITCHENFRESH 2',
      description:
        'Practical kitchen storage container suitable for organizing and storing everyday items.',
      unitPrice: 39,
      quantity: 'AS/R',
      image: '/images/product/product-02.jpg',
    },

    {
      id: 3,
      name: 'KITCHENFRESH 3',
      description:
        'Useful kitchen container designed for convenient storage and everyday household use.',
      unitPrice: 60,
      quantity: 'AS/R',
      image: '/images/product/product-03.jpg',
    },

    {
      id: 4,
      name: 'KITCHENFRESH 5',
      description:
        'Spacious kitchen storage container designed to keep food and household items organized.',
      unitPrice: 85,
      quantity: 'AS/R',
      image: '/images/product/product-04.jpg',
    },

    {
      id: 5,
      name: 'KITCHENFRESH 7.5',
      description:
        'Large-capacity kitchen storage container suitable for convenient household storage.',
      unitPrice: 100,
      quantity: 'AS/R',
      image: '/images/product/product-05.jpg',
    },

    {
      id: 6,
      name: 'KITCHENFRESH 10',
      description:
        'Large kitchen storage container designed for storing and organizing household items.',
      unitPrice: 140,
      quantity: 'AS/R',
      image: '/images/product/product-01.jpg',
    },

    {
      id: 7,
      name: 'STOREWELL 15',
      description:
        'Large storage container designed to provide convenient and organized household storage.',
      unitPrice: 215,
      quantity: 'AS/R',
      image: '/images/product/product-02.jpg',
    },

    {
      id: 8,
      name: 'KITCHENFRESH SET SMALL (1,2,3)',
      description:
        'Small kitchen container set containing three useful storage containers for everyday use.',
      unitPrice: 127,
      quantity: '96 SET',
      image: '/images/product/product-03.jpg',
    },

    {
      id: 9,
      name: 'KITCHENFRESH SET BIG (5,7.5,10)',
      description:
        'Large kitchen container set containing three different sizes for convenient storage.',
      unitPrice: 345,
      quantity: '24 SET',
      image: '/images/product/product-04.jpg',
    },

    {
      id: 10,
      name: 'SUPER DELUXE 11',
      description:
        'Compact household storage container designed for practical everyday use.',
      unitPrice: 23,
      quantity: '288',
      image: '/images/product/product-05.jpg',
    },

  ];
  selectedProduct: any = null;

  openProductDetails(product: any) {
    this.selectedProduct = product;
  }

  closeProductDetails() {
    this.selectedProduct = null;
  }
}