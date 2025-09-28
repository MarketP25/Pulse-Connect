import type { NextApiRequest, NextApiResponse } from "next";
import { PlanResponseSchema, PlanSchema } from "@/types/plan";
import { getAllPlans } from "@/lib/models/Plan";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // fetch + runtime‐validate each plan
  const raw = getAllPlans().map((p) => PlanSchema.parse(p));
  const response = PlanResponseSchema.parse({ plans: raw });

  res.status(200).json(response);
}
