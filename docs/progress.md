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
| Unit tests for auth service functions | [#71](https://github.com/JohnnyLeuthard/welltrack/pull/71) | 13 tests: bcrypt hashing, JWT claims, token TTLs, tamper rejection |
| Integration tests for auth endpoints | [#72](https://github.com/JohnnyLeuthard/welltrack/pull/72) | Already existed from Phase 1 — checked off |
| Integration tests for CRUD resource | [#73](https://github.com/JohnnyLeuthard/welltrack/pull/73) | Already existed from Phase 1 — checked off (24 test files, all 6 resources) |
| Mobile layout at 375px | [#74](https://github.com/JohnnyLeuthard/welltrack/pull/74) | Fixed sidebar on mobile (bottom nav + `sm:hidden`); modal footers full-width |
| End-to-end full user flow test | [#75](https://github.com/JohnnyLeuthard/welltrack/pull/75) | 10-step E2E: register → log → history → trends → export → delete account |

### Phase 4 Performance: Complete ✅

| Task | PR | Notes |
|---|---|---|
| Review Prisma queries + add userId indexes | [#76](https://github.com/JohnnyLeuthard/welltrack/pull/76) | Added `@@index([userId])` to `Symptom`, `Habit`, `Medication`; confirmed all `where` clauses use indexed fields |
| Pagination on GET list endpoints | [#78](https://github.com/JohnnyLeuthard/welltrack/pull/78) | `limit` + `offset` added to `GET /api/symptoms`, `/api/habits`, `/api/medications` |
| Dashboard stats bug fix | [#79](https://github.com/JohnnyLeuthard/welltrack/pull/79) | Fixed `endDate` truncated to midnight UTC — today's counts always showed 0 |
| Bundle audit + code-split Trends page | [#80](https://github.com/JohnnyLeuthard/welltrack/pull/80) | `React.lazy` + `Suspense` for TrendsPage; `manualChunks: { recharts }` in vite.config; initial bundle 207 KB → 97 KB gzip (−53%) |
| API Content-Type and status code audit | [#81](https://github.com/JohnnyLeuthard/welltrack/pull/81) | All JSON endpoints confirmed correct; fixed `DELETE /api/symptoms/:id` returning `200` instead of `204` |

### Phase 5 Enhancements: In Progress 🔄

| Task | PR | Notes |
|---|---|---|
| Extended trends date range (60/120/365 day) | _(merged)_ | Frontend selector updated; backend accepts any `days` value |
| Dark mode toggle | _(merged)_ | `localStorage` persistence; Tailwind `darkMode: 'class'`; toggle in Settings |
| Correlation chart | _(merged)_ | Second metric overlay on Trends line chart (e.g., mood vs. energy) |
| Help page `/help` | _(merged)_ | FAQs and how-to guides for logging, trends, and export |
| Contact page `/contact` | _(merged)_ | Support mailto link + links to help resources |
| Track last login | _(merged)_ | `last_login_at` on User model; shown in Settings profile section |
| Allow email change | _(merged)_ | `PATCH /api/users/me` accepts `email`; uniqueness validated; profile form updated |
| Per-user rate limiting | _(merged)_ | `express-rate-limit` keyed by `req.user.userId` on all write endpoints |
| Audit log | _(merged)_ | `AuditLog` model; records login, password change, email change; `GET /api/users/me/audit-log` |
| PDF export | [#94](https://github.com/JohnnyLeuthard/welltrack/pull/94) | `GET /api/export/pdf` via pdfkit; log summaries + trend data; "Download PDF" button in Settings |

Remaining Phase 5 tasks (Notifications & Reminders, Data & Integrations) — see `docs/tasks.md`.

### Documentation overhaul (ongoing)

| Work | PR | Notes |
|---|---|---|
| BACKLOG.md created | [#70](https://github.com/JohnnyLeuthard/welltrack/pull/70) | Future feature ideas across categories |
| OVERVIEW.md + TECHNICAL.md created; progress.md formalized | [#82](https://github.com/JohnnyLeuthard/welltrack/pull/82) | OVERVIEW.md: product pitch; TECHNICAL.md: stack/ops reference |
| All docs moved to `docs/` folder | [#83](https://github.com/JohnnyLeuthard/welltrack/pull/83) | Root cleaned up; CLAUDE.md stays at root; cross-references updated |
| CLAUDE.md auto-load imports added | _(in session)_ | `@docs/tasks.md` and `@docs/Requirements.md` auto-loaded into every session |
| Backlog cleanup + Phase 5 task promotion | [#95](https://github.com/JohnnyLeuthard/welltrack/pull/95) | Removed 8 completed items from BACKLOG.md; added Notifications & Reminders and Data & Integrations sections to Phase 5 |

---

## Current state

### Task checklist

```
Phase 1  ████████████████████  100%  (all checkboxes ✅)
Phase 2  ████████████████████  100%  (all checkboxes ✅)
Phase 3  ████████████████████  100%  (all checkboxes ✅)
Phase 4  ████████████░░░░░░░░   56%  (9/16 — Testing ✅ Performance ✅ Deployment ⬜)
Phase 5  ████████████░░░░░░░░   59%  (10/17 — Frontend ✅ Backend+FE ✅ Export ✅ Notifications ⬜ Integrations ⬜)
```

### Test coverage (backend)

- **45 test files**, 351 assertions — all passing
- Auth, all 6 CRUD resources, insights, export, E2E user journey
- Zero mocking — all tests run against a real PostgreSQL instance

### Repository structure (as of today)

```
/                   ← repo root
  CLAUDE.md         ← AI agent guidance (must stay at root)
  src/              ← backend TypeScript source
  client/           ← React/Vite frontend
  prisma/           ← schema, migrations, seed
  docs/             ← all other documentation
    tasks.md
    Requirements.md
    DEVELOPMENT.md
    OVERVIEW.md
    TECHNICAL.md
    BACKLOG.md
    progress.md
```

---

## Immediate next steps

### Phase 5 — Notifications & Reminders (4 tasks)

1. **Daily logging reminder** — email prompt if user hasn't logged by end of day; requires real email delivery to be wired up first
2. **Medication reminder alerts** — per-medication reminders based on frequency; needs a scheduler (cron or a queue)
3. **Streak milestone badges** — detect 7/30-day streaks; surface in-app message or badge on Dashboard
4. **Weekly wellness summary email** — aggregate stats email each Monday; again depends on real email delivery

### Phase 5 — Data & Integrations (3 tasks)

5. **Bulk CSV import** — CSV upload endpoint to backfill historical data
6. **Apple Health / Google Fit integration** — read sleep and activity data
7. **Wearable device sync** — Fitbit/Garmin data sync

### Phase 4 — Deployment (7 tasks, still pending)

These can be tackled in parallel with Phase 5 features:

1. Set up production PostgreSQL (Railway or Render)
2. Run `prisma migrate deploy` + seed against production DB
3. Deploy backend with env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`)
4. Deploy frontend to Vercel; set `VITE_API_URL`
5. Confirm HTTPS on both services
6. Production smoke test (register → log → trends → export CSV)
7. Uptime monitoring (UptimeRobot free tier on `GET /health`)

### Pre-deployment blockers

| Item | Why it matters |
|---|---|
| **Wire up real email delivery** | Password reset and future notification emails are `console.log`'d — broken in production. Use SendGrid (free: 100/day), Postmark, or AWS SES |
| **GitHub Actions CI pipeline** | `npm test` should run automatically on every PR to catch regressions before review |
| **README.md at repo root** | GitHub shows nothing on the repo homepage; should link to `docs/OVERVIEW.md`, `docs/DEVELOPMENT.md`, and the live app URL |

---

## Lessons Learned

Patterns and workflow rules that emerged from building this project — worth carrying forward.

### Git & PR discipline

- **Every change, including docs, needs a branch + commit + PR.** Documentation edits feel minor but they represent real decisions (scope, architecture, workflow rules) that should be reviewable and revertable independently.
- **One checkbox = one branch = one PR — no exceptions.** Batching multiple checkboxes into a single PR makes rollback harder and obscures the history of what changed when and why.
- **Commit the checkbox check in the same commit as the code.** This keeps `tasks.md` accurate at every point in git history.

### Backlog hygiene

- **Remove items from BACKLOG.md the moment they're promoted to `tasks.md`.** Leaving stale items in the backlog creates confusion about what's actually scheduled vs. what's just an idea. The git history is the audit trail.
- **The backlog is not a second task list.** Items there are unscheduled ideas; items in `tasks.md` are committed work. Keeping them distinct keeps planning clean.

### Documentation

- **Keep `progress.md` current.** Stale progress docs mislead contributors (and AI agents) about the state of the project. Update it whenever a phase completes or significant work merges.
- **The "Suggested next steps" section rots quickly.** Things listed as future ideas get implemented and the section stops reflecting reality. Either promote items to `tasks.md` or remove them rather than letting them accumulate.
- **Auto-loading `@docs/tasks.md` and `@docs/Requirements.md` in CLAUDE.md** means Claude Code always has workflow rules and product scope in context without needing to be reminded — a small config change with large productivity impact.

### Architecture

- **The Service → Controller → Router layer separation pays off.** Adding features like rate limiting, audit logging, and email change required touching only the service layer — controllers and routes were unchanged.
- **Prisma 7 + `PrismaPg` driver adapter** requires datasource config in `prisma.config.ts` instead of `schema.prisma` — this trips up documentation and tooling that assumes the older pattern.
- **Express v5 async error propagation** means try/catch is unnecessary in controllers for async route handlers — errors bubble automatically to the error middleware.

---

## Remaining work at a glance

```
Phase 4 Deployment (7 tasks)
  [ ] Production database setup
  [ ] Migrations + seed on production
  [ ] Backend deployment with env vars
  [ ] Frontend deployment (Vercel)
  [ ] HTTPS confirmation
  [ ] Production smoke test
  [ ] Uptime monitoring

Phase 5 Notifications & Reminders (4 tasks)
  [ ] Daily logging reminder email
  [ ] Medication reminder alerts
  [ ] Streak milestone celebrations / badges
  [ ] Weekly wellness summary email

Phase 5 Data & Integrations (3 tasks)
  [ ] Bulk CSV import
  [ ] Apple Health / Google Fit integration
  [ ] Wearable device sync (Fitbit, Garmin)

Pre-deployment (not yet in tasks.md)
  [ ] README.md at repo root
  [ ] Real email delivery (SendGrid / Postmark / SES)
  [ ] GitHub Actions CI pipeline
```
