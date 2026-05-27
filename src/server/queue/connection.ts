import type Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || "localhost",
      port: parseInt(u.port || "6379", 10),
      password: u.password || undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

// Connection options (plain object — no runtime deps at import time)
export const connectionOptions = parseRedisUrl(REDIS_URL);

// Lazy Redis instance — hanya dibuat saat pertama diakses
let _connection: Redis | null = null;

export function getConnection(): Redis {
  if (_connection) return _connection;
  // Dynamic require so ioredis is only loaded when actually needed
  const Redis = require("ioredis") as typeof import("ioredis").default;
  _connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  return _connection;
}

// For backward compat — but prefer getConnection()
export const connection = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getConnection() as any)[prop];
  },
});
