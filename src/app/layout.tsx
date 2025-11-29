// src/app/layout.tsx
import "./globals.css";
import { Inter }        from "next/font/google";
import { Metadata }     from "next";
import { RoleProvider } from "@/context/RoleContext";  // ← your custom provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PulseConnect",
  description: "AI-powered digital marketing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap everything in RoleProvider */}
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}