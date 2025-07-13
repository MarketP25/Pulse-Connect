import { NextResponse } from 'next/server';

export async function GET() {
  const recommendations = [
    {
      id: 1,
      title: "Boost Social Media Presence",
      description: "Increase engagement by running targeted ads on social platforms.",
      priority: "high",
    },
    {
      id: 2,
      title: "Email Re-Engagement",
      description: "Send a re-engagement campaign to inactive subscribers.",
      priority: "medium",
    },
    {
      id: 3,
      title: "Seasonal Promotion",
      description: "Launch a limited-time offer for the upcoming holiday.",
      priority: "low",
    },
  ];

  return NextResponse.json({ recommendations });
}