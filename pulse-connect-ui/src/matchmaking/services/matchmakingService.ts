import {
  MatchmakingProfile,
  MatchmakingPreferences,
  MatchResult,
  MatchmakingContract,
  MatchmakingStats
} from "../types/matchmaking";

class MatchmakingService {
  private baseUrl = "/api/matchmaking";

  async getProfile(): Promise<MatchmakingProfile> {
    const response = await fetch(`${this.baseUrl}/profile`);
    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }
    return response.json();
  }

  async updateProfile(updates: Partial<MatchmakingProfile>): Promise<MatchmakingProfile> {
    const response = await fetch(`${this.baseUrl}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error("Failed to update profile");
    }

    return response.json();
  }

  async getPreferences(): Promise<MatchmakingPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`);
    if (!response.ok) {
      throw new Error("Failed to fetch preferences");
    }
    return response.json();
  }

  async updatePreferences(
    updates: Partial<MatchmakingPreferences>
  ): Promise<MatchmakingPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error("Failed to update preferences");
    }

    return response.json();
  }

  async getMatches(): Promise<MatchResult[]> {
    const response = await fetch(`${this.baseUrl}/matches`);
    if (!response.ok) {
      throw new Error("Failed to fetch matches");
    }
    const data = await response.json();
    return data.matches || [];
  }

  async findMatches(): Promise<MatchResult[]> {
    const response = await fetch(`${this.baseUrl}/matches/find`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to find matches");
    }

    const data = await response.json();
    return data.matches || [];
  }

  async acceptMatch(matchId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/accept`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to accept match");
    }
  }

  async rejectMatch(matchId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/reject`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to reject match");
    }
  }

  async getContracts(): Promise<MatchmakingContract[]> {
    const response = await fetch(`${this.baseUrl}/contracts`);
    if (!response.ok) {
      throw new Error("Failed to fetch contracts");
    }
    const data = await response.json();
    return data.contracts || [];
  }

  async createContract(
    contract: Omit<MatchmakingContract, "id" | "createdAt" | "updatedAt">
  ): Promise<MatchmakingContract> {
    const response = await fetch(`${this.baseUrl}/contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contract)
    });

    if (!response.ok) {
      throw new Error("Failed to create contract");
    }

    return response.json();
  }

  async updateContract(
    contractId: string,
    updates: Partial<MatchmakingContract>
  ): Promise<MatchmakingContract> {
    const response = await fetch(`${this.baseUrl}/contracts/${contractId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error("Failed to update contract");
    }

    return response.json();
  }

  async getStats(): Promise<MatchmakingStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) {
      throw new Error("Failed to fetch stats");
    }
    return response.json();
  }

  async reportMatch(matchId: string, reason: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error("Failed to report match");
    }
  }

  async blockUser(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/block`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to block user");
    }
  }

  async unblockUser(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/unblock`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to unblock user");
    }
  }

  // WebSocket connection for real-time updates
  connectToMatchmakingSocket(onMessage: (data: any) => void): () => void {
    // This would typically connect to a WebSocket
    // For now, return a no-op disconnect function
    return () => {};
  }

  // Search and filter matches
  async searchMatches(query: string, filters?: any): Promise<MatchResult[]> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (filters) params.append("filters", JSON.stringify(filters));

    const response = await fetch(`${this.baseUrl}/matches/search?${params}`);
    if (!response.ok) {
      throw new Error("Failed to search matches");
    }

    const data = await response.json();
    return data.matches || [];
  }

  // Get matchmaking recommendations
  async getRecommendations(): Promise<MatchResult[]> {
    const response = await fetch(`${this.baseUrl}/recommendations`);
    if (!response.ok) {
      throw new Error("Failed to fetch recommendations");
    }

    const data = await response.json();
    return data.recommendations || [];
  }
}

export const matchmakingService = new MatchmakingService();
