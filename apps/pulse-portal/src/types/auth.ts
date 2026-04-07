export interface UserProfile {
  id: string;
  email: string;
  role: "user" | "business" | "admin" | "council";
  region: string;
  verified: boolean;
  sessionToken: string;
  permissions: UserPermission[];
  accessLevel: AccessLevel;
  lastLogin: string;
  mfaEnabled: boolean;
}

export interface UserPermission {
  subsystem: string;
  scopes: string[];
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
}

export interface AccessLevel {
  name: "public" | "authenticated" | "verified" | "business" | "admin" | "council";
  priority: number;
  description: string;
}

export interface SubsystemAccess {
  subsystemId: string;
  userId: string;
  accessToken: string;
  scopes: string[];
  grantedAt: string;
  expiresAt: string;
  refreshToken?: string;
}

export interface AccessRequest {
  id: string;
  userId: string;
  subsystemId: string;
  requestedScopes: string[];
  status: "pending" | "approved" | "denied" | "expired";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
}

export interface RoleBasedAccess {
  role: string;
  subsystems: {
    [subsystemId: string]: {
      allowed: boolean;
      defaultScopes: string[];
      maxScopes: string[];
      requiresApproval: boolean;
    };
  };
}

// Predefined access levels
export const ACCESS_LEVELS: Record<string, AccessLevel> = {
  public: {
    name: "public",
    priority: 0,
    description: "Basic public access"
  },
  authenticated: {
    name: "authenticated",
    priority: 1,
    description: "Logged in users"
  },
  verified: {
    name: "verified",
    priority: 2,
    description: "Verified users with KYC"
  },
  business: {
    name: "business",
    priority: 3,
    description: "Business accounts"
  },
  admin: {
    name: "admin",
    priority: 4,
    description: "System administrators"
  },
  council: {
    name: "council",
    priority: 5,
    description: "Governance council members"
  }
};

// Role-based access matrix
export const ROLE_ACCESS_MATRIX: RoleBasedAccess[] = [
  {
    role: "user",
    subsystems: {
      "places-venues": {
        allowed: true,
        defaultScopes: ["read:places", "write:reservations"],
        maxScopes: ["read:places", "write:reservations", "write:reviews"],
        requiresApproval: false
      },
      communication: {
        allowed: true,
        defaultScopes: ["read:messages", "write:messages"],
        maxScopes: ["read:messages", "write:messages", "manage:contacts"],
        requiresApproval: false
      },
      localization: {
        allowed: true,
        defaultScopes: ["read:translations"],
        maxScopes: ["read:translations"],
        requiresApproval: false
      }
    }
  },
  {
    role: "business",
    subsystems: {
      "places-venues": {
        allowed: true,
        defaultScopes: ["read:places", "write:places", "manage:reservations"],
        maxScopes: ["*"],
        requiresApproval: false
      },
      "pap-marketing": {
        allowed: true,
        defaultScopes: ["read:campaigns", "write:campaigns", "manage:consent"],
        maxScopes: ["*"],
        requiresApproval: false
      },
      matchmaking: {
        allowed: true,
        defaultScopes: ["read:matches", "write:jobs", "manage:contracts"],
        maxScopes: ["*"],
        requiresApproval: false
      },
      ecommerce: {
        allowed: true,
        defaultScopes: ["read:products", "write:products", "manage:inventory"],
        maxScopes: ["*"],
        requiresApproval: false
      },
      communication: {
        allowed: true,
        defaultScopes: ["*"],
        maxScopes: ["*"],
        requiresApproval: false
      }
    }
  },
  {
    role: "admin",
    subsystems: {
      "*": {
        allowed: true,
        defaultScopes: ["*"],
        maxScopes: ["*"],
        requiresApproval: false
      }
    }
  }
];
