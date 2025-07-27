export function usePurchasePlan() {
  async function purchase(planId: string) {
    const res = await fetch("/api/plans/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: planId }),
    });
    if (!res.ok) throw new Error("Purchase failed");
    return res.json();
  }
  return { purchase };
}