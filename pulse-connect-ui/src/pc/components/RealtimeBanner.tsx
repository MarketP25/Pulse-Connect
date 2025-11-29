// [CLEANED] Removed redundant React import
import { useRealtime } from "@/context/RealtimeContext";
import { useRole } from "@/context/RoleContext";
import { getRealtimeMessages } from "@/lib/realtimeMessages";

export default function RealtimeBanner() {
  const realtime = useRealtime();
  const { role, org, language, loading } = useRole();

  if (loading) return null;

  const messages = getRealtimeMessages(realtime, {
    role: role ?? undefined,
    org: org ?? undefined,
    language,
  });

  if (messages.length === 0) return null;

  return (
    <div className="bg-yellow-100 text-yellow-900 p-3 text-sm rounded shadow-sm mx-4 my-2">
      {messages.map((msg, idx) => (
        <p key={idx}>⚠️ {msg}</p>
      ))}
    </div>
  );
}
