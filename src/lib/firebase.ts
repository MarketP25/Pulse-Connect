// src/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getPerformance, trace } from "firebase/performance";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ✅ Firebase config from .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!, // Optional
};

// 🔍 Confirm environment variables are being read
// ...existing code...

// 🔄 Prevent duplicate init on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 🛡️ Initialize App Check with reCAPTCHA v3
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6Lc8jolrAAAAAANNL4wOFkNvXg-0OUqCC9KZiGoiB"),
  isTokenAutoRefreshEnabled: true,
});

// 📊 Initialize Performance Monitoring
const perf = getPerformance(app);

// 🧭 Custom Performance Trace for Firebase Initialization
try {
  const initTrace = trace(perf, "firebase_init_trace");
  initTrace.start();

  // Wrap any additional setup here if needed

  initTrace.stop();
  // ...existing code...
} catch (error) {
  // ...existing code...
}

// 🗂️ Expose Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);