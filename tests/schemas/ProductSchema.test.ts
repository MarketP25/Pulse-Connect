import { ProductSchema } from "@/lib/models/Product";

describe("ProductSchema", () => {
  it("should validate a valid product object", () => {
    const validProduct = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Sample Product",
      description: "This is a valid product description.",
      price: 99.99,
      currency: "USD",
      imageUrl: "https://example.com/image.jpg",
      category: "Electronics",
      region: "US",
      sellerId: "123e4567-e89b-12d3-a456-426614174001",
    };
    expect(() => ProductSchema.parse(validProduct)).not.toThrow();
  });

  it("should throw an error for a negative price", () => {
    const invalidProduct = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Sample Product",
      description: "This is a valid product description.",
      price: -10,
      currency: "USD",
      imageUrl: "https://example.com/image.jpg",
      category: "Electronics",
      region: "US",
      sellerId: "123e4567-e89b-12d3-a456-426614174001",
    };
    expect(() => ProductSchema.parse(invalidProduct)).toThrow("Price must be zero or positive");
  });

  it("should throw an error for an invalid URL", () => {
    const invalidProduct = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Sample Product",
      description: "This is a valid product description.",
      price: 99.99,
      currency: "USD",
      imageUrl: "invalid-url",
      category: "Electronics",
      region: "US",
      sellerId: "123e4567-e89b-12d3-a456-426614174001",
    };
    expect(() => ProductSchema.parse(invalidProduct)).toThrow("Must be a valid URL");
  });
});
