import useSWR from "swr";
import type { Plan, PlanResponse } from "@/types/plan";
import { PlanResponseSchema } from "@/types/plan";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePlan() {
  const { data, error } = useSWR<PlanResponse>("/api/plans", fetcher);
  const plans: Plan[] = data ? PlanResponseSchema.parse(data).plans : [];
  const loading = !data && !error;

  return { plans, loading, error };
}