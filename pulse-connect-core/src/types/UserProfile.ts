interface SocialMedia {
  platform: "twitter" | "linkedin" | "facebook" | "instagram";
  url: string;
}

interface Location {
  country: string;
  city?: string;
  timezone: string;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  location?: Location;
  phoneNumber?: string;
  preferredLanguage: string;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  socialMedia?: SocialMedia[];
  profession?: string;
  company?: string;
  interests?: string[];
  privacySettings: {
    profileVisibility: "public" | "private" | "connections";
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type UserProfileUpdate = Partial<
  Omit<UserProfile, "id" | "email" | "createdAt" | "updatedAt">
>;

export type { UserProfile, SocialMedia, Location };
