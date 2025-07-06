import { initializeApp, getApps, getApp } from "firebase/app";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtVE2utCUY1SVqX1cGKNyDUPQnUjtTz4I",
  authDomain: "marketpulse-tech.firebaseapp.com",
  projectId: "marketpulse-tech",
  storageBucket: "marketpulse-tech.appspot.com", // <-- fixed: should be .appspot.com
  messagingSenderId: "171998488670",
  appId: "1:171998488670:web:57dd1d3bb5ad69ad4a6ccf",
  measurementId: "G-2T1S0CKMDV"
};

// Initialize Firebase (prevent re-initialization in Next.js)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();