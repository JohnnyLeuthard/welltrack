import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Per-user rate limiter for write (mutating) endpoints.
 * Keyed by authenticated user ID so one user cannot affect another's limits.
 * Falls back to IP for unauthenticated requests that reach protected routes
 * (auth middleware will reject them before the handler runs, but we still
 * want to limit brute-force attempts at those routes).
 *
 * GET requests are skipped — reads are not a brute-force risk and the
 * keyGenerator falls back to IP (req.user is not yet populated when this
 * middleware runs), which would bucket all reads from the same host together
 * and prematurely rate-limit normal browsing.
 */
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,                // max 200 write requests per window per user
  keyGenerator: (req: Request) => req.user?.userId ?? ipKeyGenerator(req.ip ?? ''),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req: Request) => req.method === 'GET' || process.env['NODE_ENV'] === 'test',
});

/**
 * Strict per-IP rate limiter for authentication endpoints.
 * No user session exists yet at the auth layer so keying by IP is the only
 * option. 5 requests per 15-minute window is enough for legitimate use
 * (a user mistyping their password a few times) while blocking credential
 * stuffing and brute-force attacks.
 *
 * /refresh and /logout are excluded: the client calls them automatically on
 * every page load (to restore the in-memory access token) and on logout.
 * Subjecting those machine-driven calls to the 5-request limit causes the
 * refresh to return 429, which clears the stored tokens and logs the user
 * out — making all their data appear missing.
 *
 * Skipped entirely in the test environment so auth integration tests —
 * which make many sequential requests — do not start returning 429s mid-suite.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  skip: (req: Request) =>
    process.env['NODE_ENV'] === 'test' ||
    req.path === '/refresh' ||
    req.path === '/logout',
});
