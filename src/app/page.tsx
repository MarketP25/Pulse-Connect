"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/firebase/config";

export default function LoginPage() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  function getErrorMessage(code: string): string {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already in use.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/user-not-found":
        return "No user found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      default:
        return "An error occurred. Please try again.";
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (email && password) {
        if (isSignUp) {
          const referrer = searchParams.get("ref");
          if (referrer && referrer.toLowerCase() === email.toLowerCase()) {
            setError("You cannot refer yourself.");
            setLoading(false);
            return;
          }

          let referredBy: string | null = null;
          if (referrer) {
            const refSnap = await getDoc(doc(db, "users", referrer));
            if (refSnap.exists()) referredBy = referrer;
            else {
              setError("Invalid referral code.");
              setLoading(false);
              return;
            }
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            role: "basic",
            referredBy,
            createdAt: serverTimestamp(),
          });

          await sendEmailVerification(user);
          setInfo("Account created! Please check your email for verification.");
          setLoading(false);
          return;
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          if (!user.emailVerified) {
            setError("Please verify your email before logging in.");
            setLoading(false);
            return;
          }
        }
        router.push("/dashboard");
      } else {
        setError("Please enter both email and password.");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        setError(
          getErrorMessage(
            (err as { code?: string; message?: string }).code ||
            (err as { message?: string }).message || ""
          )
        );
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (!email) {
        setError("Please enter your email to reset password.");
        setLoading(false);
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setInfo("Password reset email sent! Please check your inbox.");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        setError(
          getErrorMessage(
            (err as { code?: string; message?: string }).code ||
            (err as { message?: string }).message || ""
          )
        );
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200 flex items-center justify-center px-4">
      <form
        onSubmit={showReset ? handleResetPassword : handleAuth}
        className="w-full max-w-md p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        aria-label={isSignUp ? "Sign up form" : "Login form"}
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-700">Pulse Connect</h1>
          <p className="text-gray-500 text-sm mt-1">Your digital marketing command center</p>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {showReset
            ? "Reset Your Password"
            : isSignUp
            ? "Create a Pulse Connect Account"
            : "Sign In to Pulse Connect"}
        </h2>

        <label htmlFor="email" className="sr-only">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        {!showReset && (
          <>
            <label htmlFor="password" className="sr-only">Password</label>
            {isSignUp ? (
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mb-4 px-4 py-2 border rounded"
                required
              />
            ) : (
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mb-4 px-4 py-2 border rounded"
                required
              />
            )}
          </>
        )}

        {(error || info) && (
          <p
            className={`mb-4 text-sm ${error ? "text-red-500" : "text-green-600"}`}
            role="alert"
          >
            {error || info}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : showReset
            ? "Send Reset Email"
            : isSignUp
            ? "Sign Up"
            : "Login"}
        </button>

        <div className="flex flex-col items-center mt-4 gap-2">
          {!showReset && (
            <button
              type="button"
              className="text-blue-600 underline text-sm"
              onClick={() => setShowReset(true)}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
          {showReset && (
            <button
              type="button"
              className="text-blue-600 underline text-sm"
              onClick={() => setShowReset(false)}
              disabled={loading}
            >
              Back to {isSignUp ? "Sign Up" : "Login"}
            </button>
          )}
        </div>

        <p className="text-sm text-center mt-4">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-blue-600 underline"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setShowReset(false);
              setError("");
              setInfo("");
            }}
            disabled={loading}
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}