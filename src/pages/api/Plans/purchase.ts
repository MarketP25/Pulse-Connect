// src/pages/api/plans/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { PlanSchema } from "@/types/plan";        // ← import from your Zod types

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // ensure user is signed in
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // validate that body contains a valid plan ID
  const result = PlanSchema.pick({ id: true }).safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.format() });
  }
  const { id: planId } = result.data;

  // TODO: integrate payment gateway, record order, grant entitlement...
  // e.g. await chargeCustomer(session.user.id, planId)

  return res
    .status(200)
    .json({ message: `Plan ${planId} purchased successfully` });
}