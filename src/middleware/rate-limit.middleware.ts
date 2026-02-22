import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Per-user rate limiter for write (mutating) endpoints.
 * Keyed by authenticated user ID so one user cannot affect another's limits.
 * Falls back to IP for unauthenticated requests that reach protected routes
 * (auth middleware will reject them before the handler runs, but we still
 * want to limit brute-force attempts at those routes).
 */
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,                // max 200 write requests per window per user
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
