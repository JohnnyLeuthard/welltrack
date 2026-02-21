# WellTrack — Implementation Tasks

Checkbox list of tasks organized by phase. Stack: React + TypeScript + Tailwind (frontend), Node.js + Express + Prisma + PostgreSQL (backend), JWT auth.

---

## Phase 1: Backend Foundation (Weeks 1–3)

### Project Setup

- [x] Initialize a Node.js project with TypeScript (`tsconfig.json`, `ts-node`, `nodemon`)
- [x] Set up Express with a basic `src/index.ts` entry point
- [x] Create folder structure: `src/routes`, `src/controllers`, `src/middleware`, `src/services`, `src/types`
- [x] Configure `.env` with `dotenv` for `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`
- [x] Add ESLint + Prettier with a shared config
- [x] Add a `package.json` dev script for `nodemon` and a build script for production

### Database & Schema

- [x] Install Prisma and initialize it (`npx prisma init`)
- [x] Write the Prisma schema for all models:
  - `User` (id, email, password_hash, display_name, timezone, created_at)
  - `Symptom` (id, user_id nullable, name, category, is_active)
  - `SymptomLog` (id, user_id, symptom_id, severity 1–10, notes, logged_at, created_at)
  - `MoodLog` (id, user_id, mood_score 1–5, energy_level, stress_level, notes, logged_at, created_at)
  - `Medication` (id, user_id, name, dosage, frequency, is_active, created_at)
  - `MedicationLog` (id, user_id, medication_id, taken bool, taken_at, notes, created_at)
  - `Habit` (id, user_id nullable, name, tracking_type enum: boolean/numeric/duration, unit, is_active)
  - `HabitLog` (id, user_id, habit_id, value_boolean, value_numeric, value_duration, notes, logged_at, created_at)
  - `RefreshToken` (id, user_id, token, expires_at, created_at)
  - `PasswordResetToken` (id, user_id, token, expires_at, used bool, created_at)
- [x] Add database indexes on `(user_id, logged_at)` for all log tables in the Prisma schema
- [x] Run `prisma migrate dev` to create the initial migration
- [x] Write a seed script (`prisma/seed.ts`) that inserts:
  - Default symptoms: Headache, Fatigue, Joint Pain, Muscle Pain, Nausea, Brain Fog, Dizziness, Insomnia, Anxiety, Stomach Pain, Back Pain (user_id = null)
  - Default habits: Sleep Duration (duration), Water Intake (numeric/glasses), Exercise (boolean), Alcohol (boolean), Caffeine (numeric/cups) (user_id = null)
- [x] Run the seed script and verify data in the database

### Auth Endpoints

- [x] `POST /api/auth/register` — validate input, hash password with bcrypt (rounds = 12), create user, return JWT access token + refresh token
- [x] `POST /api/auth/login` — verify email/password, return JWT access token + refresh token; store refresh token in DB
- [ ] `POST /api/auth/refresh` — validate refresh token from DB, issue new access token (rotate refresh token)
- [ ] `POST /api/auth/logout` — delete refresh token from DB
- [ ] `POST /api/auth/forgot-password` — generate a short-lived reset token, store hashed version in DB, send email with reset link (use Nodemailer or a stub for now)
- [ ] `POST /api/auth/reset-password` — validate token, hash new password, update user, mark token as used
- [ ] Create `authMiddleware` that verifies JWT and attaches `req.user` to the request

### User Endpoints

- [ ] `GET /api/users/me` — return the authenticated user's profile (exclude password_hash)
- [ ] `PATCH /api/users/me` — allow updating `display_name` and `timezone`; validate timezone is a valid IANA string
- [ ] `DELETE /api/users/me` — delete the user and cascade-delete all their data; invalidate tokens

### Symptoms CRUD

- [ ] `GET /api/symptoms` — return system symptoms (user_id = null) plus the user's own custom symptoms
- [ ] `POST /api/symptoms` — create a custom symptom for the authenticated user
- [ ] `PATCH /api/symptoms/:id` — update a symptom (only if it belongs to the current user; system defaults are read-only)
- [ ] `DELETE /api/symptoms/:id` — delete a custom symptom (block deletion of system symptoms)

### Symptom Logs CRUD

- [ ] `GET /api/symptom-logs` — return logs filtered by optional `startDate`, `endDate`, `limit`, `offset` query params; only return the user's own logs
- [ ] `POST /api/symptom-logs` — create a symptom log entry; validate severity is 1–10
- [ ] `PATCH /api/symptom-logs/:id` — update a log entry (must belong to current user)
- [ ] `DELETE /api/symptom-logs/:id` — delete a log entry (must belong to current user)

### Mood Logs CRUD

- [ ] `GET /api/mood-logs` — return mood logs with optional `startDate` / `endDate` filters
- [ ] `POST /api/mood-logs` — create a mood log; validate mood_score (1–5), energy_level (1–5), stress_level (1–5)
- [ ] `PATCH /api/mood-logs/:id` — update a mood log entry
- [ ] `DELETE /api/mood-logs/:id` — delete a mood log entry

### Medications CRUD

- [ ] `GET /api/medications` — return all active medications for the current user
- [ ] `POST /api/medications` — create a new medication
- [ ] `PATCH /api/medications/:id` — update a medication (name, dosage, frequency, is_active)
- [ ] `DELETE /api/medications/:id` — soft-delete or hard-delete a medication

### Medication Logs CRUD

- [ ] `GET /api/medication-logs` — return logs with optional `startDate` / `endDate` filters
- [ ] `POST /api/medication-logs` — log a medication as taken or not taken
- [ ] `PATCH /api/medication-logs/:id` — update a medication log
- [ ] `DELETE /api/medication-logs/:id` — delete a medication log

### Habits CRUD

- [ ] `GET /api/habits` — return system habits (user_id = null) plus the user's custom habits
- [ ] `POST /api/habits` — create a custom habit; validate `tracking_type` is one of `boolean`, `numeric`, `duration`
- [ ] `PATCH /api/habits/:id` — update a habit (user's own only)
- [ ] `DELETE /api/habits/:id` — delete a custom habit

### Habit Logs CRUD

- [ ] `GET /api/habit-logs` — return logs with optional `startDate` / `endDate` filters
- [ ] `POST /api/habit-logs` — create a habit log; validate that the correct value field is populated based on `tracking_type`
- [ ] `PATCH /api/habit-logs/:id` — update a habit log
- [ ] `DELETE /api/habit-logs/:id` — delete a habit log

### Validation & Error Handling

- [ ] Add `zod` (or `express-validator`) to validate request bodies on all POST/PATCH endpoints
- [ ] Create a centralized error-handling middleware that returns consistent `{ error: string }` JSON responses
- [ ] Return `401` for missing/invalid auth, `403` for ownership violations, `404` for not found, `422` for validation errors
- [ ] Add a catch-all 404 handler for unknown routes

---

## Phase 2: Frontend Foundation (Weeks 4–6)

### React Project Setup

- [ ] Scaffold the frontend with Vite: `npm create vite@latest client -- --template react-ts`
- [ ] Install and configure Tailwind CSS (follow Vite + Tailwind setup guide)
- [ ] Set up folder structure: `src/pages`, `src/components`, `src/hooks`, `src/services`, `src/types`, `src/context`
- [ ] Install React Router and configure routes in `src/App.tsx`
- [ ] Create an Axios instance in `src/services/api.ts` with the base URL from an env variable; add a request interceptor to attach the JWT access token
- [ ] Add a response interceptor to handle `401` errors by attempting a token refresh, then retrying the original request
- [ ] Define TypeScript interfaces for all API response shapes in `src/types/`

### Auth Pages & State

- [ ] Build `RegisterPage` with email, password, and display name fields; show inline validation errors
- [ ] Build `LoginPage` with email and password fields
- [ ] Build `ForgotPasswordPage` with email field and success message
- [ ] Build `ResetPasswordPage` that reads the token from the URL query string
- [ ] Create `AuthContext` using React Context + `useReducer` to hold `user` state and `isAuthenticated`
- [ ] Implement `login`, `logout`, and `register` actions in `AuthContext` that call the API and store the access token in memory (not localStorage)
- [ ] Store the refresh token in an `httpOnly` cookie (or handle refresh via a `/refresh` call on app load)
- [ ] Create a `ProtectedRoute` component that redirects unauthenticated users to `/login`
- [ ] Wrap all app routes with `ProtectedRoute` except `/login`, `/register`, `/forgot-password`, `/reset-password`

### Dashboard

- [ ] Build the main app layout: side nav (or top nav) with links to Dashboard, History, Trends, Settings; show user display name
- [ ] Build `DashboardPage` that shows today's date and a summary of what has been logged today
- [ ] Add a "quick-add" button for each log type (Symptom, Mood, Medication, Habit) that opens the relevant modal
- [ ] Add a "days logged this week" streak indicator using data from the API
- [ ] Use teal/sage color palette throughout (avoid harsh blues; keep the UI calm and accessible)

### Logging Forms / Modals

- [ ] Build a shared `Modal` component that can wrap any content
- [ ] Build `LogSymptomModal`: dropdown to select symptom, 1–10 severity slider or number input, optional notes, date/time picker (defaults to now)
- [ ] Build `LogMoodModal`: 1–5 rating for mood, optional energy and stress ratings, optional notes, date/time picker
- [ ] Build `LogMedicationModal`: select medication from list, toggle taken/not taken, optional taken_at time, notes
- [ ] Build `LogHabitModal`: select habit, input adapts based on `tracking_type` (checkbox for boolean, number input for numeric, duration input for duration), notes, date/time picker
- [ ] All modals should show loading state on submit and display API errors inline
- [ ] Support backfilling: the date picker in each modal should allow selecting past dates

---

## Phase 3: Full Features (Weeks 7–9)

### History View

- [ ] Build `HistoryPage` that fetches all log types and groups entries by calendar day
- [ ] Show each day as a collapsible section with a summary count of entries
- [ ] Render individual entries within each day (symptom name + severity, mood score, med taken/not, habit value)
- [ ] Add a filter bar to show/hide by type: Symptoms, Mood, Medications, Habits
- [ ] Clicking an entry opens the relevant edit modal pre-filled with existing data
- [ ] Add a delete button on each entry with a confirmation prompt

### Trends & Charts

- [ ] Install Recharts (`npm install recharts`)
- [ ] Build `TrendsPage` with a date range selector: 7 / 30 / 90 days
- [ ] Build a `LineChart` component using Recharts showing symptom severity over time; allow selecting which symptoms to display
- [ ] Build charts for mood score, energy level, and stress level over time
- [ ] Build a calendar heatmap (or use a library like `react-calendar-heatmap`) showing which days have log entries
- [ ] Color-code the calendar by activity level (number of entries logged that day)

### Settings & Customization

- [ ] Build `SettingsPage` with sections: Profile, Symptoms, Habits, Medications, Export, Account
- [ ] Profile section: form to edit `display_name` and `timezone` (use a timezone picker library or a `<select>` with IANA timezone list)
- [ ] Symptoms section: list all symptoms with toggle to show/hide (sets `is_active`); button to add a custom symptom
- [ ] Habits section: same pattern as symptoms — toggle active/inactive, add custom habit
- [ ] Medications section: list medications, add new, edit (name/dosage/frequency), toggle active, delete
- [ ] Export section: date range picker + "Download CSV" button that calls `GET /api/export/csv`
- [ ] Account section: "Delete Account" button with a confirmation dialog (type your email to confirm); calls `DELETE /api/users/me` and redirects to login

### Insights & Export API

- [ ] Build `GET /api/insights/trends` — accepts `type` (symptom_id, mood, energy, stress) and `days` (7/30/90); return aggregated daily averages as a JSON array suitable for charting
- [ ] Build `GET /api/export/csv` — accepts optional `startDate` / `endDate`; query all log types for the user and stream a CSV response with headers per log type (or one file with multiple sections)

---

## Phase 4: Polish & Launch (Weeks 10–12)

### Testing

- [ ] Write unit tests for auth service functions (password hashing, token generation/validation)
- [ ] Write integration tests for the auth endpoints (register, login, refresh, logout)
- [ ] Write integration tests for at least one CRUD resource end-to-end (e.g., symptom logs)
- [ ] Test all log modals on mobile screen sizes (375px width) in browser devtools; fix any layout issues
- [ ] Test the full user flow: register → log symptom → view in history → view in trends → export CSV → delete account

### Performance

- [ ] Review all Prisma queries — ensure `where` clauses on `user_id` and `logged_at` are using the indexed fields
- [ ] Add pagination to all `GET` list endpoints that could return large data sets (confirm `limit` + `offset` work correctly)
- [ ] Audit the React bundle size with `vite build --report`; code-split the Trends page if the charting library is large
- [ ] Confirm all API responses include `Content-Type: application/json` and proper status codes

### Deployment

- [ ] Set up a production PostgreSQL database (Railway or Render)
- [ ] Run `prisma migrate deploy` against production DB and run seed script
- [ ] Deploy the backend to Railway or Render; set all required environment variables (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, email credentials)
- [ ] Deploy the frontend to Vercel; set `VITE_API_URL` to the production backend URL
- [ ] Confirm HTTPS is enabled on both frontend and backend
- [ ] Smoke test the deployed app: register a new user, log one entry of each type, view trends, export CSV
- [ ] Set up basic uptime monitoring (UptimeRobot free tier or similar)
