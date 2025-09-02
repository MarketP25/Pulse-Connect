// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { Metadata } from "next";
import { RoleProvider } from "@/context/RoleContext";
import { GlobalTranslationProvider } from "@/components/GlobalTranslationProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PulseConnect",
  description: "AI-powered digital marketing platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={inter.className}>
        <GlobalTranslationProvider>
          <RoleProvider>{children}</RoleProvider>
        </GlobalTranslationProvider>
      </body>
    </html>
  );
}
