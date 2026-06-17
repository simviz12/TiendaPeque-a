import type { Product } from "../entities/product";

export interface ProductRepository {
  findActive(): Promise<Product[]>;
  findByBarcode(barcode: string): Promise<Product | null>;
}
