export interface MatchmakingProfile {
  id: string;
  userId: string;
  displayName: string;
  avatar?: string;
  bio: string;
  location: string;
  skills: string[];
  interests: string[];
  experience: string;
  availability: "full-time" | "part-time" | "freelance";
  languages: string[];
  timezone: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchmakingPreferences {
  id: string;
  userId: string;
  matchType: "professional" | "personal" | "both";
  preferredSkills: string[];
  preferredIndustries: string[];
  preferredExperience: string;
  maxDistance: number; // in kilometers
  availability: "full-time" | "part-time" | "freelance";
  languages: string[];
  minMatchScore: number;
  notifications: boolean;
  privacySettings: {
    showLocation: boolean;
    showAvailability: boolean;
    showSkills: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchResult {
  id: string;
  profile: MatchmakingProfile;
  matchScore: number;
  matchType: "professional" | "personal";
  compatibility: {
    skills: number;
    interests: number;
    location: number;
    availability: number;
  };
  distance?: number;
  commonConnections: number;
  mutualInterests: string[];
  recommendedActions: string[];
  expiresAt: Date;
  createdAt: Date;
}

export interface MatchmakingContract {
  id: string;
  participants: string[];
  type: "collaboration" | "mentorship" | "project" | "partnership";
  status: "pending" | "active" | "completed" | "cancelled";
  terms: {
    duration?: number; // in days
    compensation?: {
      amount: number;
      currency: string;
      type: "fixed" | "hourly" | "equity";
    };
    deliverables?: string[];
    milestones?: Array<{
      description: string;
      dueDate: Date;
      completed: boolean;
    }>;
  };
  governance: {
    policyId: string;
    complianceRequirements: string[];
    disputeResolution: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface MatchmakingStats {
  totalMatches: number;
  activeContracts: number;
  successRate: number;
  averageMatchScore: number;
  topSkills: Array<{
    skill: string;
    count: number;
  }>;
  matchTrends: Array<{
    date: string;
    matches: number;
  }>;
}

export interface MatchmakingFilters {
  skills?: string[];
  industries?: string[];
  location?: string;
  maxDistance?: number;
  experience?: string;
  availability?: string;
  minScore?: number;
  verifiedOnly?: boolean;
}

export interface MatchmakingNotification {
  id: string;
  type: "new_match" | "contract_offer" | "contract_update" | "system_message";
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export type MatchmakingAction =
  | { type: "UPDATE_PROFILE"; payload: Partial<MatchmakingProfile> }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<MatchmakingPreferences> }
  | { type: "ADD_MATCH"; payload: MatchResult }
  | { type: "REMOVE_MATCH"; payload: string }
  | { type: "ACCEPT_MATCH"; payload: string }
  | { type: "REJECT_MATCH"; payload: string }
  | {
      type: "CREATE_CONTRACT";
      payload: Omit<MatchmakingContract, "id" | "createdAt" | "updatedAt">;
    }
  | { type: "UPDATE_CONTRACT"; payload: Partial<MatchmakingContract> & { id: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };
