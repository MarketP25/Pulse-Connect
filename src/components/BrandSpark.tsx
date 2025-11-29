import React from "react";

interface BrandSparkProps {
  label: string;
  show: boolean;
}

export default function BrandSpark({ label, show }: BrandSparkProps) {
  return (
    <div className="relative inline-block">
      <button
        disabled
        className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded cursor-not-allowed relative z-10 bg-white"
      >
        {label}
      </button>

      {show && (
        <div className="absolute inset-0 z-0 animate-shimmer pointer-events-none rounded border border-transparent">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-30" />
        </div>
      )}
    </div>
  );
}