# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output
npm test             # Run Jest test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint all src/**/*.ts files
npm run format       # Prettier format all src/**/*.ts files
npx prisma validate  # Validate schema without a DB connection
npx prisma migrate dev   # Apply schema changes to the local DB (requires DATABASE_URL)
npx prisma db seed   # Run prisma/seed.ts (once written)
```

To run a single test file:
```bash
npx jest src/__tests__/health.integration.test.ts
```

## Docker (local database)

The local PostgreSQL database is managed via `docker-compose.yml` at the project root. Container name: `welltrack-postgres`.

```bash
docker compose up -d              # Start the database
docker compose down               # Stop (data is preserved)
docker compose down -v            # Stop and wipe all data
docker compose ps                 # Check status / health
docker exec -it welltrack-postgres psql -U welltrack   # Open psql shell
```

**Keeping `docker-compose.yml` up to date:** When a new backing service is added to the project (e.g., Redis, a local SMTP server), add it as a new service block in `docker-compose.yml`. Application-level env vars (`JWT_SECRET`, `PORT`, etc.) live in `.env`, not in `docker-compose.yml`.

See `DEVELOPMENT.md` for full first-time setup instructions.

## Architecture

**WellTrack** is a symptom & wellness tracker REST API. Stack: Node.js + Express + TypeScript + Prisma + PostgreSQL.

### Entry points
- `src/index.ts` — server entrypoint only; imports `app` and calls `app.listen()`
- `src/app.ts` — Express app factory; import this in tests to avoid starting the server

### Planned structure (partially implemented)
```
src/
  app.ts              # Express app (middleware, routes)
  index.ts            # Server start
  routes/             # Express routers (one file per resource)
  controllers/        # Request handlers (call services, return responses)
  middleware/         # Auth middleware, error handler, validation
  services/           # Business logic (called by controllers)
  types/              # Shared TypeScript interfaces
  __tests__/          # Jest test files (*.test.ts)
```

### Database
Prisma 7 with PostgreSQL. Connection URL lives in `.env` as `DATABASE_URL` and is consumed by `prisma.config.ts` (not in `schema.prisma` — this is a Prisma 7 change).

Key schema facts:
- All log tables (`symptom_logs`, `mood_logs`, `medication_logs`, `habit_logs`) have a composite index on `(user_id, logged_at)`
- `Symptom` and `Habit` rows with `user_id = null` are system defaults shared across all users
- `TrackingType` enum: `boolean | numeric | duration` — determines which value field on `HabitLog` is populated
- All foreign keys cascade delete on user removal

### Auth
JWT access tokens (15 min, signed with `JWT_SECRET`) + refresh tokens (7 days, signed with `JWT_REFRESH_SECRET`, stored in `refresh_tokens` table). `POST /api/auth/register` is implemented. Auth middleware (verifying JWT and attaching `req.user`) is planned.

### Environment variables
See `.env.example` for all required vars: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.


Each task gets its own branch (`task/<n>-<slug>`) cut from `main`, with a PR back to `main`. Branch and PR are created before implementation begins.

### Dependency notes
- `typescript` is pinned to `~5.8.3` — `typescript-eslint@8` has a peer dep ceiling of `<5.9.0`
- ESLint is v9 (flat config via `eslint.config.js`) — not the legacy `.eslintrc` format
- Prisma is v7 — datasource URL is in `prisma.config.ts`, not `schema.prisma`



### Git workflow
When completeing tasks from TASKS.md:
1. Create a new branch named `feature/<task-number>-<brief-description>` before starting work
2. Make automatic commits with conventional. commit messages:
  - feat: for new features
  - fix: for bug fix
  - docs: for documentation
  - test: for tests
  - refactor: for refactoring
3. After completing a task, create a pull request with:
  - A descriptive title matching the task
  - A summary of changes made
  - Any testing notes or considerations
4. Update the task checkbox in TASKS.md to mark it complete


## Testing Requirements
Before marking any tasks complete:
1. Write a unit test for new functionality
2. Run the full test suite with `npm test`
3. If tests fail:
    - Analyze the failure output
    - Fix the code (not the tests, unless the tests are incorrect)
    - re-run the tests until all pass
4. Run test matching pattern `npm test -- --grep "pattern"`


