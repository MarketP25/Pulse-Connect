// src/lib/firebase.ts

import {
  initializeApp,
  getApps,
  getApp
} from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (make sure these env vars exist in .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// 🔍 Confirm environment variables are being read
console.log("🔥 Firebase API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

// Prevent re-initializing on hot reload
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Expose Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);