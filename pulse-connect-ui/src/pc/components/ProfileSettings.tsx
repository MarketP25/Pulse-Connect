"use client";

import FeatureGate from "@/components/FeatureGate";

// [CLEANED] Removed redundant React import

interface ProfileSettingsProps {
  userEmail: string;
  username: string;
}

export default function ProfileSettings({
  userEmail,
  username,
}: ProfileSettingsProps) {
  return (
    <FeatureGate permission="users:read">
      <div className="bg-white shadow-sm border rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold text-indigo-700 mb-2">
          Profile Settings
        </h2>
        <p className="mb-1">
          Email: <span className="font-mono">{userEmail}</span>
        </p>
        <p>
          Username: <span className="font-mono">{username}</span>
        </p>
        {/* Add edit form here if needed */}
      </div>
    </FeatureGate>
  );
}
