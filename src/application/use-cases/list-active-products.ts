import type { ProductRepository } from "@/domain/repositories/product-repository";

export class ListActiveProducts {
  constructor(private readonly products: ProductRepository) {}

  execute() {
    return this.products.findActive();
  }
}
