import { getRedisClient } from "@/lib/redis";
import { UserProfile, UserProfileUpdate } from "@/types/UserProfile";
import { nanoid } from "nanoid";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getRedisClient();
  const profile = await client.hgetall(`user:profile:${userId}`);

  if (!profile || Object.keys(profile).length === 0) {
    return null;
  }

  // Parse JSON fields
  return {
    ...profile,
    location: profile.location ? JSON.parse(profile.location) : undefined,
    communicationPreferences: JSON.parse(profile.communicationPreferences),
    socialMedia: profile.socialMedia ? JSON.parse(profile.socialMedia) : undefined,
    interests: profile.interests ? JSON.parse(profile.interests) : undefined,
    privacySettings: JSON.parse(profile.privacySettings)
  } as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserProfile> {
  const client = getRedisClient();
  const existingProfile = await getUserProfile(userId);

  if (!existingProfile) {
    throw new Error("Profile not found");
  }

  // Prepare updates by stringifying objects
  const updatesToSave = {
    ...updates,
    location: updates.location ? JSON.stringify(updates.location) : undefined,
    communicationPreferences: updates.communicationPreferences
      ? JSON.stringify(updates.communicationPreferences)
      : undefined,
    socialMedia: updates.socialMedia ? JSON.stringify(updates.socialMedia) : undefined,
    interests: updates.interests ? JSON.stringify(updates.interests) : undefined,
    privacySettings: updates.privacySettings ? JSON.stringify(updates.privacySettings) : undefined,
    updatedAt: new Date().toISOString()
  };

  // Remove undefined values
  Object.keys(updatesToSave).forEach(
    (key) => updatesToSave[key] === undefined && delete updatesToSave[key]
  );

  // Save updates
  await client.hset(`user:profile:${userId}`, updatesToSave);

  // Return updated profile
  return getUserProfile(userId);
}

export async function createUserProfile(
  email: string,
  fullName: string,
  preferredLanguage: string = "en"
): Promise<UserProfile> {
  const client = getRedisClient();
  const userId = nanoid();

  const newProfile: UserProfile = {
    id: userId,
    email,
    fullName,
    preferredLanguage,
    communicationPreferences: {
      email: true,
      sms: false,
      inApp: true
    },
    privacySettings: {
      profileVisibility: "public",
      showEmail: false,
      showPhone: false,
      showLocation: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Prepare profile for Redis storage
  const profileToSave = {
    ...newProfile,
    communicationPreferences: JSON.stringify(newProfile.communicationPreferences),
    privacySettings: JSON.stringify(newProfile.privacySettings)
  };

  // Save profile
  await client.hset(`user:profile:${userId}`, profileToSave);

  // Create email index for lookup
  await client.set(`user:email:${email}`, userId);

  return newProfile;
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const client = getRedisClient();
  return client.get(`user:email:${email}`);
}

export async function deleteUserProfile(userId: string): Promise<void> {
  const client = getRedisClient();
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("Profile not found");
  }

  // Delete profile and email index
  await client.del(`user:profile:${userId}`);
  await client.del(`user:email:${profile.email}`);
}

export async function updateUserLanguage(userId: string, language: string): Promise<void> {
  const client = getRedisClient();
  await client.hset(`user:profile:${userId}`, { preferredLanguage: language });
}
