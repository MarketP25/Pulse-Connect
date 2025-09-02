"use client";

// [CLEANED] Removed redundant React import

interface UserInteractionsProps {
  userRole: string;
}

export default function UserInteractions({ userRole }: UserInteractionsProps) {
  const isPlus = ["plus", "pro", "patron", "patronTrial"].includes(userRole);
  const isPro = ["pro", "patron", "patronTrial"].includes(userRole);

  return (
    <div className="bg-white shadow-sm border rounded-lg p-5 mb-6">
      <h2 className="text-lg font-semibold text-indigo-700 mb-2">User Interactions</h2>
      <div className="space-y-3">
        <div>
          <span className="font-semibold">Text Chat: </span>
          {isPlus ? (
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition"
              aria-label="Start a new chat session"
            >
              Start Chat
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2" role="alert">
              Upgrade to Plus for group chat
            </span>
          )}
        </div>
        <div>
          <span className="font-semibold">Voice Notes: </span>
          {isPro ? (
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition"
              aria-label="Send a new voice note"
            >
              Send Voice Note
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2" role="alert">
              Upgrade to Pro for voice notes
            </span>
          )}
        </div>
        <div>
          <span className="font-semibold">Video Calls: </span>
          {isPro ? (
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-700 transition"
              aria-label="Start a new video call"
            >
              Start Video Call
            </button>
          ) : (
            <span className="text-indigo-600 text-xs ml-2" role="alert">
              Upgrade to Pro for video calls
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
