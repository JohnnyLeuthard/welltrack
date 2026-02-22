# WellTrack — Developer Setup

## Prerequisites

- **Node.js** 20+ (`node --version`)
- **Docker Desktop** — [download](https://www.docker.com/products/docker-desktop/) — used to run PostgreSQL locally

---

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and fill in values
cp .env.example .env
# The defaults in .env.example match docker-compose.yml exactly,
# so no edits are needed for local development.

# 3. Start the database
docker compose up -d

# 4. Wait for the DB to be healthy, then apply migrations
npx prisma migrate dev

# 5. Seed default symptoms and habits
npx prisma db seed

# 6. Start the API with hot reload
npm run dev
# → http://localhost:3000
```

---

## Day-to-day commands

| Task | Command |
|---|---|
| Start DB | `docker compose up -d` |
| Stop DB (keep data) | `docker compose down` |
| Wipe DB data and start fresh | `docker compose down -v && docker compose up -d` |
| Check DB status | `docker compose ps` |
| Open a psql shell | `docker exec -it welltrack-postgres psql -U welltrack` |

---

## Running the API

```bash
npm run dev       # Hot reload (ts-node + nodemon)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output (production mode)
```

---

## Running the Frontend

The frontend lives in `client/` and is a **separate npm project** with its own `package.json`.

```bash
# First time
cd client && npm install

# Start the Vite dev server
cd client && npm run dev
# → http://localhost:5173
```

Vite proxies all `/api` requests to `http://localhost:3000`, so the API server must be running at the same time.

**Run both together (two terminals):**

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

**Build for production:**

```bash
cd client && npm run build   # Outputs to client/dist/
```

---

## Tests

The test suite requires the database to be running.

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npx jest path/to/file     # Single file
```

---

## Linting & formatting

```bash
npm run lint      # ESLint
npm run format    # Prettier (writes files)
```

---

## Database

```bash
npx prisma validate          # Validate schema (no DB needed)
npx prisma migrate dev       # Apply schema changes locally
npx prisma migrate reset     # Wipe DB and re-run all migrations + seed
npx prisma db seed           # Re-run seed without resetting
npx prisma studio            # Open Prisma Studio GUI at localhost:5555
```

---

## Keeping `docker-compose.yml` up to date

`docker-compose.yml` defines **all local backing services** — anything the API needs to run that isn't the API itself.

**When to update it:**
- A new backing service is added (e.g., Redis for caching, an SMTP server for email testing) → add a new service block
- The PostgreSQL image needs a version bump → update `image: postgres:16-alpine`
- A new environment variable is required by the DB → add it under `environment`

**When _not_ to update it:**
- Application-level env vars (`JWT_SECRET`, `PORT`, etc.) — those live in `.env` / `.env.example`, not in docker-compose.yml
- Production infrastructure — production uses a managed database (Railway/Render), not this file

---

## Environment variables

| Variable | Description | Default (local dev) |
|---|---|---|
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://welltrack:welltrack@localhost:5432/welltrack` |
| `JWT_SECRET` | Signs access tokens (15-min) | *(set in .env)* |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (7-day) | *(set in .env)* |
| `CLIENT_ORIGIN` | CORS allowed origin for the frontend | `http://localhost:5173` |

Never commit `.env`. It is git-ignored.

---

## Troubleshooting

### `npm run dev` starts then immediately exits (clean exit)

If you see "WellTrack API running on port 3000" followed by nodemon going idle, a stale Node process is holding port 3000 from a previous run.

```bash
# Find the process occupying port 3000
lsof -i :3000

# Kill it (use the PID from the output above)
kill <PID>

# Then restart
npm run dev
```

Express v5 handles `EADDRINUSE` asynchronously — the listen callback fires before the error surfaces, which is why it looks like a clean start rather than a crash.

---

### Frontend shows unstyled HTML (no Tailwind CSS)

The Vite dev server for the frontend is a **separate process** from the API. If you only ran `npm run dev` from the project root, the client isn't running.

```bash
# Terminal 2 — from the client/ directory
cd client && npm run dev
```

After a large file change, Vite's HMR can also get stale. If styles are still missing after starting the client, clear the cache and restart:

```bash
cd client
rm -rf node_modules/.vite
npm run dev
```

---

### Don't run `/init` more than once

The Claude Code `/init` command regenerates `CLAUDE.md` from scratch every time it runs, overwriting accumulated instructions. **Only run it once** at project creation. To reset a Claude Code conversation without touching `CLAUDE.md`, use `/clear` instead.
