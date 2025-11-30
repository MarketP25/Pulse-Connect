import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { FundSchema } from "@/lib/models/Fund";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const parse = FundSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.format() });
  }
  // Charge via gateway, update user wallet...
  return res
    .status(200)
    .json({ message: `Funded ${parse.data.amount} ${parse.data.currency}` });
}
