"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductSchema, Product } from "../lib/models/Product";
import { useCreateProduct } from "../hooks/useCreateProducts";

export function ProductPostForm() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Product>({
    resolver: zodResolver(ProductSchema) // Ensure consistent validation
  });
  const { createProduct, loading: submitting, error } = useCreateProduct();

  async function onSubmit(data: Product) {
    try {
      await createProduct(data);
    } catch (err) {
      console.error("Product creation failed:", err); // Add error handling
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        Name
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </label>

      <label>
        Description
        <textarea {...register("description")} />
        {errors.description && <span>{errors.description.message}</span>}
      </label>

      <label>
        Price
        <input type="number" step="0.01" {...register("price")} />
        {errors.price && <span>{errors.price.message}</span>}
      </label>

      <label>
        Currency (e.g. USD)
        <input {...register("currency")} />
        {errors.currency && <span>{errors.currency.message}</span>}
      </label>

      <label>
        Image URL
        <input {...register("imageUrl")} />
        {errors.imageUrl && <span>{errors.imageUrl.message}</span>}
      </label>

      <label>
        Category
        <input {...register("category")} />
        {errors.category && <span>{errors.category.message}</span>}
      </label>

      <label>
        Region Code (e.g. KE)
        <input {...register("region")} />
        {errors.region && <span>{errors.region.message}</span>}
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Posting…" : "Post Product"}
      </button>
    </form>
  );
}
