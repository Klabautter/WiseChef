export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  expiryDate: string;
  addedDate: string;
  quantity?: string;
  imageUrl?: string;
  nutritionalInfo?: {
    [key: string]: string;
  };
}

export interface ProductResponse {
  code: string;
  product: {
    product_name: string;
    categories: string;
    image_url?: string;
    nutriments?: {
      [key: string]: number | string;
    };
    quantity?: string;
  };
  status: number;
} 