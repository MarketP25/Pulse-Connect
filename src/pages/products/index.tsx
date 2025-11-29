// pages/products/index.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import styles from "@/styles/products.module.css";

type Product = {
  id: string;
  name: string;
  price: number;
  createdAt: string;
};

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = snapshot.docs.map((doc) => {
          const d = doc.data() as DocumentData;
          return {
            id: doc.id,
            name: d.name,
            price: d.price,
            createdAt: d.createdAt,
          };
        });
        setProducts(items);
      },
      (err) => {
        console.error("Snapshot error:", err);
        setError("Failed to load products.");
      }
    );

    return () => unsubscribe();
  }, [status]);

  if (status === "loading") return <p>Loading session…</p>;
  if (!session) return <p>Please sign in to view products.</p>;

  return (
    <div className={styles.container}>
      <h1>Products</h1>

      {error && <p className={styles.errorText}>{error}</p>}
      {products.length === 0 && <p>No products yet.</p>}

      <ul className={styles.productList}>
        {products.map((p) => (
          <li key={p.id} className={styles.productItem}>
            <strong>{p.name}</strong> — ${p.price.toFixed(2)}
            <br />
            <small>
              Created at: {new Date(p.createdAt).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}