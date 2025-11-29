import { useState } from "react";
import { Product } from "../lib/models/Product";
import { useRouter } from "next/navigation";

interface UseCreateProductResult {
  createProduct: (data: Omit<Product, "id" | "createdAt">) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useCreateProduct(): UseCreateProductResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function createProduct(data: Omit<Product, "id" | "createdAt">) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to create product");
      }

      const created = await res.json();
      router.push(`/marketplace/${created.id}`);
    } catch (err: any) {
      console.error("useCreateProduct error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { createProduct, loading, error };
}
