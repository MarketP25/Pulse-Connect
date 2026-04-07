"use client";

import { useSearchParams } from "next/navigation";
import { SubmissionPage } from "@/components/partner-investor/SubmissionPage";

export default function PartnerApplicationPage() {
  const searchParams = useSearchParams();
  const userId = searchParams?.get("userId") || "demo-basic";

  return <SubmissionPage type="partner" userId={userId} />;
}
