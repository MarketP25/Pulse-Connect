import { hashValue } from "./security";

export interface SessionStore {
  set(sessionId: string, payload: Record<string, unknown>, ttlSec: number): Promise<void>;
  get(sessionId: string): Promise<Record<string, unknown> | null>;
  delete(sessionId: string): Promise<void>;
}

type SessionRecord = {
  payload: Record<string, unknown>;
  expiresAt: number;
};

export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionRecord>();

  async set(sessionId: string, payload: Record<string, unknown>, ttlSec: number): Promise<void> {
    this.sessions.set(sessionId, {
      payload,
      expiresAt: Date.now() + ttlSec * 1000
    });
  }

  async get(sessionId: string): Promise<Record<string, unknown> | null> {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return null;
    }
    if (record.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return record.payload;
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

export class RedisSessionStore implements SessionStore {
  private redisClientPromise: Promise<any>;

  constructor(redisUrl: string) {
    this.redisClientPromise = (async () => {
      const ioredis = await import("ioredis");
      return new ioredis.default(redisUrl);
    })();
  }

  async set(sessionId: string, payload: Record<string, unknown>, ttlSec: number): Promise<void> {
    const client = await this.redisClientPromise;
    await client.set(this.key(sessionId), JSON.stringify(payload), "EX", ttlSec);
  }

  async get(sessionId: string): Promise<Record<string, unknown> | null> {
    const client = await this.redisClientPromise;
    const data = await client.get(this.key(sessionId));
    return data ? JSON.parse(data) : null;
  }

  async delete(sessionId: string): Promise<void> {
    const client = await this.redisClientPromise;
    await client.del(this.key(sessionId));
  }


  private key(sessionId: string): string {
    return `pulse-identity:session:${hashValue(sessionId)}`;
  }
}
