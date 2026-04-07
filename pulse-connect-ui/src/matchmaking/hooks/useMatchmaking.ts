import { useState, useEffect, useCallback } from "react";
import { MatchmakingProfile, MatchmakingPreferences, MatchResult } from "../types/matchmaking";
import { matchmakingService } from "../services/matchmakingService";

export function useMatchmaking() {
  const [profile, setProfile] = useState<MatchmakingProfile | null>(null);
  const [preferences, setPreferences] = useState<MatchmakingPreferences | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, preferencesData, matchesData] = await Promise.all([
        matchmakingService.getProfile(),
        matchmakingService.getPreferences(),
        matchmakingService.getMatches()
      ]);

      setProfile(profileData);
      setPreferences(preferencesData);
      setMatches(matchesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matchmaking data");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<MatchmakingProfile>) => {
    try {
      setLoading(true);
      const updatedProfile = await matchmakingService.updateProfile(updates);
      setProfile(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<MatchmakingPreferences>) => {
    try {
      setLoading(true);
      const updatedPreferences = await matchmakingService.updatePreferences(updates);
      setPreferences(updatedPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  const findMatches = useCallback(async () => {
    try {
      setLoading(true);
      const newMatches = await matchmakingService.findMatches();
      setMatches((prev) => [...prev, ...newMatches]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find matches");
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptMatch = useCallback(async (matchId: string) => {
    try {
      await matchmakingService.acceptMatch(matchId);
      setMatches((prev) => prev.filter((match) => match.id !== matchId));
      // Could add to accepted matches list here
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept match");
    }
  }, []);

  const rejectMatch = useCallback(async (matchId: string) => {
    try {
      await matchmakingService.rejectMatch(matchId);
      setMatches((prev) => prev.filter((match) => match.id !== matchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject match");
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    profile,
    preferences,
    matches,
    loading,
    error,
    updateProfile,
    updatePreferences,
    findMatches,
    acceptMatch,
    rejectMatch,
    clearError,
    refresh: loadInitialData
  };
}
