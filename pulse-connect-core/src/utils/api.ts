// src/lib/api.ts

import { fetcher } from "./fetcher";
import { Plan, PlanResponseSchema } from "../types/plan";

export async function getPlans(): Promise<Plan[]> {
  const data = await fetcher("/api/plans");
  const parsed = PlanResponseSchema.parse(data);
  return parsed.plans;
}
