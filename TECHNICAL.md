# WellTrack — Technical Reference

This document is intended for engineers, DevOps, and support staff responsible for deploying, operating, or maintaining WellTrack.

---

## Technology Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20+ |
| Language | TypeScript | ~5.8.3 |
| Web framework | Express | ^5.2.1 |
| ORM | Prisma | 7.x |
| Database driver | `@prisma/adapter-pg` (PrismaPg) | 7.x |
| Auth | `jsonwebtoken` | — |
| Password hashing | `bcrypt` | rounds = 12 |
| Validation | `zod` | — |
| Environment | `dotenv` | — |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 19 |
| Language | TypeScript | ~5.9.3 |
| Build tool | Vite | 7.x |
| CSS | Tailwind CSS v4 (via `@tailwindcss/vite`) | — |
| Routing | React Router DOM | v7 |
| HTTP client | Axios | — |
| Charting | Recharts | ^3.7.0 |

### Database

| Layer | Technology |
|---|---|
| Engine | PostgreSQL 16 |
| ORM / migrations | Prisma 7 |
| Local dev | Docker (`postgres:16-alpine`) |
| Production | Managed PostgreSQL (Railway or Render) |

### Testing

| Tool | Purpose |
|---|---|
| Jest | Test runner |
| `ts-jest` | TypeScript transform for Jest |
| Supertest | HTTP integration testing against the live Express app |
| Real DB | All tests run against a real PostgreSQL instance — no mocking |

---

## System Requirements

### Local Development

- **Node.js** 20 or later
- **Docker Desktop** (to run PostgreSQL locally via `docker-compose.yml`)
- **npm** 10+ (bundled with Node.js 20)
- Ports `3000` (API), `5173` (Vite dev server), `5432` (PostgreSQL) must be available

### Production

- **Backend:** Any Node.js 20+ hosting platform (Railway, Render, Fly.io, AWS, etc.)
  - Minimum: 512 MB RAM / 0.5 vCPU (sufficient for MVP/beta)
  - Recommended: 1 GB RAM for comfortable operation under load
- **Frontend:** Any static hosting platform (Vercel, Netlify, Cloudflare Pages, S3+CloudFront)
  - Built output is ~500 KB total (`index.js` ~320 KB + `recharts` ~360 KB lazy chunk + CSS)
  - No server-side rendering — deploy the `client/dist/` folder
- **Database:** PostgreSQL 15+ managed service
  - Starter tier (0.25 vCPU / 256 MB RAM / 1 GB storage) is sufficient for beta

---

## Infrastructure Options and Estimated Monthly Costs

These are representative estimates for a beta-stage deployment (up to ~500 active users). All prices are approximate as of early 2026 and subject to change.

| Service | Provider | Tier | Estimated Cost |
|---|---|---|---|
| Backend API | Railway | Starter (512 MB / 0.5 vCPU) | ~$5–10 / mo |
| Backend API | Render | Free (with cold starts) or Starter | $0–7 / mo |
| PostgreSQL | Railway | Starter (1 GB storage) | ~$5 / mo |
| PostgreSQL | Render | Free (90-day expiry) or Starter | $0–7 / mo |
| Frontend | Vercel | Hobby (free) | $0 / mo |
| Frontend | Netlify | Free tier | $0 / mo |
| Uptime monitoring | UptimeRobot | Free (50 monitors, 5-min interval) | $0 / mo |
| **Total (Railway stack)** | | | **~$10–15 / mo** |
| **Total (Render + Vercel)** | | | **~$0–14 / mo** |

> **Note on free tiers:** Render's free backend tier spins down after 15 minutes of inactivity, causing a ~30-second cold start on the next request. Not recommended for production. Render's Starter plan ($7/mo) avoids this.

### Scaling beyond beta

For 1,000+ active users with high write volume (multiple log entries per user per day):
- Upgrade PostgreSQL to a tier with 4+ GB storage and connection pooling (PgBouncer or Railway's built-in pooler)
- Consider upgrading the API to 1 GB RAM / 1 vCPU
- Estimated cost at this scale: $25–50 / mo on Railway or Render

---

## Environment Variables

All variables are required in production unless noted.

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Port the API server listens on | `3000` |
| `DATABASE_URL` | PostgreSQL connection string (consumed by `prisma.config.ts`) | `postgresql://user:pass@host:5432/welltrack` |
| `JWT_SECRET` | Secret for signing 15-minute access tokens | *(generate with `openssl rand -base64 32`)* |
| `JWT_REFRESH_SECRET` | Secret for signing 7-day refresh tokens | *(generate separately from `JWT_SECRET`)* |
| `CLIENT_ORIGIN` | CORS allowed origin for the frontend | `https://your-app.vercel.app` |

> **Security:** `JWT_SECRET` and `JWT_REFRESH_SECRET` must be strong random strings (32+ bytes). Never reuse them between environments. Never commit them to git.

The `.env.example` file in the repo root contains all variable names with safe placeholder values for local development.

---

## Database Schema Overview

Prisma schema lives at `prisma/schema.prisma`. The datasource URL is configured in `prisma.config.ts` (Prisma 7 convention — not in `schema.prisma`).

### Tables

| Table | Primary key | Key relationships |
|---|---|---|
| `users` | UUID | Parent of all user-owned data |
| `symptoms` | UUID | `userId` nullable — null = system default shared across all users |
| `symptom_logs` | UUID | `userId`, `symptomId`; indexed on `(userId, loggedAt)` |
| `mood_logs` | UUID | `userId`; indexed on `(userId, loggedAt)` |
| `medications` | UUID | `userId`; indexed on `(userId)` |
| `medication_logs` | UUID | `userId`, `medicationId`; indexed on `(userId, createdAt)` — no `loggedAt` field |
| `habits` | UUID | `userId` nullable — null = system default |
| `habit_logs` | UUID | `userId`, `habitId`; indexed on `(userId, loggedAt)` |
| `refresh_tokens` | UUID | `userId`, `token` (hashed), `expiresAt` |
| `password_reset_tokens` | UUID | `userId`, `token` (hashed), `expiresAt`, `used` bool |

### Cascade behavior

All user-owned tables have `onDelete: Cascade` on the `userId` foreign key. Deleting a `User` row removes all their data in a single DB operation.

### Migrations

```bash
npx prisma migrate dev       # Apply pending migrations locally
npx prisma migrate deploy    # Apply in production (no prompt, no data wipe)
npx prisma db seed           # Seed system symptoms and habits
npx prisma migrate reset     # Wipe and re-run all migrations (local dev only)
```

---

## API Overview

Base path: `/api`

All protected endpoints require `Authorization: Bearer <access_token>`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| User | `GET /users/me`, `PATCH /users/me`, `DELETE /users/me` |
| Symptoms | `GET/POST /symptoms`, `PATCH/DELETE /symptoms/:id` |
| Symptom Logs | `GET/POST /symptom-logs`, `PATCH/DELETE /symptom-logs/:id` |
| Mood Logs | `GET/POST /mood-logs`, `PATCH/DELETE /mood-logs/:id` |
| Medications | `GET/POST /medications`, `PATCH/DELETE /medications/:id` |
| Medication Logs | `GET/POST /medication-logs`, `PATCH/DELETE /medication-logs/:id` |
| Habits | `GET/POST /habits`, `PATCH/DELETE /habits/:id` |
| Habit Logs | `GET/POST /habit-logs`, `PATCH/DELETE /habit-logs/:id` |
| Insights | `GET /insights/trends?type=&days=`, `GET /insights/activity?days=` |
| Export | `GET /export/csv?startDate=&endDate=` |
| Health check | `GET /health` (public, no auth) |

### Standard response shapes

```
Success (200/201):  { ...resource fields }
Created (201):      { ...resource fields }
No content (204):   (empty body — all DELETE handlers)
Validation (422):   { "error": "<first Zod issue message>" }
Auth error (401):   { "error": "..." }
Forbidden (403):    { "error": "..." }
Not found (404):    { "error": "..." }
Server error (500): { "error": "Internal server error" }
```

All JSON responses include `Content-Type: application/json`. The CSV export sets `Content-Type: text/csv` and `Content-Disposition: attachment`.

---

## Authentication and Security Model

### Token flow

1. **Registration / Login** → issues a short-lived **access token** (15 min, JWT signed with `JWT_SECRET`) and a long-lived **refresh token** (7 days, JWT signed with `JWT_REFRESH_SECRET`, stored hashed in `refresh_tokens` table with a `jti` claim)
2. **Protected requests** → client sends `Authorization: Bearer <access_token>`
3. **Access token expiry** → client calls `POST /api/auth/refresh` with the refresh token; server validates, rotates the refresh token (old token deleted, new one issued), returns a new access token
4. **Logout** → `POST /api/auth/logout` deletes the refresh token from the DB; subsequent refresh attempts fail

### Frontend token storage

- **Access token:** in-memory only (module-level variable in `client/src/services/api.ts`); never written to `localStorage`; lost on page refresh and restored via the stored refresh token on mount
- **Refresh token:** stored in `localStorage` under key `refreshToken`

### Password security

- Hashed with `bcrypt`, cost factor 12
- Password reset tokens are stored as a bcrypt hash; the plaintext is sent to the user via email only once and never stored

### CORS

The API only accepts requests from the origin specified by `CLIENT_ORIGIN` in `.env`. Set this to your frontend's production domain in production.

---

## Performance Characteristics

### Backend

- All log-table queries filter on `(userId, loggedAt)` or `(userId, createdAt)` using composite indexes → O(log n) lookups even at scale
- `Symptom`, `Habit`, and `Medication` tables have single-column `userId` indexes for list queries
- All `GET` list endpoints support `limit` + `offset` pagination to cap response sizes
- No caching layer currently — reads go directly to PostgreSQL (suitable for beta scale)

### Frontend

| Chunk | Size (minified) | Size (gzip) | Load |
|---|---|---|---|
| `index.js` (initial) | ~321 KB | ~97 KB | Always (on first page load) |
| `recharts` vendor | ~361 KB | ~108 KB | Lazy — only on first `/trends` visit |
| `TrendsPage` module | ~7 KB | ~2.5 KB | Lazy — only on first `/trends` visit |
| CSS | ~23 KB | ~5 KB | Always |

Users who never visit the Trends page never download Recharts.

---

## Monitoring and Operations

### Health check

`GET /health` returns `{ "status": "ok" }` with HTTP 200. Use this as the liveness probe URL for uptime monitoring and load balancer health checks.

### Recommended uptime monitoring

- **UptimeRobot** (free tier) — monitor `GET /health` every 5 minutes; alerts by email on downtime
- Configure a second monitor on the frontend URL to catch CDN/static hosting outages separately

### Logs

The API writes to `stdout`/`stderr` (standard Node.js `console.log`/`console.error`). On Railway and Render, logs are visible in the platform dashboard and can be streamed to external log aggregators.

Unhandled errors are caught by the centralized error handler in `src/middleware/error.middleware.ts` and logged via `console.error` before returning a 500 response.

### Database backups

- **Railway:** automatic daily backups included on paid plans; can restore to a point in time via the dashboard
- **Render:** automatic daily backups on paid database plans
- **Manual export:** `pg_dump postgresql://<connection_string> > backup.sql`

---

## Running the Test Suite

Tests require a running PostgreSQL instance (local Docker or a test DB).

```bash
docker compose up -d          # Start local DB
npm test                      # Run all 45 test files (351 assertions)
npm run test:watch            # Watch mode
npx jest -t "pattern"         # Run tests matching a name pattern
npx jest src/__tests__/file   # Run a single test file
```

All tests are integration tests using Supertest against a real database. Each file uses a unique email domain suffix (e.g., `@symptoms-delete.welltrack`) to allow parallel test workers to run without interfering with each other.

---

## Known Limitations (Current Version)

| Area | Limitation |
|---|---|
| Email | Password reset emails are `console.log`'d — no actual email delivery. Production requires wiring in a real mail provider (SendGrid, Postmark, SES, etc.) |
| Rate limiting | No per-IP or per-user rate limiting is implemented yet |
| Refresh token rotation | Tokens are rotated on each use but there is no absolute expiry beyond the 7-day JWT TTL |
| Timezone | User timezone is stored but not yet used to localize log timestamps in the UI |
| Mobile apps | Web-only; no native iOS/Android app |
| File storage | No image/file uploads (profile pictures are out of scope for MVP) |

See [BACKLOG.md](BACKLOG.md) for the full list of planned future improvements.
