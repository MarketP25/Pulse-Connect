import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlProvider } from "next-intl";
import { notFound } from "next/navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse Connect",
  description: "Council-grade override governance",
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  let messages;
  try {
    messages = require(`../../messages/${params.locale}.json`);
  } catch (error) {
    notFound();
  }

  return (
    <html lang={params.locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlProvider messages={messages}>
          {children}
        </NextIntlProvider>
      </body>
    </html>
  );
}