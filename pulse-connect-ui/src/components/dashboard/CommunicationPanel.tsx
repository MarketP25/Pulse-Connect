"use client";

import { useState } from "react";
import { Announcement, CommunicationMessage, DashboardNotification } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  sendLabel: string;
  inbox: CommunicationMessage[];
  notifications: DashboardNotification[];
  announcements: Announcement[];
  chatResponse: string;
  onSend: (prompt: string) => Promise<void>;
  loading: boolean;
};

export function CommunicationPanel({
  title,
  sendLabel,
  inbox,
  notifications,
  announcements,
  chatResponse,
  onSend,
  loading
}: Props) {
  const [prompt, setPrompt] = useState("");

  return (
    <SectionCard title={title} subtitle="Inbox, notifications, announcements, and Pulsco AI.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Inbox</p>
          <div className="space-y-2 text-sm">
            {inbox.map((message) => (
              <article key={message.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{message.subject}</p>
                <p className="text-slate-600">{message.preview}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Notifications</p>
          <div className="space-y-2 text-sm">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-slate-900">Announcements</p>
          <div className="space-y-2 text-sm">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Pulsco AI</p>
          <textarea
            className="h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask about fraud alerts, optimization, marketing, or KYC"
          />
          <button
            className="mt-2 rounded bg-pulse-cyan-500 px-3 py-1.5 text-xs font-semibold text-orbit-blue-700 hover:bg-pulse-cyan-400 disabled:opacity-60"
            onClick={() => onSend(prompt)}
            disabled={loading || prompt.trim().length === 0}
          >
            {sendLabel}
          </button>

          {chatResponse ? (
            <p className="mt-3 rounded-lg bg-slate-100 p-2 text-sm text-slate-700">
              {chatResponse}
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
