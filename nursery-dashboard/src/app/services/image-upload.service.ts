
import { Injectable, inject } from '@angular/core';
import {
  Storage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from '@angular/fire/storage';


const MAX_FULL_EDGE = 800;
const MAX_THUMB_EDGE = 200;
const MAX_STORED_BYTES = 500 * 1024;

const STORED_NAMES = [
  'main.webp',
  'main.jpg',
  'main.jpeg',
  'main.png',
  'thumb.webp',
  'thumb.jpg',
  'thumb.jpeg',
  'thumb.png'
];


export interface StoredProductImage {
  imageUrl: string;
  thumbUrl: string;
  imageVersion: number;
}


// Picture shown in the Products table and on Create Sale cards.
export function productListImage(product: {
  thumbUrl?: string;
  imageUrl?: string;
}): string {

  return (product.thumbUrl || product.imageUrl || '').trim();

}


// Picture shown in the product details popup.
export function productFullImage(product: {
  thumbUrl?: string;
  imageUrl?: string;
}): string {

  return (product.imageUrl || product.thumbUrl || '').trim();

}


@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  private readonly storage = inject(Storage);


  async uploadProductImage(
    productId: string,
    file: File,
    replaceExisting = false
  ): Promise<StoredProductImage> {

    if (!file.type.startsWith('image/')) {

      throw new Error('Please choose an image file.');

    }

    const full = await resizeImage(
      file,
      MAX_FULL_EDGE,
      0.8
    );

    const thumb = await resizeImage(
      file,
      MAX_THUMB_EDGE,
      0.8
    );

    const version = Date.now();

    // Upload the main image.
    const imageUrl = await this.store(
      productId,
      'main',
      full,
      version
    );

    // Upload the thumbnail.
    const thumbUrl = await this.store(
      productId,
      'thumb',
      thumb,
      version
    );

    // Cleanup is only required when replacing an existing image.
    // New products skip all unnecessary DELETE requests.
    if (replaceExisting) {

      const mainName = imageName('main', full);
      const thumbName = imageName('thumb', thumb);

      await Promise.all(
        STORED_NAMES
          .filter(name =>
            (name.startsWith('main.') && name !== mainName) ||
            (name.startsWith('thumb.') && name !== thumbName)
          )
          .map(name => this.remove(productId, name))
      );

    }

    return {
      imageUrl,
      thumbUrl,
      imageVersion: version
    };

  }


  // Delete all supported image variants when deleting a product
  // or explicitly removing its image.
  async deleteProductImage(
    productId: string
  ): Promise<void> {

    await Promise.all(
      STORED_NAMES.map(
        name => this.remove(productId, name)
      )
    );

  }


  // Upload one compressed image to Firebase Storage.
  // No cleanup is performed here.
  private async store(
    productId: string,
    kind: 'main' | 'thumb',
    image: CompressedImage,
    version: number
  ): Promise<string> {

    const name = imageName(kind, image);

    const stored = ref(
      this.storage,
      `products/${productId}/${name}`
    );

    await uploadBytes(
      stored,
      image.blob,
      {
        contentType: image.type,
        cacheControl: 'public, max-age=31536000'
      }
    );

    const url = await getDownloadURL(stored);

    return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;

  }


  // Delete an existing image.
  // Missing files are ignored, preserving existing behavior.
  private async remove(
    productId: string,
    name: string
  ): Promise<void> {

    try {

      await deleteObject(
        ref(
          this.storage,
          `products/${productId}/${name}`
        )
      );

    } catch (error: unknown) {

      const code =
        (error as { code?: string })?.code ?? '';

      if (
        code.includes('object-not-found') ||
        code.includes('storage/object-not-found')
      ) {

        return;

      }

      throw error;

    }

  }

}


// Determine the stored filename based on image format.
function imageName(
  kind: 'main' | 'thumb',
  image: CompressedImage
): string {

  const extension =
    image.type === 'image/webp'
      ? 'webp'
      : image.type === 'image/png'
        ? 'png'
        : 'jpg';

  return `${kind}.${extension}`;

}


interface CompressedImage {
  blob: Blob;
  type: string;
}


// Resize and compress images before uploading.
async function resizeImage(
  file: File,
  maxEdge: number,
  quality: number
): Promise<CompressedImage> {

  const bitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    maxEdge / Math.max(
      bitmap.width,
      bitmap.height
    )
  );

  const width = Math.max(
    1,
    Math.round(bitmap.width * scale)
  );

  const height = Math.max(
    1,
    Math.round(bitmap.height * scale)
  );

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {

    bitmap.close();

    throw new Error(
      'Could not prepare the image.'
    );

  }

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );

  bitmap.close();

  const webp = await canvasBlob(
    canvas,
    'image/webp',
    quality
  );

  if (
    webp &&
    webp.size <= MAX_STORED_BYTES
  ) {

    return {
      blob: webp,
      type: 'image/webp'
    };

  }

  const jpeg = await canvasBlob(
    canvas,
    'image/jpeg',
    quality
  );

  if (!jpeg) {

    throw new Error(
      'Could not prepare the image.'
    );

  }

  if (jpeg.size > MAX_STORED_BYTES) {

    throw new Error(
      'Image is still too large after compression. Choose a smaller photo.'
    );

  }

  return {
    blob: jpeg,
    type: 'image/jpeg'
  };

}


// Convert a canvas into a compressed image blob.
function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {

  return new Promise(resolve => {

    canvas.toBlob(
      blob => resolve(blob),
      type,
      quality
    );

  });

}
