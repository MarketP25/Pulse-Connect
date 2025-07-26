// app/funding/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  PROGRAM_LABELS,
  PLAN_REQUIREMENTS,
  SUBSCRIPTION_PLANS,
  DONATION_TIERS,
  Currency,
  ProgramType,
  SubscriptionPlan,
} from "@/lib/upgradePlans";
import { app } from "@/firebase/config";
import { PaymentButton } from "@/components/PaymentButton";

/* TYPES */
// Types and constants are now imported from @/lib/upgradePlans

/* CONFIG */

// Upgrade plan constants are now imported from @/lib/upgradePlans

/* HELPERS */
function getUserCurrency(): Currency {
  const [, region] = navigator.language.split("-");
  const code = (region || "US").toUpperCase();
  return (["USD", "KES", "EUR"].includes(code) ? code : "USD") as Currency;
}
function formatPrice(amount: number, currency: Currency, suffix: "/mo" | "/yr") {
  if (amount === 0) return "Free 7-day";
  return new Intl.NumberFormat(navigator.language, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount) + suffix;
}
function trackEvent(event: string, data: Record<string, unknown>) {
  // ...existing code...
}

/* SimpleForm Component */
function SimpleForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
  sent,
  sentMessage,
  buttonColor,
}: {
  value: string;
  onChange(v: string): void;
  onSubmit(e: React.FormEvent): void;
  placeholder: string;
  buttonLabel: string;
  sent: boolean;
  sentMessage: string;
  buttonColor: string;
}) {
  return (
    <div className="mb-8 max-w-md mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-sm"
          required
        />
        <button type="submit" disabled={!value.trim()} className={`px-4 py-1 rounded ${buttonColor}`}>
          {buttonLabel}
        </button>
      </form>
      {sent && <p className="text-green-600 text-xs mt-2">{sentMessage}</p>}
    </div>
  );
}

/* FundPage Component */
export default function FundPage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  // auth
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // subscription
  const [currentPlan, setCurrentPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // donation
  const [loadingTierName, setLoadingTierName] = useState<string | null>(null);

  // feedback/complaint
  const [complaint, setComplaint] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // tip jar
  const [showTipJar, setShowTipJar] = useState(false);

  // upgrade popup
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const upgradeRef = useRef<HTMLDivElement>(null);

  // 1) auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return void router.push("/login");
      setUserId(user.uid);
      setUserEmail(user.email || "");
      setEmailVerified(!!user.emailVerified);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data() as any;
        setCurrentPlan(data.role || "");
        setBillingCycle(data.billingCycle || "monthly");
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [auth, db, router]);

  // 2) tip jar once
  useEffect(() => {
    // Only non-sensitive UI state is stored in localStorage
    if (!loadingAuth && !localStorage.getItem("tipJarDismissed")) setShowTipJar(true);
  }, [loadingAuth]);

  // 3) upgrade popup every 30m
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (["basic", "patronTrial"].includes(currentPlan)) {
      t = setInterval(() => setShowUpgradePopup(true), 30 * 60 * 1000);
    }
    return () => clearInterval(t);
  }, [currentPlan]);

  // subscription upgrade
  async function handleUpgrade(planId: string) {
    setLoadingPlanId(planId);
    setStatus(null);
    trackEvent("upgrade_click", { planId, billingCycle });
    try {
      await setDoc(doc(db, "upgradeLogs", `${userId}_${Date.now()}`), {
        userId,
        userEmail,
        planId,
        billingCycle,
        attemptedAt: serverTimestamp(),
      });
      if (!emailVerified) throw new Error("Please verify your email before upgrading your plan.");
      await updateDoc(doc(db, "users", userId), {
        role: planId,
        billingCycle,
        upgradedAt: serverTimestamp(),
      });
      setCurrentPlan(planId);
      setShowUpgradePopup(false);
      setStatus({ type: "success", message: `Successfully subscribed to the ${planId} plan!` });
      upgradeRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      // Provide more detailed error feedback for debugging
      let msg = "An error occurred during upgrade. Please try again.";
      if (e instanceof Error) {
        msg = e.message;
      } else if (typeof e === "string") {
        msg = e;
      }
      setStatus({ type: "error", message: msg });
    } finally {
      setLoadingPlanId(null);
    }
  }

  // donation
  async function handleDonate(tierName: string) {
    setLoadingTierName(tierName);
    setStatus(null);
    trackEvent("donate_click", { tierName });
    try {
      await setDoc(doc(db, "fundLogs", `${userId}_${Date.now()}`), {
        userId,
        userEmail,
        tierName,
        fundedAt: serverTimestamp(),
      });
      setStatus({ type: "success", message: `${tierName} donation recorded. Thank you for your support!` });
    } catch (e) {
      // Provide more detailed error feedback for debugging
      let msg = "An error occurred while processing your donation. Please try again.";
      if (e instanceof Error) {
        msg = e.message;
      } else if (typeof e === "string") {
        msg = e;
      }
      setStatus({ type: "error", message: msg });
    } finally {
      setLoadingTierName(null);
    }
  }

  // complaint
  // complaint
  async function onComplaintSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complaint.trim()) return;
    try {
      await addDoc(collection(db, "complaints"), {
        userId,
        userEmail,
        complaint,
        createdAt: serverTimestamp(),
      });
      setComplaint("");
      setComplaintSent(true);
    } catch (e) {
      let msg = "An error occurred while submitting your complaint. Please try again.";
      if (e instanceof Error) msg = e.message;
      setStatus({ type: "error", message: msg });
    }
  }

  // feedback
  async function onFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    try {
      await addDoc(collection(db, "feedback"), {
        userId,
        userEmail,
        feedback,
        createdAt: serverTimestamp(),
      });
      setFeedback("");
      setFeedbackSent(true);
    } catch (e) {
      let msg = "An error occurred while submitting your feedback. Please try again.";
      if (e instanceof Error) msg = e.message;
      setStatus({ type: "error", message: msg });
    }
  }

  if (loadingAuth) return <p className="text-center py-12">Loading...</p>;

  const currency = getUserCurrency();

  return (
    <div className="relative min-h-screen bg-white px-4 py-10">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="Pulse Connect" width={96} height={96} />
        <h1 className="text-3xl font-bold text-indigo-700 mt-4">Support Pulse Connect</h1>
        {currentPlan && (
          <p className="mt-2 text-gray-700">
            You’re on <strong>{currentPlan}</strong> ({billingCycle}).
          </p>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className={`max-w-md mx-auto px-4 py-2 mb-6 rounded text-center ${
            status.type==="success"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"
          }`}>
          {status.message}
        </div>
      )}

      {/* Tip Jar */}
      {showTipJar && (
        <div className="mb-6 p-4 bg-yellow-100 rounded mx-auto max-w-md flex justify-between items-center">
          <span>Love Pulse Connect? Cover hosting costs with a tip.</span>
          <button
            onClick={() => {
              handleDonate("Tip Jar");
              // Only non-sensitive UI state is stored in localStorage
              localStorage.setItem("tipJarDismissed","true");
              setShowTipJar(false);
            }}
            className="bg-indigo-600 text-white px-3 py-1 rounded"
          >
            Tip $2
          </button>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex justify-center gap-4 mb-6">
        {(["monthly","yearly"] as const).map(cycle=>(
          <button
            key={cycle}
            onClick={()=>setBillingCycle(cycle)}
            className={`px-4 py-2 rounded ${
              billingCycle===cycle?"bg-indigo-600 text-white":"bg-gray-100"
            }`}
          >
            {cycle.charAt(0).toUpperCase()+cycle.slice(1)}
          </button>
        ))}
      </div>

      {/* Scroll Target */}
      <div ref={upgradeRef} />

      {/* Subscription Plans */}
      <h2 className="text-xl font-semibold text-center mb-4">Subscription Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        {SUBSCRIPTION_PLANS.map(plan=>{
          const isCurrent = plan.id===currentPlan;
          const isLoading = loadingPlanId===plan.id;
          const unit = plan.prices[currency] ?? plan.prices["USD"];
          const priceTxt = billingCycle==="monthly"
            ? formatPrice(unit,currency,"/mo")
            : formatPrice(unit*10,currency,"/yr");

          return (
            <article key={plan.id} className="border rounded p-6 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold mb-4">{priceTxt}</p>
              <ul className="flex-1 mb-4">
                {Object.entries(PROGRAM_LABELS).map(([k,label])=>{
                  const ok = PLAN_REQUIREMENTS[k as ProgramType].includes(plan.id);
                  return (
                    <li key={k} className="flex items-center">
                      <span className={ok?"text-green-600":"text-gray-300"}>{ok?"✔":"✕"}</span>
                      <span className={`ml-2 ${!ok?"text-gray-400":""}`}>{label}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={()=>handleUpgrade(plan.id)}
                disabled={isCurrent||isLoading}
                className={`mt-auto py-2 rounded ${
                  isCurrent?"bg-gray-200":"bg-indigo-600 text-white"
                }`}
              >
                {isCurrent?"Current": isLoading?"Processing…":"Upgrade"}
              </button>
            </article>
          );
        })}
      </div>

      {/* Donation Tiers */}
      <h2 className="text-xl font-semibold text-center mb-4">Donation Tiers</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {DONATION_TIERS.map(t=>(
          <article key={t.name} className="border rounded p-6 flex flex-col">
            <h3 className="font-semibold mb-2">{t.name} Tier</h3>
            <p className="text-sm mb-2">{t.desc}</p>
            <p className="italic mb-4">{t.kes} / {t.usd}</p>
            <PaymentButton
              amount={Number(t.paypalAmt)}
              onSuccess={()=>setStatus({type:"success",message:`${t.name} funded!`})}
            />
          </article>
        ))}
      </div>

      {/* Complaint & Feedback */}
      <SimpleForm
        value={complaint}
        onChange={setComplaint}
        onSubmit={onComplaintSubmit}
        placeholder="Describe an issue..."
        buttonLabel="Submit"
        sent={complaintSent}
        sentMessage="Complaint received!"
        buttonColor="bg-red-600 text-white"
      />
      <SimpleForm
        value={feedback}
        onChange={setFeedback}
        onSubmit={onFeedbackSubmit}
        placeholder="Share feedback..."
        buttonLabel="Send"
        sent={feedbackSent}
        sentMessage="Thank you!"
        buttonColor="bg-indigo-600 text-white"
      />

      {/* Upgrade Popup */}
      {showUpgradePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <h3 className="font-semibold mb-2">Unlock More Features</h3>
            <p className="mb-4">Upgrade for AI tutorials, workouts, and more.</p>
            <button onClick={()=>handleUpgrade("plus")} className="bg-indigo-600 text-white px-4 py-2 rounded mr-2">Upgrade Now</button>
            <button onClick={()=>setShowUpgradePopup(false)} className="underline">Remind Me Later</button>
          </div>
        </div>
      )}
    </div>
  );
}