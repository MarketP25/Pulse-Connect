"use client";

import React from "react";

interface UpgradePlansProps {
  userRole: string;
}

export default function UpgradePlans({ userRole }: UpgradePlansProps) {
  const planOrder = ["basic", "plus", "pro"];
  const currentIndex = planOrder.indexOf(userRole);

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 px-2" id="plans">
      <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-4 text-center">
        Pulse Connect Plans
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="border rounded-lg p-4 sm:p-6 flex flex-col items-center bg-gray-50">
          <h3 className="text-lg font-bold mb-2">Free</h3>
          <ul className="mb-4 text-gray-700 text-sm space-y-1">
            <li>• Basic AI content generation (limited)</li>
            <li>• Standard analytics</li>
            <li>• Community support</li>
            <li>
              • Referral reward: <span className="font-semibold">$1</span> per
              referral
            </li>
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
            <li>
              • Referral reward: <span className="font-semibold">$1.5</span> per
              referral
            </li>
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
            <li>• AI-powered chatbot & voice assistant</li>
            <li>• Full analytics & insights</li>
            <li>• AI image generation</li>
            <li>• Text, voice, and video chat</li>
            <li>• Early access to new features</li>
            <li>• Priority support</li>
            <li>
              • Referral reward: <span className="font-semibold">$2.5</span> per
              referral
            </li>
          </ul>
          <span className="font-bold text-lg text-indigo-800">$15/month</span>
          <button
            className={`block w-full mt-4 bg-indigo-700 text-white py-2 rounded font-semibold hover:bg-indigo-800 transition ${
              currentIndex === 2 || currentIndex < 1
                ? "opacity-50 cursor-not-allowed"
                : ""
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
        Cancel anytime within 24 hours.{" "}
        <span className="font-semibold text-red-500">
          No cashback after 24 hours.
        </span>
      </p>
    </div>
  );
}