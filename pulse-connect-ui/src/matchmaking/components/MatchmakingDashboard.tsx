"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useMatchmaking } from "../hooks/useMatchmaking";
import { MatchmakingProfile, MatchmakingPreferences, MatchResult } from "../types/matchmaking";

export function MatchmakingDashboard() {
  const {
    profile,
    preferences,
    matches,
    loading,
    updateProfile,
    updatePreferences,
    findMatches,
    acceptMatch,
    rejectMatch
  } = useMatchmaking();

  const [activeTab, setActiveTab] = useState("profile");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Matchmaking Dashboard</h1>
        <p className="text-gray-600 mt-2">Find your perfect connections in the Pulsco ecosystem</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileTab profile={profile} onUpdate={updateProfile} />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <PreferencesTab preferences={preferences} onUpdate={updatePreferences} />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <MatchesTab
            matches={matches}
            onAccept={acceptMatch}
            onReject={rejectMatch}
            onFindMore={findMatches}
          />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <ContractsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({
  profile,
  onUpdate
}: {
  profile: MatchmakingProfile | null;
  onUpdate: (profile: Partial<MatchmakingProfile>) => void;
}) {
  const [formData, setFormData] = useState<Partial<MatchmakingProfile>>(profile || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Matchmaking Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <Input
                value={formData.displayName || ""}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <Input
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={4}
              value={formData.bio || ""}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell others about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skills & Interests</label>
            <Input
              value={formData.skills?.join(", ") || ""}
              onChange={(e) =>
                setFormData({ ...formData, skills: e.target.value.split(",").map((s) => s.trim()) })
              }
              placeholder="React, Node.js, AI, Blockchain (comma-separated)"
            />
          </div>

          <Button type="submit">Update Profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PreferencesTab({
  preferences,
  onUpdate
}: {
  preferences: MatchmakingPreferences | null;
  onUpdate: (preferences: Partial<MatchmakingPreferences>) => void;
}) {
  const [formData, setFormData] = useState<Partial<MatchmakingPreferences>>(preferences || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matchmaking Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Match Type</label>
              <Select
                value={formData.matchType || "professional"}
                onValueChange={(value) => setFormData({ ...formData, matchType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Distance (km)</label>
              <Input
                type="number"
                value={formData.maxDistance || 100}
                onChange={(e) =>
                  setFormData({ ...formData, maxDistance: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Preferred Skills</label>
            <Input
              value={formData.preferredSkills?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferredSkills: e.target.value.split(",").map((s) => s.trim())
                })
              }
              placeholder="AI, Blockchain, UI/UX (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Availability</label>
            <Select
              value={formData.availability || "full-time"}
              onValueChange={(value) => setFormData({ ...formData, availability: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">Update Preferences</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MatchesTab({
  matches,
  onAccept,
  onReject,
  onFindMore
}: {
  matches: MatchResult[];
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
  onFindMore: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Matches</h2>
        <Button onClick={onFindMore}>Find More Matches</Button>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No matches found yet. Update your profile and preferences to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <Card key={match.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={match.profile.avatar} />
                    <AvatarFallback>{match.profile.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{match.profile.displayName}</h3>
                    <p className="text-sm text-gray-600">{match.profile.location}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{match.matchScore}% Match</Badge>
                      <Badge variant="outline">{match.matchType}</Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => onReject(match.id)}>
                      Pass
                    </Button>
                    <Button onClick={() => onAccept(match.id)}>Connect</Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Compatibility</span>
                    <span>{match.matchScore}%</span>
                  </div>
                  <Progress value={match.matchScore} className="w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Contracts</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Contract management coming soon...</p>
      </CardContent>
    </Card>
  );
}
