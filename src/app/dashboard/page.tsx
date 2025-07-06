"use client";
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

// --- Upgrade Reminder Modal ---
function UpgradeReminder({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative text-center">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-indigo-700 mb-4">Upgrade Your Plan</h2>
        <p className="text-gray-700 mb-4">
          Unlock more features and maximize your experience by upgrading your Pulse Connect plan!
        </p>
        <a
          href="#plans"
          className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition"
          onClick={onClose}
        >
          View Plans
        </a>
      </div>
    </div>
  );
}

// --- Welcome Popup for New Users ---
function WelcomePopup({ username, onClose }: { username: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative text-center">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">Welcome to Pulse Connect, {username}!</h2>
        <p className="text-gray-700 mb-4">
          🚀 We&apos;re thrilled to have you join our creative community.<br />
          Explore AI-powered tools, connect with others, and grow your campaigns.<br />
          <span className="font-semibold text-indigo-600">Your journey to smarter marketing starts now!</span>
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

// --- User Interactions Section ---
function UserInteractions({ userRole }: { userRole: string }) {
  const isPlus = ["plus", "pro", "patron", "patronTrial"].includes(userRole);
  const isPro = ["pro", "patron", "patronTrial"].includes(userRole);

  return (
    <div className="bg-white shadow-sm border rounded-lg p-5 mb-6">
      <h2 className="text-lg font-semibold text-indigo-700 mb-2">User Interactions</h2>
      <div className="space-y-3">
        <div>
          <span className="font-semibold">Text Chat: </span>
          {isPlus ? (
            <button className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition">
              Start Chat
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2">Upgrade to Plus for group chat</span>
          )}
        </div>
        <div>
          <span className="font-semibold">Voice Notes: </span>
          {isPro ? (
            <button className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition">
              Send Voice Note
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2">Upgrade to Pro for voice notes</span>
          )}
        </div>
        <div>
          <span className="font-semibold">Video Calls: </span>
          {isPro ? (
            <button className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition">
              Start Video Call
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2">Upgrade to Pro for video calls</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Profile/Settings Section ---
function ProfileSettings({
  userEmail,
  username,
}: {
  userEmail: string;
  username: string;
}) {
  // For demo, just display info. Add edit logic as needed.
  return (
    <div className="bg-white shadow-sm border rounded-lg p-5 mb-6">
      <h2 className="text-lg font-semibold text-indigo-700 mb-2">Profile Settings</h2>
      <p className="mb-1">Email: <span className="font-mono">{userEmail}</span></p>
      <p>Username: <span className="font-mono">{username}</span></p>
      {/* Add edit form here if needed */}
    </div>
  );
}

// --- Upgrade Plans Section (always visible, responsive) ---
function UpgradePlans({ userRole }: { userRole: string }) {
  // Plan order: basic < plus < pro
  const planOrder = ["basic", "plus", "pro"];
  const currentIndex = planOrder.indexOf(userRole);

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 px-2" id="plans">
      <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-4 text-center">Pulse Connect Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="border rounded-lg p-4 sm:p-6 flex flex-col items-center bg-gray-50">
          <h3 className="text-lg font-bold mb-2">Free</h3>
          <ul className="mb-4 text-gray-700 text-sm space-y-1">
            <li>• Basic AI content generation (limited)</li>
            <li>• Standard analytics</li>
            <li>• Community support</li>
            <li>• Referral reward: <span className="font-semibold">$1</span> per referral</li>
            <li>• Limited user messaging</li>
          </ul>
          <span className="font-bold text-lg">Free</span>
        </div>
        {/* Plus Plan */}
        <div className="border-2 border-indigo-400 rounded-lg p-4 sm:p-6 flex flex-col items-center bg-indigo-50">
          <h3 className="text-lg font-bold mb-2 text-indigo-700">Plus</h3>
          <ul className="mb-4 text-gray-700 text-sm space-y-1">
            <li>• More AI content credits</li>
            <li>• Smart campaign recommendations</li>
            <li>• AI-powered chatbot support</li>
            <li>• Advanced analytics</li>
            <li>• Group text chat</li>
            <li>• Priority support</li>
            <li>• Referral reward: <span className="font-semibold">$1.5</span> per referral</li>
          </ul>
          <span className="font-bold text-lg text-indigo-700">$7/month</span>
          <button
            className={`block w-full mt-4 bg-indigo-500 text-white py-2 rounded font-semibold hover:bg-indigo-600 transition ${
              currentIndex >= 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentIndex >= 1}
            onClick={() => {
              if (currentIndex < 1) window.location.href = "/upgrade?plan=plus";
            }}
          >
            {currentIndex === 0
              ? "Upgrade to Plus"
              : currentIndex === 1
              ? "Current Plan"
              : "Upgrade to Pro First"}
          </button>
        </div>
        {/* Pro Plan */}
        <div className="border-2 border-indigo-600 rounded-lg p-4 sm:p-6 flex flex-col items-center bg-indigo-100">
          <h3 className="text-lg font-bold mb-2 text-indigo-800">Pro</h3>
          <ul className="mb-4 text-gray-700 text-sm space-y-1">
            <li>• Unlimited AI content generation</li>
            <li>• All campaign recommendations</li>
            <li>• AI-powered chatbot &amp; voice assistant</li>
            <li>• Full analytics &amp; insights</li>
            <li>• AI image generation</li>
            <li>• Text, voice, and video chat</li>
            <li>• Early access to new features</li>
            <li>• Priority support</li>
            <li>• Referral reward: <span className="font-semibold">$2.5</span> per referral</li>
          </ul>
          <span className="font-bold text-lg text-indigo-800">$15/month</span>
          <button
            className={`block w-full mt-4 bg-indigo-700 text-white py-2 rounded font-semibold hover:bg-indigo-800 transition ${
              currentIndex === 2 ? "opacity-50 cursor-not-allowed" : currentIndex < 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentIndex === 2 || currentIndex < 1}
            onClick={() => {
              if (currentIndex === 1) window.location.href = "/upgrade?plan=pro";
            }}
          >
            {currentIndex < 1
              ? "Upgrade to Plus First"
              : currentIndex === 1
              ? "Upgrade to Pro"
              : "Current Plan"}
          </button>
        </div>
      </div>
      <p className="text-xs text-center text-gray-400 mt-6">
        Cancel anytime within 24 hours. <span className="font-semibold text-red-500">No cashback after 24 hours.</span>
      </p>
    </div>
  );
}

// --- Simulated email sending function (replace with your backend/email API) ---
async function sendWelcomeEmail(email: string, username: string) {
  // Replace this with your actual email sending logic (e.g., API call)
  // Example: await fetch("/api/send-welcome-email", { method: "POST", body: JSON.stringify({ email, username }) });
  console.log(`Welcome email sent to ${email} for ${username}`);
}

export default function DashboardPage() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();

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

  // Upgrade reminder every 30min of awake screen
  useEffect(() => {
    function scheduleReminder() {
      if (reminderTimeout.current) clearTimeout(reminderTimeout.current);
      reminderTimeout.current = setTimeout(() => {
        setShowUpgradeReminder(true);
      }, 30 * 60 * 1000); // 30 minutes
    }

    // Show reminder only for non-premium users
    if (!["pro", "patron", "patronTrial"].includes(userRole)) {
      scheduleReminder();
      // Reset timer on user activity
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const uid = user.uid;
          setUserEmail(user.email || "Anonymous");

          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const uname = userData.username || "unknown";
            setUsername(uname);
            setReferralCode(userData.referralCode || uname);
            setUserRole(userData.role || "basic");

            const q = query(collection(db, "users"), where("referredBy", "==", uname));
            const snapshot = await getDocs(q);
            const count = snapshot.size;
            setReferralCount(count);

            // Show welcome popup for new users (registered within last 24hrs)
            const createdAt = userData.createdAt?.toDate?.() || userData.createdAt;
            if (createdAt) {
              const now = new Date();
              const diff = now.getTime() - new Date(createdAt).getTime();
              if (diff < 24 * 60 * 60 * 1000) {
                setShowWelcome(true);
                // Send welcome email only once (if not sent)
                if (!userData.welcomeEmailSent) {
                  await sendWelcomeEmail(user.email || "", uname);
                  await updateDoc(userRef, { welcomeEmailSent: true });
                }
              }
            }

            // Automatic role upgrades
            if (["basic", "spark", "boostTrial"].includes(userData.role)) {
              let newRole = null;
              if (count >= 10 && userData.role !== "patronTrial") newRole = "patronTrial";
              else if (count >= 5 && userData.role === "basic") newRole = "boostTrial";
              else if (count >= 3 && userData.role === "basic") newRole = "spark";

              if (newRole) {
                await updateDoc(userRef, {
                  role: newRole,
                  upgradedByReferral: true,
                });
                setUserRole(newRole);
              }
            }
          }

          setLoading(false);
        } else {
          router.push("/login");
        }
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

  // Simulate upgrade success (for demo, call setShowUpgradeSuccess(true) after upgrade)
  // Example: setShowUpgradeSuccess(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-white to-indigo-200 px-2 sm:px-4 md:px-6 py-6 sm:py-10 flex flex-col items-center">
      {showUpgradeReminder && (
        <UpgradeReminder onClose={() => setShowUpgradeReminder(false)} />
      )}
      {showWelcome && (
        <WelcomePopup username={username} onClose={() => setShowWelcome(false)} />
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
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-700 mb-1 break-words">Welcome, {username}</h1>
          <p className="text-xs sm:text-sm text-gray-600 break-words">
            Email: <strong>{userEmail}</strong>
          </p>
        </div>

        <ProfileSettings userEmail={userEmail} username={username} />

        <div className="bg-white shadow-sm border rounded-lg p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500 mb-1">Access Level</p>
          <div className="inline-block px-2 py-1 sm:px-3 sm:py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-semibold">
            {userRole.toUpperCase()}
          </div>
        </div>

        <div className="bg-white shadow-sm border rounded-lg p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Referral Progress</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-1">
            Referred <strong>{referralCount}</strong> user{referralCount !== 1 && "s"}
          </p>
          <p className="text-xs text-gray-500 mb-2">Your link:</p>
          <code className="block text-indigo-700 bg-indigo-50 px-2 py-1 sm:px-3 sm:py-1 rounded text-xs break-all">
            https://pulseconnect.app/signup?ref={referralCode}
          </code>

          {referralCount < 3 && (
            <p className="mt-2 text-gray-500 text-xs sm:text-sm italic">
              Refer {3 - referralCount} more to unlock the <strong>Spark</strong> tier
            </p>
          )}
          {referralCount >= 3 && (
            <p className="mt-2 text-green-700 text-xs sm:text-sm font-medium">
              🎉 Spark reward active via referrals
            </p>
          )}
          {referralCount >= 5 && userRole === "boostTrial" && (
            <p className="mt-1 text-blue-700 text-xs sm:text-sm">🚀 Boost trial unlocked</p>
          )}
          {referralCount >= 10 && userRole === "patronTrial" && (
            <p className="mt-1 text-purple-700 text-xs sm:text-sm">👑 Patron badge unlocked!</p>
          )}
        </div>

        <UserInteractions userRole={userRole} />

        <div className="text-center">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded transition text-sm sm:text-base"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Upgrade Plans Section (anchor for reminder) */}
      <UpgradePlans userRole={userRole} />
      {/* Footer with terms/privacy */}
      <footer className="w-full text-center mt-8 text-xs text-gray-500">
        <a href="/terms" className="underline mr-4">Terms of Service</a>
        <a href="/privacy" className="underline">Privacy Policy</a>
      </footer>
    </div>
  );
}