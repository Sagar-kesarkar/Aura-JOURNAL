import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window rate limiter keyed by authenticated user ID
const userRateLimits = new Map<string, RateLimitRecord>();

// Cleanup stale buckets every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [key, record] of userRateLimits.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      userRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

export function createUserRateLimiter(options: { maxRequests: number; windowMs: number }) {
  const { maxRequests, windowMs } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Derive key strictly from authenticated user ID
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Cannot rate limit unauthenticated session' });
      return;
    }

    const now = Date.now();
    let record = userRateLimits.get(userId);

    if (!record) {
      record = { timestamps: [] };
      userRateLimits.set(userId, record);
    }

    // Filter out timestamps older than the window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldestTimestamp = record.timestamps[0] || now;
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldestTimestamp)) / 1000);

      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: `Rate limit exceeded: Please wait ${retryAfterSeconds}s before initiating further AI operations.`,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}
