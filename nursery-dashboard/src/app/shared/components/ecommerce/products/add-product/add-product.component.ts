import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-product',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css',
})
export class AddProductComponent {

  product = {
    name: '',
    category: '',
    description: '',
    unitPrice: null as number | null,
    gst: 18,
    standardPackage: null as number | null,
    image: ''
  };

  categories = [
    'Gold Buckets',
    'Mugs',
    'Planters',
    'Containers'
  ];

  selectedImage: string | null = null;

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const reader = new FileReader();

      reader.onload = () => {
        this.selectedImage = reader.result as string;
        this.product.image = this.selectedImage;
      };

      reader.readAsDataURL(file);
    }
  }

  addProduct() {

    if (
      !this.product.name ||
      !this.product.category ||
      this.product.unitPrice === null
    ) {
      alert('Please fill all required fields.');
      return;
    }

    console.log('Product Added:', this.product);

    alert('Product added successfully!');

    this.resetForm();
  }

  resetForm() {
    this.product = {
      name: '',
      category: '',
      description: '',
      unitPrice: null,
      gst: 18,
      standardPackage: null,
      image: ''
    };

    this.selectedImage = null;
  }
}