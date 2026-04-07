// Matchmaking utility functions
// Helper functions for matchmaking calculations, formatting, and validation

import { MatchResult, MatchmakingProfile, MatchmakingPreferences } from "../types/matchmaking";

/**
 * Calculate match compatibility score based on multiple factors
 */
export function calculateMatchScore(
  profile1: MatchmakingProfile,
  profile2: MatchmakingProfile,
  preferences?: MatchmakingPreferences
): number {
  let score = 0;
  let totalWeight = 0;

  // Skills matching (40% weight)
  const skillOverlap = calculateSkillOverlap(profile1.skills, profile2.skills);
  score += skillOverlap * 0.4;
  totalWeight += 0.4;

  // Interests matching (20% weight)
  const interestOverlap = calculateInterestOverlap(profile1.interests, profile2.interests);
  score += interestOverlap * 0.2;
  totalWeight += 0.2;

  // Location proximity (20% weight if preferences allow)
  if (preferences && preferences.maxDistance > 0) {
    const distance = calculateDistance(profile1.location, profile2.location);
    if (distance <= preferences.maxDistance) {
      const proximityScore = Math.max(0, 1 - distance / preferences.maxDistance);
      score += proximityScore * 0.2;
      totalWeight += 0.2;
    }
  }

  // Availability compatibility (10% weight)
  const availabilityScore = profile1.availability === profile2.availability ? 1 : 0.5;
  score += availabilityScore * 0.1;
  totalWeight += 0.1;

  // Language compatibility (10% weight)
  const languageOverlap = calculateLanguageOverlap(profile1.languages, profile2.languages);
  score += languageOverlap * 0.1;
  totalWeight += 0.1;

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Calculate skill overlap between two profiles
 */
function calculateSkillOverlap(skills1: string[], skills2: string[]): number {
  if (!skills1.length || !skills2.length) return 0;

  const set1 = new Set(skills1.map((s) => s.toLowerCase()));
  const set2 = new Set(skills2.map((s) => s.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate interest overlap between two profiles
 */
function calculateInterestOverlap(interests1: string[], interests2: string[]): number {
  if (!interests1.length || !interests2.length) return 0;

  const set1 = new Set(interests1.map((s) => s.toLowerCase()));
  const set2 = new Set(interests2.map((s) => s.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate language overlap
 */
function calculateLanguageOverlap(languages1: string[], languages2: string[]): number {
  if (!languages1.length || !languages2.length) return 0;

  const set1 = new Set(languages1.map((s) => s.toLowerCase()));
  const set2 = new Set(languages2.map((s) => s.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));

  return intersection.size / Math.max(set1.size, set2.size);
}

/**
 * Calculate approximate distance between two locations
 * This is a simplified calculation - in production, use a proper geocoding service
 */
function calculateDistance(location1: string, location2: string): number {
  // Simplified distance calculation
  // In a real implementation, this would use geocoding APIs
  if (location1 === location2) return 0;

  // Mock distance calculation - replace with actual geocoding
  return Math.random() * 1000; // Random distance up to 1000km
}

/**
 * Format match score for display
 */
export function formatMatchScore(score: number): string {
  if (score >= 90) return "Excellent Match";
  if (score >= 80) return "Great Match";
  if (score >= 70) return "Good Match";
  if (score >= 60) return "Fair Match";
  return "Poor Match";
}

/**
 * Get match score color
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Validate matchmaking profile data
 */
export function validateProfile(profile: Partial<MatchmakingProfile>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.displayName || profile.displayName.trim().length === 0) {
    errors.push("Display name is required");
  }

  if (!profile.location || profile.location.trim().length === 0) {
    errors.push("Location is required");
  }

  if (!profile.skills || profile.skills.length === 0) {
    errors.push("At least one skill is required");
  }

  if (!profile.bio || profile.bio.trim().length < 10) {
    errors.push("Bio must be at least 10 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate matchmaking preferences
 */
export function validatePreferences(preferences: Partial<MatchmakingPreferences>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!preferences.matchType) {
    errors.push("Match type is required");
  }

  if (preferences.maxDistance !== undefined && preferences.maxDistance < 0) {
    errors.push("Maximum distance must be positive");
  }

  if (
    preferences.minMatchScore !== undefined &&
    (preferences.minMatchScore < 0 || preferences.minMatchScore > 100)
  ) {
    errors.push("Minimum match score must be between 0 and 100");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sort matches by compatibility score
 */
export function sortMatchesByScore(matches: MatchResult[]): MatchResult[] {
  return [...matches].sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Filter matches based on criteria
 */
export function filterMatches(
  matches: MatchResult[],
  filters: {
    minScore?: number;
    maxDistance?: number;
    skills?: string[];
    verifiedOnly?: boolean;
  }
): MatchResult[] {
  return matches.filter((match) => {
    if (filters.minScore && match.matchScore < filters.minScore) return false;
    if (filters.maxDistance && match.distance && match.distance > filters.maxDistance) return false;
    if (filters.verifiedOnly && !match.profile.verified) return false;
    if (filters.skills && filters.skills.length > 0) {
      const hasMatchingSkill = filters.skills.some((skill) =>
        match.profile.skills.some((profileSkill) =>
          profileSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasMatchingSkill) return false;
    }
    return true;
  });
}

/**
 * Generate match recommendations based on profile and preferences
 */
export function generateMatchRecommendations(
  profile: MatchmakingProfile,
  preferences: MatchmakingPreferences,
  allMatches: MatchResult[]
): MatchResult[] {
  let recommendations = sortMatchesByScore(allMatches);

  // Apply preference filters
  recommendations = filterMatches(recommendations, {
    minScore: preferences.minMatchScore,
    maxDistance: preferences.maxDistance,
    skills: preferences.preferredSkills
  });

  // Boost matches with high compatibility in preferred areas
  recommendations.forEach((match) => {
    let boost = 0;

    // Boost for preferred skills
    if (preferences.preferredSkills) {
      const preferredSkillMatch = preferences.preferredSkills.some((skill) =>
        match.profile.skills.some((profileSkill) =>
          profileSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (preferredSkillMatch) boost += 5;
    }

    // Boost for location proximity
    if (match.distance !== undefined && match.distance <= 100) {
      boost += 3;
    }

    match.matchScore = Math.min(100, match.matchScore + boost);
  });

  return sortMatchesByScore(recommendations);
}
