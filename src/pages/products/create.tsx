// pages/products/create.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styles from "@/styles/createProduct.module.css";

type FormState = {
  name: string;
  price: number;
};

export default function CreateProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ name: "", price: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") return <p>Loading session…</p>;
  if (!session) return <p>You must be signed in to create a product.</p>;

  const handleChange =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({
        ...f,
        [field]: field === "price" ? Number(e.target.value) : e.target.value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.message || "Create failed");
      }

      router.push("/products");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Create Product</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={form.name}
            onChange={handleChange("name")}
            required
          />
        </label>
        <label>
          Price (USD)
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={handleChange("price")}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Product"}
        </button>

        {error && <p className={styles.errorText}>{error}</p>}
      </form>
    </div>
  );
}
