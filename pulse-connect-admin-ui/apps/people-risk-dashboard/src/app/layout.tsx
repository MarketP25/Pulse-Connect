import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { PwaRegister } from "@pulsco/pwa";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "People Risk Dashboard - Pulsco Admin",
  description: "People risk, HR compliance, and organizational resilience monitoring"
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.jpeg" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      </head>
      <body className={inter.className}>
        <PwaRegister appId="@pulsco/people-risk-dashboard" />
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  );
}

