import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Product {
  name: string;
  description: string;
  unitPrice: string;
  quantity: number;
}

interface Category {
  name: string;
  color: string;
  products: Product[];
}

@Component({
  selector: 'app-category-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-chart.component.html',
  styleUrl: './category-chart.component.css',
})
export class CategoryChartComponent {

  selectedCategory: Category | null = null;

  categories: Category[] = [

    {
      name: 'Gold Buckets',
      color: '#4863F7',
      products: [
        {
          name: 'Gold Bucket 3L',
          description: 'Compact bucket designed for convenient everyday household use.',
          unitPrice: '₹40',
          quantity: 240
        },
        {
          name: 'Gold Bucket 5L',
          description: 'Practical household bucket suitable for everyday use.',
          unitPrice: '₹57',
          quantity: 96
        },
        {
          name: 'Gold Bucket 7L',
          description: 'Medium-size bucket designed for convenient household use.',
          unitPrice: '₹74',
          quantity: 60
        },
        {
          name: 'Gold Bucket 9L',
          description: 'Useful household bucket offering convenient storage.',
          unitPrice: '₹88',
          quantity: 60
        },
        {
          name: 'Gold Bucket 12L',
          description: 'Large bucket suitable for household cleaning and storage.',
          unitPrice: '₹110',
          quantity: 45
        },
        {
          name: 'Gold Bucket 15L',
          description: 'Durable bucket designed for regular household activities.',
          unitPrice: '₹135',
          quantity: 35
        },
        {
          name: 'Gold Bucket 18L',
          description: 'Spacious bucket suitable for multiple household purposes.',
          unitPrice: '₹160',
          quantity: 28
        },
        {
          name: 'Gold Bucket 20L',
          description: 'Large-capacity bucket designed for everyday utility.',
          unitPrice: '₹185',
          quantity: 25
        },
        {
          name: 'Gold Bucket Heavy Duty',
          description: 'Strong and durable bucket suitable for heavy household use.',
          unitPrice: '₹210',
          quantity: 20
        },
        {
          name: 'Gold Bucket Premium',
          description: 'Premium quality bucket with durable construction.',
          unitPrice: '₹250',
          quantity: 15
        }
      ]
    },

    {
      name: 'Mugs',
      color: '#16B86B',
      products: [
        {
          name: 'Classic Mug',
          description: 'Simple and practical mug suitable for everyday use.',
          unitPrice: '₹45',
          quantity: 120
        },
        {
          name: 'Premium Coffee Mug',
          description: 'Stylish mug designed for coffee and beverages.',
          unitPrice: '₹80',
          quantity: 90
        },
        {
          name: 'Ceramic Mug',
          description: 'Durable ceramic mug suitable for hot and cold drinks.',
          unitPrice: '₹95',
          quantity: 75
        },
        {
          name: 'Tea Mug',
          description: 'Comfortable mug designed for daily tea consumption.',
          unitPrice: '₹60',
          quantity: 100
        },
        {
          name: 'Travel Mug',
          description: 'Convenient mug designed for beverages while travelling.',
          unitPrice: '₹180',
          quantity: 45
        },
        {
          name: 'Printed Mug',
          description: 'Decorative printed mug suitable for home and office use.',
          unitPrice: '₹110',
          quantity: 65
        },
        {
          name: 'Large Coffee Mug',
          description: 'Large-capacity mug perfect for coffee and other beverages.',
          unitPrice: '₹125',
          quantity: 50
        },
        {
          name: 'Glass Mug',
          description: 'Elegant transparent mug suitable for everyday beverages.',
          unitPrice: '₹140',
          quantity: 35
        },
        {
          name: 'Steel Mug',
          description: 'Strong stainless-steel mug designed for regular use.',
          unitPrice: '₹150',
          quantity: 40
        },
        {
          name: 'Designer Mug',
          description: 'Attractive designer mug suitable for gifting and home use.',
          unitPrice: '₹200',
          quantity: 25
        }
      ]
    },

    {
      name: 'Planters',
      color: '#FF9500',
      products: [
        {
          name: 'Small Round Planter',
          description: 'Compact planter suitable for small indoor plants.',
          unitPrice: '₹80',
          quantity: 90
        },
        {
          name: 'Medium Round Planter',
          description: 'Medium-sized planter suitable for decorative plants.',
          unitPrice: '₹120',
          quantity: 70
        },
        {
          name: 'Large Round Planter',
          description: 'Large planter suitable for growing bigger plants.',
          unitPrice: '₹180',
          quantity: 45
        },
        {
          name: 'Square Planter',
          description: 'Modern square planter suitable for indoor and outdoor plants.',
          unitPrice: '₹150',
          quantity: 60
        },
        {
          name: 'Wall Planter',
          description: 'Space-saving planter designed for wall decoration.',
          unitPrice: '₹130',
          quantity: 35
        },
        {
          name: 'Hanging Planter',
          description: 'Decorative hanging planter suitable for balconies and gardens.',
          unitPrice: '₹175',
          quantity: 30
        },
        {
          name: 'Ceramic Planter',
          description: 'Stylish ceramic planter suitable for indoor plants.',
          unitPrice: '₹250',
          quantity: 25
        },
        {
          name: 'Plastic Planter',
          description: 'Lightweight planter suitable for everyday gardening.',
          unitPrice: '₹70',
          quantity: 100
        },
        {
          name: 'Decorative Planter',
          description: 'Attractive planter designed to enhance home interiors.',
          unitPrice: '₹220',
          quantity: 20
        },
        {
          name: 'Garden Planter',
          description: 'Durable planter suitable for outdoor garden plants.',
          unitPrice: '₹300',
          quantity: 18
        }
      ]
    },

    {
      name: 'Containers',
      color: '#F44336',
      products: [
        {
          name: 'Small Storage Container',
          description: 'Compact container suitable for storing household items.',
          unitPrice: '₹60',
          quantity: 100
        },
        {
          name: 'Medium Storage Container',
          description: 'Practical container for organized household storage.',
          unitPrice: '₹90',
          quantity: 80
        },
        {
          name: 'Large Storage Container',
          description: 'Large-capacity container suitable for household storage.',
          unitPrice: '₹150',
          quantity: 55
        },
        {
          name: 'Kitchen Container',
          description: 'Useful container designed for organized kitchen storage.',
          unitPrice: '₹110',
          quantity: 70
        },
        {
          name: 'Food Storage Container',
          description: 'Convenient container for storing dry food items.',
          unitPrice: '₹130',
          quantity: 65
        },
        {
          name: 'Airtight Container',
          description: 'Airtight container designed to keep stored items fresh.',
          unitPrice: '₹180',
          quantity: 45
        },
        {
          name: 'Plastic Container',
          description: 'Lightweight container suitable for everyday household use.',
          unitPrice: '₹75',
          quantity: 90
        },
        {
          name: 'Multipurpose Container',
          description: 'Versatile container suitable for different storage needs.',
          unitPrice: '₹120',
          quantity: 60
        },
        {
          name: 'Premium Container',
          description: 'Premium quality container with durable construction.',
          unitPrice: '₹220',
          quantity: 30
        },
        {
          name: 'Heavy Duty Container',
          description: 'Strong container designed for long-term storage.',
          unitPrice: '₹280',
          quantity: 20
        }
      ]
    }
  ];


  selectCategory(category: Category) {
    this.selectedCategory = category;
  }

  clearSelection() {
    this.selectedCategory = null;
  }

}