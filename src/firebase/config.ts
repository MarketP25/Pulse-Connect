// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtVE2utCUY1SVqX1cGKNyDUPQnUjtTz4I",
  authDomain: "marketpulse-tech.firebaseapp.com",
  projectId: "marketpulse-tech", // ✅ typo fixed
  storageBucket: "marketpulse-tech.appspot.com",
  messagingSenderId: "171998488670",
  appId: "1:171998488670:web:57dd1d3bb5ad69ad4a6ccf",
  measurementId: "G-2T1S0CKMDV",
};

// Use existing app instance if already initialized
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);