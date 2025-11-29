import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { firestore } from "@/lib/firebaseAdmin";
import { ProductSchema } from "@/schemas/product";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  switch (req.method) {
    case "POST":
      try {
        // Parse & validate request body; trusts default for createdAt
        const result = ProductSchema.safeParse(req.body);

        if (!result.success) {
          return res.status(400).json({ errors: result.error.format() });
        }

        const product = result.data;

        // Persist to Firestore
        const docRef = await firestore.collection("products").add({
          ...product,
          createdAt: product.createdAt.toISOString(),
        });

        return res.status(201).json({ id: docRef.id, ...product });
      } catch (error) {
        console.error("Create product failed:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }

    case "GET":
      try {
        const snapshot = await firestore
          .collection("products")
          .orderBy("createdAt", "desc")
          .get();

        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: new Date(doc.data().createdAt),
        }));

        return res.status(200).json(products);
      } catch (error) {
        console.error("Fetch products failed:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
