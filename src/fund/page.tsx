"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { app } from "@/firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import Image from "next/image";

export default function FundPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [disableUpgrade, setDisableUpgrade] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const router = useRouter();

  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email || "");
        setEmailVerified(!!user.emailVerified);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const handleUpgrade = async (tier: string) => {
    setDisableUpgrade(true);
    setStatus(null);
    try {
      await setDoc(
        doc(db, "upgradeLogs", `${userId}_${Date.now()}`),
        {
          userId,
          userEmail,
          tier,
          attemptedAt: serverTimestamp(),
        }
      );
      if (!emailVerified) {
        setStatus({
          type: "error",
          message: "Please verify your email before upgrading. Check your inbox for a verification link.",
        });
        setDisableUpgrade(false);
        return;
      }
      await updateDoc(doc(db, "users", userId), {
        role: tier,
        upgradedAt: serverTimestamp(),
      });
      setStatus({ type: "success", message: `You've been upgraded to ${tier.toUpperCase()} 🎉` });
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      let message = "Upgrade failed.";
      if (err instanceof Error) {
        message += " " + err.message;
      }
      setStatus({ type: "error", message });
      setDisableUpgrade(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim()) return;
    await addDoc(collection(db, "complaints"), {
      userId,
      userEmail,
      complaint,
      createdAt: serverTimestamp(),
    });
    setComplaint("");
    setComplaintSent(true);
    setTimeout(() => setComplaintSent(false), 3000);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    await addDoc(collection(db, "feedback"), {
      userId,
      userEmail,
      feedback,
      createdAt: serverTimestamp(),
    });
    setFeedback("");
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  if (loading) {
    return <p className="text-center py-12 text-gray-600">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 flex flex-col items-center">
      <Image
        src="/logo.png"
        alt="MARKET PULSE PRO"
        width={96}
        height={96}
        className="w-24 mb-4"
      />
      <h1 className="text-3xl font-bold text-indigo-700 text-center">
        Support Pulse Connect
      </h1>
      <p className="text-sm text-gray-600 text-center max-w-md mt-2 mb-8">
        Choose a tier below to contribute. Upgrades activate immediately, and you’ll
        receive a confirmation via email.
      </p>

      <div aria-live="polite" className="min-h-[2rem] mb-4">
        {status && (
          <div
            className={`text-center px-4 py-2 rounded ${
              status.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[
          {
            name: "Spark",
            amountKES: "KES 500",
            amountUSD: "5",
            desc: "Unlocks unlimited campaigns & uploads.",
            paypalAmount: "5",
          },
          {
            name: "Patron",
            amountKES: "KES 2,500",
            amountUSD: "25",
            desc: "Early features + dashboard badge.",
            paypalAmount: "25",
          },
          {
            name: "Investor",
            amountKES: "KES 10,000",
            amountUSD: "100",
            desc: "Partner status + creator support spotlight.",
            paypalAmount: "100",
          },
        ].map((tier) => (
          <div
            key={tier.name}
            className="bg-white p-6 border rounded shadow flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-indigo-700">
                {tier.name} Tier
              </h2>
              <p className="text-sm text-gray-600 mt-1">{tier.desc}</p>
              <p className="text-sm text-gray-500 mt-2 italic">
                {tier.amountKES} / ${tier.amountUSD}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`https://paypal.me/marketpulse/${tier.paypalAmount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-600 text-white text-sm text-center py-2 px-4 rounded hover:bg-indigo-700 transition"
              >
                Pay via PayPal – ${tier.paypalAmount}
              </a>
              <button
                onClick={() => handleUpgrade(tier.name.toLowerCase())}
                className="text-xs text-indigo-600 underline disabled:opacity-50"
                disabled={disableUpgrade}
              >
                Mark as Funded
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-red-500 mt-8">
        ⚠️ All payments are final after 2 hours. No reversals will be processed past this period.
      </p>

      <p className="text-xs text-gray-500 mt-2">
        Prefer direct support? Email{" "}
        <a href="mailto:support@marketpulsepro.com" className="underline">
          support@marketpulsepro.com
        </a>{" "}
        to request bank transfer details.
      </p>

      {/* Complaints Section */}
      <div className="mt-10 w-full max-w-md">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Submit a Complaint</h3>
        <form onSubmit={handleComplaintSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="flex-1 border rounded px-2 py-1 text-sm"
            placeholder="Describe your issue or complaint..."
            value={complaint}
            onChange={e => setComplaint(e.target.value)}
            required
            maxLength={500}
            aria-label="Complaint"
          />
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-1 rounded font-semibold hover:bg-red-700 transition text-sm"
            disabled={!complaint.trim()}
          >
            Submit
          </button>
        </form>
        {complaintSent && (
          <div className="text-green-600 text-xs mt-2">Your complaint has been received. Thank you!</div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="mt-8 w-full max-w-md">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Your Feedback</h3>
        <form onSubmit={handleFeedbackSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="flex-1 border rounded px-2 py-1 text-sm"
            placeholder="Share your feedback or suggestions..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            required
            maxLength={300}
            aria-label="Feedback"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-1 rounded font-semibold hover:bg-indigo-700 transition text-sm"
            disabled={!feedback.trim()}
          >
            Send
          </button>
        </form>
        {feedbackSent && (
          <div className="text-green-600 text-xs mt-2">Thank you for your feedback!</div>
        )}
      </div>
    </div>
  );
}