"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OnboardingPanel } from "@/components/dashboard/OnboardingPanel";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { SubscriptionPanel } from "@/components/dashboard/SubscriptionPanel";
import { EcommercePanel } from "@/components/dashboard/EcommercePanel";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { PlacesPanel } from "@/components/dashboard/PlacesPanel";
import { CommunicationPanel } from "@/components/dashboard/CommunicationPanel";
import { MarketingPanel } from "@/components/dashboard/MarketingPanel";
import { SecurityPanel } from "@/components/dashboard/SecurityPanel";
import { OpsPanel } from "@/components/dashboard/OpsPanel";
import { ReportingPanel } from "@/components/dashboard/ReportingPanel";
import { IdentityPanel } from "@/components/dashboard/IdentityPanel";
import { BillingPanel } from "@/components/dashboard/BillingPanel";
import { PlacesOperationsPanel } from "@/components/dashboard/PlacesOperationsPanel";
import { MatchmakingOperationsPanel } from "@/components/dashboard/MatchmakingOperationsPanel";
import { GovernancePanel } from "@/components/dashboard/GovernancePanel";
import { LocalizationAdvancedPanel } from "@/components/dashboard/LocalizationAdvancedPanel";
import { ProximityAdvancedPanel } from "@/components/dashboard/ProximityAdvancedPanel";
import { useDashboardStore } from "./useDashboardStore";
import { mergeDashboardDictionary } from "@/lib/dashboard/i18n";
import { DashboardModuleKey } from "@/types/dashboard";

function moduleState(
  access: Array<{ module: DashboardModuleKey; enabled: boolean; reason?: string }> | undefined,
  module: DashboardModuleKey,
) {
  const match = access?.find((entry) => entry.module === module);
  return {
    enabled: Boolean(match?.enabled),
    reason: match?.reason,
  };
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const queryUserId = searchParams?.get("userId") || undefined;

  const {
    userId,
    snapshot,
    loading,
    saving,
    error,
    chatResponse,
    aiStatus,
    setUserId,
    bootstrap,
    saveOnboarding,
    saveProfile,
    changeTier,
    completeKyc,
    purchaseProduct,
    askChatbot,
    enableTwoFactor,
    runBillingAction,
    runPlacesAction,
    runMatchmakingAction,
    runGovernanceAction,
    updateSecurity,
    trackInteraction,
  } = useDashboardStore();

  useEffect(() => {
    const targetUserId = queryUserId || userId;
    void bootstrap(targetUserId);
  }, [bootstrap, queryUserId, userId]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    void trackInteraction("core", "dashboard_loaded", {
      tier: snapshot.user.tier,
      role: snapshot.user.role,
    });
  }, [snapshot, trackInteraction]);

  const language = snapshot?.user.preferredLanguage || "en";
  const text = useMemo(
    () => mergeDashboardDictionary(snapshot?.dictionary, language),
    [language, snapshot?.dictionary],
  );

  if (loading && !snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-700">Loading dashboard...</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-rose-700">Unable to load dashboard state.</p>
      </main>
    );
  }

  const ecommerce = moduleState(snapshot.access, "ecommerce");
  const places = moduleState(snapshot.access, "places");
  const marketing = moduleState(snapshot.access, "marketing");
  const operations = moduleState(snapshot.access, "operations");
  const reporting = moduleState(snapshot.access, "reporting");
  const security = moduleState(snapshot.access, "security");
  const matchmaking = moduleState(snapshot.access, "matchmaking");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-emerald-50 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <DashboardHeader
          title={text.title}
          subtitle={text.subtitle}
          user={snapshot.user}
          currentUserId={userId}
          onUserIdChange={(nextUserId) => {
            setUserId(nextUserId);
            void bootstrap(nextUserId);
          }}
        />

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        {snapshot.localizationProvider ? (
          <p className="text-xs text-slate-500">
            Localization provider: <span className="font-semibold">{snapshot.localizationProvider}</span>
          </p>
        ) : null}
        {aiStatus ? (
          <p className="text-xs text-slate-500">
            PULSCO AI: <span className="font-semibold">{aiStatus.available ? "Available" : "Unavailable"}</span>{" "}
            ({aiStatus.provider}, {aiStatus.mode})
          </p>
        ) : null}

        <OnboardingPanel
          title={text.onboarding}
          saveLabel={text.save}
          user={snapshot.user}
          onSave={saveOnboarding}
          loading={saving}
        />

        <ProfilePanel title={text.profile} saveLabel={text.save} user={snapshot.user} onSave={saveProfile} loading={saving} />

        <IdentityPanel
          title={text.identity || "Identity & Access"}
          user={snapshot.user}
          identity={snapshot.identity}
          loading={saving}
          onEnableTwoFactor={enableTwoFactor}
        />

        <SubscriptionPanel
          title={text.subscription}
          tierLabels={{ basic: text.tierBasic, premium: text.tierPremium, enterprise: text.tierEnterprise }}
          kycRequiredLabel={text.kycRequired}
          completeKycLabel={text.completeKyc}
          user={snapshot.user}
          onTierChange={changeTier}
          onCompleteKyc={() => completeKyc(true)}
          loading={saving}
        />

        <EcommercePanel
          title={text.ecommerce}
          purchaseLabel={text.purchase}
          products={snapshot.products}
          purchases={snapshot.purchases}
          invoices={snapshot.invoices}
          enabled={ecommerce.enabled}
          disabledReason={ecommerce.reason}
          loading={saving}
          onPurchase={purchaseProduct}
        />

        <BillingPanel
          title={text.billing || "Billing & Ledger"}
          billing={snapshot.billing}
          loading={saving}
          onRunAction={runBillingAction}
        />

        <InsightsPanel title={text.insights} recommendations={snapshot.recommendations} alerts={snapshot.alerts} />

        <ReportingPanel
          title={text.reporting || "Reporting & Fraud"}
          reporting={snapshot.reporting}
          fraud={snapshot.fraud}
          enabled={reporting.enabled}
          disabledReason={reporting.reason}
        />

        <PlacesPanel
          title={text.places}
          places={snapshot.nearbyPlaces}
          matchmaking={snapshot.matchmaking}
          enabled={places.enabled}
          disabledReason={places.reason}
        />

        <PlacesOperationsPanel
          title={text.placesOperations || "Places Operations"}
          data={snapshot.placesOperations}
          enabled={places.enabled}
          disabledReason={places.reason}
          loading={saving}
          onRunAction={runPlacesAction}
        />

        <MatchmakingOperationsPanel
          title={text.matchmakingOperations || "Matchmaking Operations"}
          data={snapshot.matchmakingOperations}
          enabled={matchmaking.enabled}
          disabledReason={matchmaking.reason}
          loading={saving}
          onRunAction={runMatchmakingAction}
        />

        <LocalizationAdvancedPanel
          title={text.localizationAdvanced || "Localization Intelligence"}
          data={snapshot.localizationAdvanced}
        />

        <ProximityAdvancedPanel
          title={text.proximityAdvanced || "Proximity Intelligence"}
          data={snapshot.proximityAdvanced}
          enabled={places.enabled}
          disabledReason={places.reason}
        />

        <CommunicationPanel
          title={text.communication}
          sendLabel={text.send}
          inbox={snapshot.inbox}
          notifications={snapshot.notifications}
          announcements={snapshot.announcements}
          chatResponse={chatResponse}
          onSend={askChatbot}
          loading={saving}
        />

        <MarketingPanel
          title={text.marketing}
          campaigns={snapshot.campaigns}
          enabled={marketing.enabled}
          disabledReason={marketing.reason}
        />

        <SecurityPanel
          title={text.security}
          saveLabel={text.save}
          consents={snapshot.consents}
          access={snapshot.access}
          complianceProfile={snapshot.user.complianceProfile}
          onUpdate={updateSecurity}
          loading={saving}
        />

        <GovernancePanel
          title={text.governance || "Governance & Approvals"}
          data={snapshot.governance}
          enabled={operations.enabled && security.enabled}
          disabledReason={operations.reason || security.reason}
          loading={saving}
          onRequestArbitration={() => runGovernanceAction("request_arbitration")}
          onReviewRecommendation={(recommendationId, decision) =>
            runGovernanceAction("review_recommendation", { recommendationId, decision })
          }
        />

        <OpsPanel
          title={text.operations}
          metrics={snapshot.opsMetrics}
          backups={snapshot.backups}
          enabled={operations.enabled}
          disabledReason={operations.reason}
        />
      </div>
    </main>
  );
}
