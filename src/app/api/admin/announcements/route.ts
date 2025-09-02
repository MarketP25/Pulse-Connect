import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createAnnouncement,
  getAnnouncements,
  getAllUserEmails,
  queueAnnouncementEmail,
  processEmailQueue
} from "@/lib/services/announcements";
import { getServerSession } from "next-auth";

const announcementSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must not exceed 100 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must not exceed 5000 characters"),
  priority: z.enum(["low", "medium", "high"])
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const validatedData = announcementSchema.parse(body);

    const announcement = await createAnnouncement({
      ...validatedData,
      createdBy: session.user.email
    });

    const userEmails = await getAllUserEmails();

    await Promise.all(
      userEmails.map((email) =>
        queueAnnouncementEmail({
          to: email,
          ...announcement,
          announcementId: announcement.id
        })
      )
    );

    processEmailQueue().catch((err) => {
      console.error("Email queue processing failed:", err);
    });

    return new Response(
      JSON.stringify({
        message: "Announcement created and notifications sent",
        announcement
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: error.issues
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.error("Failed to create announcement:", error);
    return new Response(JSON.stringify({ error: "Failed to create announcement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await getAnnouncements(page, limit);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: unknown) {
    console.error("Failed to fetch announcements:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch announcements" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
