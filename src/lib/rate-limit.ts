/**
 * In-memory sliding-window rate limiter.
 *
 * Each limiter instance tracks requests by a key (IP or userId).
 * Suitable for single-server deployments. For multi-server, swap
 * the Map for Redis (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSizeSeconds: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks from expired keys
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowSizeSeconds: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.lastRefill > windowSizeSeconds * 1000 * 2) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block Node.js shutdown
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function createRateLimiter(config: RateLimiterConfig) {
  const { maxRequests, windowSizeSeconds } = config;
  ensureCleanup(windowSizeSeconds);

  return {
    /**
     * Check if a request should be allowed.
     * Returns { allowed, remaining, retryAfterSeconds }.
     */
    check(key: string): {
      allowed: boolean;
      remaining: number;
      retryAfterSeconds: number;
    } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry) {
        store.set(key, { tokens: maxRequests - 1, lastRefill: now });
        return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
      }

      // Calculate how many tokens to refill based on elapsed time
      const elapsed = (now - entry.lastRefill) / 1000;
      const refillRate = maxRequests / windowSizeSeconds;
      const refill = Math.floor(elapsed * refillRate);

      if (refill > 0) {
        entry.tokens = Math.min(maxRequests, entry.tokens + refill);
        entry.lastRefill = now;
      }

      if (entry.tokens <= 0) {
        const secondsUntilToken = Math.ceil(1 / refillRate);
        return { allowed: false, remaining: 0, retryAfterSeconds: secondsUntilToken };
      }

      entry.tokens -= 1;
      return { allowed: true, remaining: entry.tokens, retryAfterSeconds: 0 };
    },
  };
}

// Pre-configured limiters for different endpoint categories
export const authLimiter = createRateLimiter({
  maxRequests: 5,
  windowSizeSeconds: 60, // 5 attempts per minute
});

export const mutationLimiter = createRateLimiter({
  maxRequests: 10,
  windowSizeSeconds: 60, // 10 mutations per minute
});

export const generalLimiter = createRateLimiter({
  maxRequests: 100,
  windowSizeSeconds: 60, // 100 reads per minute
});
