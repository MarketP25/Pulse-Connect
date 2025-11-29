// src/app/dashboard/page.tsx
"use client";

import ProgramCard from "@/components/ProgramCard";
import ProfileSettings from "@/components/ProfileSettings";
import UpgradePlans from "@/components/UpgradePlans";
import UserInteractions from "@/components/UserInteractions";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "@/firebase/config";
import { useRole } from "@/context/RoleContext";

// --- Upgrade Reminder Modal ---
function UpgradeReminder({ onClose }: { onClose: () => void }) {
  const { language } = useRole();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-indigo-700 mb-4">
          {language === "sw" ? "Boresha Mpango Wako" : "Upgrade Your Plan"}
        </h2>
        <p className="text-gray-700 mb-4">
          {language === "sw"
            ? "Fungua vipengele zaidi na uboreshe matumizi yako kwa kuboresha PulseConnect!"
            : "Unlock more features and maximize your experience by upgrading your Pulse Connect plan!"}
        </p>
        <a
          href="#plans"
          className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition"
          onClick={onClose}
        >
          {language === "sw" ? "Angalia Mipango" : "View Plans"}
        </a>
      </div>
    </div>
  );
}

// --- Welcome Popup for New Users ---
function WelcomePopup({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">
          Welcome to Pulse Connect, {username}!
        </h2>
        <p className="text-gray-700 mb-4">
          🚀 We’re thrilled to have you join our creative community.
          <br />
          Explore AI-powered tools, connect with others, and grow your
          campaigns.
          <br />
          <span className="font-semibold text-indigo-600">
            Your journey to smarter marketing starts now!
          </span>
        </p>
        <button
          className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition"
          onClick={onClose}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

// --- Upgrade Success Toast ---
function UpgradeSuccessToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">
      Upgrade successful! Enjoy your new features.
    </div>
  );
}

// --- Fake email sender ---
async function sendWelcomeEmail(email: string, username: string) {
  // ...existing code...
}

// --- Dashboard Page ---
export default function DashboardPage() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const {
    role: contextualRole,
    org,
    language,
    loading: contextLoading,
  } = useRole();

  // local state
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [userRole, setUserRole] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [showUpgradeReminder, setShowUpgradeReminder] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderTimeout = useRef<NodeJS.Timeout | null>(null);

  // AI flags & state
  const hasChatAccess = true;
  const hasCampaignAccess = ["plus", "pro", "patron", "patronTrial"].includes(
    userRole
  );
  const hasContentAccess = ["pro", "patron", "patronTrial"].includes(userRole);

  const [chatPrompt, setChatPrompt] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [campaignPrompt, setCampaignPrompt] = useState("");
  const [campaignResponse, setCampaignResponse] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [contentPrompt, setContentPrompt] = useState("");
  const [contentResponse, setContentResponse] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  // Chat handlers
  const handleChatExecute = async () => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai-chat/AIChatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatPrompt }),
      });
      const data = await res.json();
      setChatResponse(data.response || "No response received.");
    } catch {
      setChatResponse("Something went wrong.");
    } finally {
      setChatLoading(false);
    }
  };
  const handleCampaignExecute = async () => {
    setCampaignLoading(true);
    try {
      const res = await fetch("/api/campaign-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: campaignPrompt }),
      });
      const data = await res.json();
      setCampaignResponse(data.response || "No recommendations.");
    } catch {
      setCampaignResponse("Something went wrong.");
    } finally {
      setCampaignLoading(false);
    }
  };
  const handleContentExecute = async () => {
    setContentLoading(true);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contentPrompt }),
      });
      const data = await res.json();
      setContentResponse(data.response || "No content generated.");
    } catch {
      setContentResponse("Something went wrong.");
    } finally {
      setContentLoading(false);
    }
  };

  // upgrade reminder timer
  useEffect(() => {
    function scheduleReminder() {
      if (reminderTimeout.current) clearTimeout(reminderTimeout.current);
      reminderTimeout.current = setTimeout(
        () => {
          setShowUpgradeReminder(true);
        },
        30 * 60 * 1000
      );
    }
    if (!["pro", "patron", "patronTrial"].includes(userRole)) {
      scheduleReminder();
      const reset = () => scheduleReminder();
      window.addEventListener("mousemove", reset);
      window.addEventListener("keydown", reset);
      window.addEventListener("touchstart", reset);
      return () => {
        if (reminderTimeout.current) clearTimeout(reminderTimeout.current);
        window.removeEventListener("mousemove", reset);
        window.removeEventListener("keydown", reset);
        window.removeEventListener("touchstart", reset);
      };
    }
  }, [userRole]);

  // auth & firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) return void router.push("/login");

        const uid = user.uid;
        setUserEmail(user.email || "Anonymous");
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const uname = data.username || "unknown";
          setUsername(uname);
          setReferralCode(data.referralCode || uname);
          setUserRole(data.role || "basic");

          const q = query(
            collection(db, "users"),
            where("referredBy", "==", uname)
          );
          const r = await getDocs(q);
          setReferralCount(r.size);

          const createdAt = data.createdAt?.toDate?.() || data.createdAt;
          if (
            createdAt &&
            Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
          ) {
            setShowWelcome(true);
            if (!data.welcomeEmailSent) {
              await sendWelcomeEmail(user.email || "", uname);
              await updateDoc(userRef, { welcomeEmailSent: true });
            }
          }

          // referral upgrades
          if (["basic", "spark", "boostTrial"].includes(data.role)) {
            let newRole: string | null = null;
            if (r.size >= 10 && data.role !== "patronTrial")
              newRole = "patronTrial";
            else if (r.size >= 5 && data.role === "basic")
              newRole = "boostTrial";
            else if (r.size >= 3 && data.role === "basic") newRole = "spark";
            if (newRole) {
              await updateDoc(userRef, {
                role: newRole,
                upgradedByReferral: true,
              });
              setUserRole(newRole);
              setShowUpgradeSuccess(true);
            }
          }
        }
        setLoading(false);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth, db, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // --- New Services Section ---
  const services = [
    { id: "graphic_design_course", name: "Graphic Design Course", price: 1500 },
    {
      id: "social_management_course",
      name: "Social Management Course",
      price: 1500,
    },
    { id: "web_hosting_service", name: "Web Hosting Service", price: 20000 },
  ];

  const [bookedService, setBookedService] = useState<string | null>(null);

  const handleBookService = (id: string) => {
    setBookedService(id);
    alert(`Service ${id} booked successfully!`);
  };
  // ---

  if (loading || contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-white to-indigo-200
                    px-2 sm:px-4 md:px-6 py-6 sm:py-10 flex flex-col items-center"
    >
      {showUpgradeReminder && (
        <UpgradeReminder onClose={() => setShowUpgradeReminder(false)} />
      )}
      {showWelcome && (
        <WelcomePopup
          username={username}
          onClose={() => setShowWelcome(false)}
        />
      )}
      {showUpgradeSuccess && (
        <UpgradeSuccessToast onClose={() => setShowUpgradeSuccess(false)} />
      )}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-50">
          {error}
        </div>
      )}

      <div className="w-full max-w-2xl space-y-6">
        {/* Welcome card */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-700 mb-1 break-words">
            Welcome, {username}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 break-words">
            Email: <strong>{userEmail}</strong>
          </p>
          {org && (
            <p className="text-sm text-indigo-600 mt-1">
              Viewing workspace tools for <strong>{org}</strong>
            </p>
          )}
        </div>

        {/* Guest personalization */}
        {contextualRole === "guest" && (
          <div className="bg-indigo-50 p-4 rounded border border-indigo-200 text-center">
            <p className="text-sm text-gray-700">
              Want smarter suggestions based on your interests?
            </p>
            <div className="mt-2 flex justify-center gap-4">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                Set My Role
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
                Keep Exploring
              </button>
            </div>
          </div>
        )}

        <ProfileSettings userEmail={userEmail} username={username} />

        {/* Access badge */}
        <div className="bg-white shadow-sm border rounded-lg p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500 mb-1">Access Level</p>
          <div
            className="inline-block px-2 py-1 sm:px-3 sm:py-1 bg-indigo-50 border border-indigo-200
                          text-indigo-700 rounded-full text-xs font-semibold"
          >
            {userRole.toUpperCase()}
          </div>
        </div>

        {/* Referral */}
        <div className="bg-white shadow-sm border rounded-lg p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
            Referral Progress
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-1">
            Referred <strong>{referralCount}</strong> user
            {referralCount !== 1 && "s"}
          </p>
          <p className="text-xs text-gray-500 mb-2">Your link:</p>
          <code className="block text-indigo-700 bg-indigo-50 px-2 py-1 sm:px-3 sm:py-1 rounded text-xs break-all">
            https://pulseconnect.app/signup?ref={referralCode}
          </code>
          {referralCount < 3 && (
            <p className="mt-2 text-gray-500 text-xs sm:text-sm italic">
              Refer {3 - referralCount} more to unlock the{" "}
              <strong>Spark</strong> tier
            </p>
          )}
          {referralCount >= 3 && (
            <p className="mt-2 text-green-700 text-xs sm:text-sm font-medium">
              🎉 Spark reward active via referrals
            </p>
          )}
          {referralCount >= 5 && userRole === "boostTrial" && (
            <p className="mt-1 text-blue-700 text-xs sm:text-sm">
              🚀 Boost trial unlocked
            </p>
          )}
          {referralCount >= 10 && userRole === "patronTrial" && (
            <p className="mt-1 text-purple-700 text-xs sm:text-sm">
              👑 Patron badge unlocked!
            </p>
          )}
        </div>

        <UserInteractions userRole={userRole} />

        {/* AI Assistant */}
        <div className="space-y-8 mt-6">
          <ProgramCard
            programKey="ai-chat"
            programLabel="AI Chat"
            promptValue={chatPrompt}
            onPromptChange={setChatPrompt}
            onExecute={handleChatExecute}
            isLoading={chatLoading}
            isAccessible={hasChatAccess}
          />
          {chatResponse && (
            <div className="bg-white border rounded p-3 text-sm text-gray-700">
              <strong>AI Response:</strong> {chatResponse}
            </div>
          )}
          <ProgramCard
            programKey="campaign"
            programLabel="Campaign Recommendations"
            promptValue={campaignPrompt}
            onPromptChange={setCampaignPrompt}
            onExecute={handleCampaignExecute}
            isLoading={campaignLoading}
            isAccessible={hasCampaignAccess}
          />
          {campaignResponse && (
            <div className="bg-white border rounded p-3 text-sm text-gray-700">
              <strong>Campaign Ideas:</strong> {campaignResponse}
            </div>
          )}
          <ProgramCard
            programKey="generate-content"
            programLabel="Content Generator"
            promptValue={contentPrompt}
            onPromptChange={setContentPrompt}
            onExecute={handleContentExecute}
            isLoading={contentLoading}
            isAccessible={hasContentAccess}
          />
          {contentResponse && (
            <div className="bg-white border rounded p-3 text-sm text-gray-700">
              <strong>Generated Output:</strong> {contentResponse}
            </div>
          )}
        </div>

        {/* New Services Section */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Available Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-indigo-50 p-4 rounded-lg shadow"
              >
                <h3 className="text-lg font-bold text-indigo-700">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-2">Price: ${service.price}</p>
                <button
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                  onClick={() => handleBookService(service.id)}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
          {bookedService && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
              You have successfully booked the service: {bookedService}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded transition text-sm sm:text-base"
          >
            Logout
          </button>
        </div>

        <UpgradePlans userRole={userRole} />
      </div>

      {/* Footer */}
      <footer className="w-full text-center mt-8 text-xs text-gray-500">
        <a href="/terms" className="underline mr-4">
          Terms of Service
        </a>
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
