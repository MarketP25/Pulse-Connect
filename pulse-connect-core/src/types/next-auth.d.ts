// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRole } from "@/lib/auth/permissions";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    subscription?: {
      tier: "FREE" | "PRO" | "ENTERPRISE";
      status: "active" | "inactive" | "cancelled";
      expiresAt?: string;
    };
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      subscription?: {
        tier: "FREE" | "PRO" | "ENTERPRISE";
        status: "active" | "inactive" | "cancelled";
        expiresAt?: string;
      };
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    subscription?: {
      tier: "FREE" | "PRO" | "ENTERPRISE";
      status: "active" | "inactive" | "cancelled";
      expiresAt?: string;
    };
  }
}
