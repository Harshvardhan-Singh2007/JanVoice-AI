import type { RequestHandler } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter({ windowMs, max, message }: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateBucket>();
  let lastCleanup = 0;

  return (request, response, next) => {
    const now = Date.now();
    if (now - lastCleanup >= windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastCleanup = now;
    }

    const key = request.ip || request.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= MAX_TRACKED_KEYS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      response.status(429).json({
        status: 'error',
        message,
        ...(request.requestId ? { requestId: request.requestId } : {}),
      });
      return;
    }

    return next();
  };
}
