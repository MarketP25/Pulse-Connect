"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
    });

    return () => unsubscribe();
  }, [auth, db, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-indigo-700 font-bold text-lg">Pulse Connect</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Welcome */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-indigo-700 mb-1">Welcome, {username}</h2>
          <p className="text-gray-600 text-sm">Email: <strong>{userEmail}</strong></p>
        </section>

        {/* Grid Layout */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Access Level */}
          <div className="bg-white border rounded-lg p-5 flex flex-col justify-between">
            <h3 className="text-sm text-gray-500 mb-1">Access Level</h3>
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold self-start">
              {userRole.toUpperCase()}
            </span>
            {userRole === "spark" && (
              <p className="mt-2 text-green-600 text-sm">🔥 Spark tier active via referrals</p>
            )}
            {userRole === "boostTrial" && (
              <p className="mt-2 text-blue-600 text-sm">🚀 Boost trial unlocked</p>
            )}
            {userRole === "patronTrial" && (
              <p className="mt-2 text-purple-600 text-sm">👑 Patron badge unlocked!</p>
            )}
          </div>

          {/* Referral Overview */}
          <div className="bg-white border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Referral Progress</h3>
            <p className="text-sm text-gray-700 mb-1">
              Referred: <strong>{referralCount}</strong> user{referralCount !== 1 && "s"}
            </p>
            <p className="text-xs text-gray-500 mb-1">Your referral link:</p>
            <code className="block text-indigo-700 bg-indigo-50 px-3 py-1 rounded text-xs break-words">
              https://pulseconnect.app/signup?ref={referralCode}
            </code>
            {referralCount < 3 && (
              <p className="mt-2 text-sm text-gray-600 italic">
                💡 Refer {3 - referralCount} more to unlock <strong>Spark</strong>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}