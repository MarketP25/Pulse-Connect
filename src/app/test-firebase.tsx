"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { app } from "@/firebase/config";

export default function FirebaseTest() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("Connecting to Firebase...");

  useEffect(() => {
    const auth = getAuth(app);

    // Watch for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setStatus(`✅ Connected — UID: ${firebaseUser.uid}`);
      } else {
        setStatus("⚠️ No active session.");
      }
    });

    // Authenticate anonymously (for testing only)
    signInAnonymously(auth).catch((error) =>
      setStatus(`❌ Firebase error: ${error.message}`)
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-mono text-lg px-4">
      <div className="p-6 rounded-lg border border-foreground/10 shadow-sm bg-white/5 backdrop-blur max-w-md w-full text-center">
        <p className="mb-2">{status}</p>
        {user && (
          <pre className="text-sm text-foreground/60 break-words">
            User UID: {user.uid}
          </pre>
        )}
      </div>
    </div>
  );
}
