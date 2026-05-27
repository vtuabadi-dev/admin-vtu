// In-memory rate limiter — Docker Compose friendly, no external deps
// Rate limits keyed by IP or user ID, stored in a self-cleaning Map

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests within the window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 5 },          // 5 login attempts per minute
  upload: { windowMs: 60_000, maxRequests: 10 },        // 10 uploads per minute
  api: { windowMs: 60_000, maxRequests: 60 },           // 60 API calls per minute
  "api-write": { windowMs: 60_000, maxRequests: 20 },   // 20 write operations per minute
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIGS.api,
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function rateLimitKey(request: Request, session?: { user?: { id?: string } } | null): string {
  // Prefer user ID, fall back to IP
  if (session?.user?.id) return `user:${session.user.id}`;
  const forwarded = request.headers.get("x-forwarded-for");
  return `ip:${forwarded?.split(",")[0]?.trim() || "unknown"}`;
}

export function getRateLimitConfig(type: keyof typeof DEFAULT_CONFIGS): RateLimitConfig {
  return DEFAULT_CONFIGS[type];
}
