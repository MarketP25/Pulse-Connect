import { getRedisClient } from "@/lib/redis";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  createdBy: string;
  priority: "low" | "medium" | "high";
}

export async function createAnnouncement(announcement: Omit<Announcement, "id" | "createdAt">) {
  const client = getRedisClient();
  const id = `announcement:${Date.now()}`;
  const createdAt = new Date().toISOString();

  // Store the announcement
  await client.hset(`announcements:${id}`, {
    ...announcement,
    id,
    createdAt
  });

  // Add to the announcements set
  await client.zadd("announcements:list", {
    score: Date.now(),
    member: id
  });

  return {
    id,
    ...announcement,
    createdAt
  };
}

export async function getAnnouncements(page = 1, limit = 10) {
  const client = getRedisClient();
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // Get announcement IDs sorted by creation time
  const announcementIds = await client.zrange("announcements:list", start, end, {
    rev: true // Reverse order (newest first)
  });

  if (!announcementIds.length) {
    return {
      announcements: [],
      total: 0,
      page,
      limit
    };
  }

  // Get announcement details in parallel
  const announcements = await Promise.all(
    announcementIds.map(async (id) => {
      const data = await client.hgetall(`announcements:${id}`);
      return data;
    })
  );

  // Get total count
  const total = await client.zcard("announcements:list");

  return {
    announcements: announcements.filter(Boolean),
    total,
    page,
    limit
  };
}

export async function getAllUserEmails() {
  const client = getRedisClient();
  const userEmails = new Set<string>();
  let cursor = 0;

  do {
    // Scan user keys in batches to handle large datasets efficiently
    const [nextCursor, keys] = await client.scan(cursor, {
      match: "user:*@*",
      count: 1000
    });
    cursor = parseInt(nextCursor);

    // Filter verified user keys
    const verifiedUserKeys = keys.filter(
      (key) => !key.includes("pending:") && !key.includes("email:")
    );

    // Get user data in parallel for this batch
    const batchEmails = await Promise.all(
      verifiedUserKeys.map(async (key) => {
        const data = await client.hgetall(key);
        if (data && data.verified === "true") {
          return data.email;
        }
        return null;
      })
    );

    // Add valid emails to the set
    batchEmails.filter(Boolean).forEach((email) => userEmails.add(email));
  } while (cursor !== 0); // Continue until we've scanned all keys

  return Array.from(userEmails);
}

// Queue an email for sending
export async function queueAnnouncementEmail(data: {
  to: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  createdBy: string;
  announcementId: string;
}) {
  const client = getRedisClient();
  const emailId = `email:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  // Store email data
  await client.hset(emailId, {
    ...data,
    status: "pending",
    createdAt: Date.now().toString(),
    retries: "0"
  });

  // Add to email queue
  await client.zadd("email:queue", {
    score: Date.now(),
    member: emailId
  });

  return emailId;
}

// Process email queue in batches
export async function processEmailQueue(batchSize: number = 100) {
  const client = getRedisClient();
  let processed = 0;
  let failed = 0;

  // Get batch of emails to process
  const emailIds = await client.zrange("email:queue", 0, batchSize - 1);

  for (const emailId of emailIds) {
    try {
      const emailData = await client.hgetall(emailId);
      if (!emailData) continue;

      await sendAnnouncementEmail(emailData.to, {
        title: emailData.title,
        message: emailData.message,
        priority: emailData.priority as "low" | "medium" | "high",
        createdBy: emailData.createdBy
      });

      // Mark as sent
      await client.hset(emailId, { status: "sent", sentAt: Date.now().toString() });
      await client.zrem("email:queue", emailId);
      processed++;
    } catch (error) {
      const retries = parseInt((await client.hget(emailId, "retries")) || "0");

      if (retries >= 3) {
        // Mark as failed after 3 retries
        await client.hset(emailId, {
          status: "failed",
          error: error.message,
          failedAt: Date.now().toString()
        });
        await client.zrem("email:queue", emailId);
      } else {
        // Increment retry count and push to back of queue
        await client.hset(emailId, { retries: (retries + 1).toString() });
        await client.zadd("email:queue", {
          score: Date.now() + (retries + 1) * 300000, // 5 minutes delay per retry
          member: emailId
        });
      }
      failed++;
    }
  }

  return { processed, failed, remaining: await client.zcard("email:queue") };
}
