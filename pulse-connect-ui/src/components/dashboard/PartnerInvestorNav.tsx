"use client";

import Link from "next/link";
import { DashboardUser } from "@/types/dashboard";

type Labels = {
  title: string;
  subtitle: string;
  partnerTitle: string;
  partnerDescription: string;
  investorTitle: string;
  investorDescription: string;
  enterpriseRequired: string;
};

type Props = {
  user: DashboardUser;
  userId: string;
  labels: Labels;
};

function Card({
  href,
  title,
  description,
  disabled
}: {
  href: string;
  title: string;
  description: string;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <div className="rounded-xl border border-nebula-500 bg-nebula-900/70 p-4 opacity-70">
        <h3 className="text-sm font-semibold text-tech-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-xl border border-pulse-cyan-500/50 bg-nebula-900/70 p-4 hover:border-pulse-cyan-300 hover:bg-nebula-900"
    >
      <h3 className="text-sm font-semibold text-tech-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
    </Link>
  );
}

export function PartnerInvestorNav({ user, userId, labels }: Props) {
  const enterpriseEligible = user.tier === "enterprise";
  const suffix = `?userId=${encodeURIComponent(userId)}`;

  return (
    <section className="rounded-2xl border border-pulse-cyan-500/30 bg-nebula-800/85 p-5 shadow-md">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-tech-white">{labels.title}</h2>
        <p className="text-sm text-slate-300">{labels.subtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          href={`/dashboard/partner${suffix}`}
          title={labels.partnerTitle}
          description={labels.partnerDescription}
          disabled={!enterpriseEligible}
        />
        <Card
          href={`/dashboard/investor${suffix}`}
          title={labels.investorTitle}
          description={labels.investorDescription}
          disabled={!enterpriseEligible}
        />
      </div>

      {!enterpriseEligible ? (
        <p className="mt-3 text-xs font-medium text-amber-300">{labels.enterpriseRequired}</p>
      ) : null}
    </section>
  );
}
