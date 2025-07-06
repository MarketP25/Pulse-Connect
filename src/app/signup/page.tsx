"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";

export default function SignupPage() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const referrer = searchParams.get("ref") || null;

  const checkUsernameTaken = async (desired: string) => {
    const q = query(
      collection(db, "users"),
      where("username", "==", desired.trim().toLowerCase())
    );
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (await checkUsernameTaken(username)) {
      setError("Username is already taken. Please choose another.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: username.trim().toLowerCase(),
        referralCode: username.trim().toLowerCase(),
        role: "basic",
        referredBy: referrer,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError(String((err as { message?: string }).message));
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-indigo-200 px-4">
      <div className="w-full max-w-md">
        {!success ? (
          <form
            onSubmit={handleSignup}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition"
          >
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold text-indigo-700">Join Pulse Connect</h1>
              <p className="text-gray-500 text-sm mt-1">Start your journey with smarter marketing</p>
            </div>

            {referrer && (
              <p className="text-sm text-indigo-600 mb-4">
                You’re joining via referral: <span className="font-mono">{referrer}</span>
              </p>
            )}

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
              required
              autoComplete="username"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
              required
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
              required
              autoComplete="new-password"
            />

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
            >
              Create Account
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already a member?{" "}
              <a href="/login" className="text-indigo-700 underline">
                Log in
              </a>
            </p>
          </form>
        ) : (
          <div className="bg-white border border-indigo-200 shadow-md rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-indigo-700 mb-2">Welcome to Pulse Connect!</h2>
            <p className="text-gray-700 text-sm">
              You’ve officially joined a global community of creators, entrepreneurs, and marketers.
              Your journey begins now—referrals, campaigns, and next-level growth.
            </p>
            <p className="mt-4 text-indigo-600 text-sm italic">
              Redirecting you to your dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}