# WellTrack — Progress Summary

_Last updated: 2026-02-22_

---

## What has been accomplished

### Phases 1–3: Complete ✅

All backend foundation, frontend foundation, and full-feature work is done and merged to `main`.

| Phase | Scope | Status |
|---|---|---|
| Phase 1 — Backend Foundation | TypeScript/Express setup, Prisma schema, all auth endpoints, all CRUD endpoints (symptoms, mood logs, medications, medication logs, habits, habit logs), Zod validation, error handling | ✅ 100% |
| Phase 2 — Frontend Foundation | React/Vite/Tailwind SPA, auth pages, AuthContext, ProtectedRoute, Dashboard, all four log modals | ✅ 100% |
| Phase 3 — Full Features | History page, Trends page (Recharts charts + calendar heatmap), Settings page, `GET /api/insights/trends`, `GET /api/insights/activity`, `GET /api/export/csv` | ✅ 100% |

### Phase 4 Testing: Complete ✅

| Task | PR | Notes |
|---|---|---|
| Unit tests for auth service functions | [#71](https://github.com/JohnnyLeuthard/welltrack/pull/71) | 13 tests: password hashing (bcrypt format, verify/reject), access token (valid JWT, claims, 15-min TTL, tamper rejection), refresh token (valid JWT, jti uniqueness, 7-day TTL) |
| Integration tests for auth endpoints | [#72](https://github.com/JohnnyLeuthard/welltrack/pull/72) | Already existed from Phase 1 — checked off |
| Integration tests for CRUD resource | [#73](https://github.com/JohnnyLeuthard/welltrack/pull/73) | Already existed from Phase 1 — checked off (24 test files covering all 6 resources) |
| Mobile layout at 375px | [#74](https://github.com/JohnnyLeuthard/welltrack/pull/74) | Fixed sidebar crushing content on mobile (added bottom nav, `sm:hidden` sidebar); all 4 modal footers now full-width on mobile; fixed pre-existing TS error in TrendsPage |
| End-to-end full user flow test | [#75](https://github.com/JohnnyLeuthard/welltrack/pull/75) | 10-step test: register → create symptom → log entry → history → trends → activity → export CSV → delete account → verify DB deletion → verify token rejection |

### Phase 4 Performance: Complete ✅

| Task | PR | Notes |
|---|---|---|
| Review Prisma queries + add userId indexes | [#76](https://github.com/JohnnyLeuthard/welltrack/pull/76) | Added missing `@@index([userId])` to `Symptom`, `Habit`, and `Medication` models; confirmed all `where` clauses target indexed fields |
| Pagination on GET list endpoints | [#78](https://github.com/JohnnyLeuthard/welltrack/pull/78) | Added `limit` + `offset` query params to `GET /api/symptoms`, `GET /api/habits`, `GET /api/medications` |
| Dashboard stats bug fix | [#79](https://github.com/JohnnyLeuthard/welltrack/pull/79) | Fixed `endDate` being truncated to midnight UTC; today's stats always showed 0 |
| Bundle audit + code-split Trends page | [#80](https://github.com/JohnnyLeuthard/welltrack/pull/80) | Lazy-loaded `TrendsPage` with `React.lazy` + `Suspense`; added `manualChunks: { recharts }` in `vite.config.ts`; initial bundle: 207 KB → 97 KB gzip (−53%) |
| Confirm API Content-Type and status codes | [#81](https://github.com/JohnnyLeuthard/welltrack/pull/81) | Full audit — all JSON endpoints use `res.json()` (auto Content-Type); fixed `DELETE /api/symptoms/:id` returning `200` instead of `204` (inconsistent with all other DELETE handlers) |

### Documentation additions (merged)

- **`BACKLOG.md`** — [PR #70](https://github.com/JohnnyLeuthard/welltrack/pull/70) — 26 future feature ideas across 6 categories
- **`OVERVIEW.md`** — Public-facing product overview (what WellTrack is, who it's for, key features)
- **`TECHNICAL.md`** — Technical reference for engineering and support staff (stack, costs, deployment, ops)

---

## Current state

### Task checklist

```
Phase 1  ████████████████████  100%  (all checkboxes ✅)
Phase 2  ████████████████████  100%  (all checkboxes ✅)
Phase 3  ████████████████████  100%  (all checkboxes ✅)
Phase 4  ████████████░░░░░░░░   56%  (9/16 checkboxes ✅)
         └─ Testing    ✅ 5/5
         └─ Performance ✅ 4/4
         └─ Deployment  ⬜ 0/7
```

### Test coverage (backend)

- **45 test files**, 351 assertions (all passing)
- Auth: register, login, refresh, logout, forgot-password, reset-password, middleware
- Resources: full CRUD (POST/GET/PATCH/DELETE) for mood logs, symptoms, symptom logs, medications, medication logs, habits, habit logs
- Insights: trends endpoint + activity heatmap endpoint
- Export: CSV export endpoint
- Auth service unit tests: bcrypt hashing, JWT generation/validation
- E2E: full 10-step user journey

---

## Next steps — Phase 4 Deployment (7 tasks remaining)

1. **Set up production PostgreSQL** — Railway or Render managed database
2. **Run `prisma migrate deploy` + seed** against production DB
3. **Deploy backend** to Railway or Render with all required env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`)
4. **Deploy frontend** to Vercel with `VITE_API_URL` pointing to the production backend
5. **Confirm HTTPS** is active on both services
6. **Production smoke test** — register, log one entry of each type, view trends, export CSV
7. **Set up uptime monitoring** — UptimeRobot free tier or equivalent

---

## Remaining work at a glance

```
Phase 4 Deployment (7 tasks)
  [ ] Production database setup (Railway or Render)
  [ ] Run migrations + seed on production
  [ ] Backend deployment with env vars
  [ ] Frontend deployment (Vercel) with VITE_API_URL
  [ ] HTTPS confirmation on both services
  [ ] Production smoke test
  [ ] Uptime monitoring setup
```
