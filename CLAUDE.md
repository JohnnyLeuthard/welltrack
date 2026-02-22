# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output
npm test             # Run Jest test suite (requires DB running)
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint all src/**/*.ts files
npm run format       # Prettier format all src/**/*.ts files
npx prisma validate  # Validate schema without a DB connection
npx prisma migrate dev     # Apply schema changes to the local DB
npx prisma migrate reset   # Wipe DB and re-run all migrations + seed
npx prisma db seed         # Re-run seed without resetting
npx prisma studio          # Prisma Studio GUI at localhost:5555
```

Run a single test file:
```bash
npx jest src/__tests__/health.integration.test.ts
```

Run tests matching a name pattern:
```bash
npx jest -t "returns 201"
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

When a new backing service is added (e.g., Redis), add it as a new service block in `docker-compose.yml`. Application-level env vars (`JWT_SECRET`, `PORT`, etc.) live in `.env`, not in `docker-compose.yml`.

See `DEVELOPMENT.md` for full first-time setup instructions.

## Architecture

**WellTrack** is a symptom & wellness tracker REST API. Stack: Node.js + Express + TypeScript + Prisma + PostgreSQL.

### Entry points
- `src/index.ts` — server entrypoint only; imports `app` and calls `app.listen()`
- `src/app.ts` — Express app factory; import this in tests to avoid starting the server

### Layer pattern: Service → Controller → Router

Every resource follows this three-layer pattern:

- **`src/services/<resource>.service.ts`** — all business logic, Prisma queries, ownership checks, and domain errors. Services throw `Error` objects with a `.status` property attached:
  ```ts
  const err = new Error('Not found');
  (err as Error & { status: number }).status = 404;
  throw err;
  ```
- **`src/controllers/<resource>.controller.ts`** — parses/validates request input, calls service, maps `.status` on caught errors to HTTP responses. All route params are accessed as `req.params['id'] as string` (not `req.params.id`) to satisfy TypeScript.
- **`src/routes/<resource>.router.ts`** — wires routes to handlers; all protected routes use `authMiddleware`.
- **`src/app.ts`** — mounts routers at their base paths (e.g., `app.use('/api/mood-logs', moodLogRouter)`).
- **`src/lib/prisma.ts`** — Prisma singleton using the `PrismaPg` driver adapter (required by Prisma 7).
- **`src/schemas/<resource>.schema.ts`** — Zod schemas for request validation, one file per resource.
- **`src/middleware/validate.middleware.ts`** — `validateBody(schema)` runs `schema.safeParse(req.body)` and returns 422 with the first Zod issue message. Wire it before controller handlers that need input validation.

### Frontend (client/)

React 19 + Vite + TypeScript SPA. Stack: React Router DOM v7, Axios, Tailwind CSS v4 (via `@tailwindcss/vite` plugin).

```bash
# Run from the client/ directory
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # ESLint (flat config)
```

Vite proxies all `/api` requests to `http://localhost:3000`. The API server's CORS config reads `CLIENT_ORIGIN` from `.env` and defaults to `http://localhost:5173`.

### Auth
JWT access tokens (15 min, `JWT_SECRET`) + refresh tokens (7 days, `JWT_REFRESH_SECRET`, stored in `refresh_tokens` table with a `jti` claim for uniqueness). `authMiddleware` reads `Authorization: Bearer <token>`, verifies the JWT, and attaches `req.user = { userId, email }` to the request. `req.user` is typed via `src/types/express.d.ts` augmenting `Express.Request`.

Password reset tokens are stored as a bcrypt hash in `password_reset_tokens`. The email service (`src/services/email.service.ts`) is a stub that `console.log`s the reset URL rather than sending a real email.

### Database
Prisma 7 with PostgreSQL. Connection URL lives in `.env` as `DATABASE_URL` and is consumed by `prisma.config.ts` (not `schema.prisma` — this is a Prisma 7 change).

Key schema facts:
- `Symptom` and `Habit` rows with `userId = null` are system defaults shared across all users; user-created rows have a `userId`. Controllers treat attempts to log against another user's private symptom/habit as 404 (not 403) to avoid leaking existence.
- All log tables except `medication_logs` index on `(user_id, logged_at)`. `medication_logs` indexes on `(user_id, created_at)` — it has no `loggedAt` field.
- `HabitLog` has three value fields (`valueBoolean`, `valueNumeric`, `valueDuration`); only the one matching the habit's `trackingType` enum (`boolean | numeric | duration`) should be populated.
- All foreign keys cascade delete on user removal.

### Testing
All tests are integration tests using `supertest` against the real database — no mocking. Tests are self-contained: each file seeds its own data in `beforeAll`/`beforeEach` and cleans up in `afterAll`/`afterEach`. Tests never rely on seed data from `prisma db seed`.

**Test isolation:** Each test file uses a unique email domain suffix (e.g., `@mood-logs-get.welltrack`, `@symptoms-post.welltrack`) so Jest's parallel workers don't interfere with each other's test data.

### Git workflow
Each task from `tasks.md` gets its own branch and PR. This is mandatory — do not batch multiple tasks into one branch or defer commits.

**For every task, in order:**
1. Create a branch: `task/<n>-<slug>` cut from the previous task's branch (they stack until merged)
2. Do the work
3. Check the checkbox in `tasks.md` for that task
4. Commit with a conventional commit message: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
5. Push the branch to GitHub: `git push -u origin <branch>`
6. Open a PR on GitHub targeting `main`; PR title matches the task description from `tasks.md`
7. Move to the next task on a new branch cut from the one just committed

**Do not:**
- Skip creating a branch before starting a task
- Complete a task without committing before moving to the next one
- Batch multiple tasks into a single commit or branch
- Push or open PRs after the fact — do it immediately after the commit

### Dependency notes
- `typescript` is pinned to `~5.8.3` — `typescript-eslint@8` has a peer dep ceiling of `<5.9.0`
- ESLint is v9 (flat config via `eslint.config.js`) — not the legacy `.eslintrc` format
- Prisma is v7 — datasource URL is in `prisma.config.ts`, not `schema.prisma`
- Express v5 is in use (`"express": "^5.2.1"`) — async errors propagate automatically without `next(err)`
