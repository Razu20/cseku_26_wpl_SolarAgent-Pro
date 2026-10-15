// Per-process abuse protection. Multi-instance deployments should also rate-limit
// at their trusted ingress; never trust arbitrary forwarded IP headers here.
const buckets = new Map<string, { count: number; expires: number }>();
export function allowRequest(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 10_000) return false;
    bucket = { count: 0, expires: now + windowMs };
    buckets.set(key, bucket);
  }
  return ++bucket.count <= limit;
}
