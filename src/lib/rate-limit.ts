import { AppError } from '@/lib/errors';

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Sliding-window rate limiter untuk membatasi percobaan login (EP-002),
 * kirim ulang email (EP-015), dan input manual kode tiket pada scanner (EP-017 / E-005).
 */
export function assertRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): void {
  const cutoff = nowMs - windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };

  const activeTimestamps = bucket.timestamps.filter((ts) => ts > cutoff);
  if (activeTimestamps.length >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((activeTimestamps[0] + windowMs - nowMs) / 1000)
    );
    buckets.set(key, { timestamps: activeTimestamps });
    throw new AppError(
      'RATE_LIMITED',
      'Terlalu banyak percobaan dalam waktu singkat. Silakan tunggu sebentar.',
      { retryAfterSeconds }
    );
  }

  activeTimestamps.push(nowMs);
  buckets.set(key, { timestamps: activeTimestamps });
}

export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}
