// Matchmaking UI Module Exports
// Central export point for all matchmaking-related UI components, hooks, services, and types

export * from "./components/MatchmakingDashboard";
export * from "./hooks/useMatchmaking";
export * from "./services/matchmakingService";
export * from "./types/matchmaking";

// Re-export commonly used types for convenience
export type {
  MatchmakingProfile,
  MatchmakingPreferences,
  MatchResult,
  MatchmakingContract,
  MatchmakingStats,
  MatchmakingFilters,
  MatchmakingNotification
} from "./types/matchmaking";

// Re-export the main hook
export { useMatchmaking } from "./hooks/useMatchmaking";

// Re-export the service instance
export { matchmakingService } from "./services/matchmakingService";
