/** Beskeden grænse pr. bruger. Huskes kun i denne proces og nulstilles ved genstart. */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 8;

const buckets = new Map<string, number[]>();

export function resetPhotoRateLimit(): void {
  buckets.clear();
}

export function takePhotoSlot(
  userId: string,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const recent = (buckets.get(userId) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    buckets.set(userId, recent);
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  buckets.set(userId, recent);
  if (buckets.size > 5000) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
  return { ok: true };
}
