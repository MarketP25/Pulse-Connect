import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@pulsco/pwa";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DPO Dashboard - Pulsco Governance",
  description: "Data protection, privacy compliance, and incident oversight"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0ea5a4" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <PwaRegister appId="@pulsco/dpo-dashboard" />
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
