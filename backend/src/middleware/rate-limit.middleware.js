"use strict";

// Lightweight per-process limiter. For multi-instance deployments, replace
// this with a shared Redis-backed limiter so limits apply across replicas.
const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 30, message = "Too many requests. Try again later." } = {}) {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${req.baseUrl}${req.path}:${req.ip || req.socket.remoteAddress || "unknown"}`;
        let bucket = buckets.get(key);
        if (!bucket || now >= bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;

        // Opportunistic cleanup keeps the map bounded without a background timer.
        if (buckets.size > 5000) {
            for (const [bucketKey, value] of buckets) {
                if (now >= value.resetAt) buckets.delete(bucketKey);
            }
        }

        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > max) {
            res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
            return res.status(429).json({ success: false, message });
        }
        return next();
    };
}

module.exports = rateLimit;
