# WellTrack API Documentation

WellTrack is a symptom & wellness tracker REST API. This documentation covers all available endpoints for Phase 1 of the backend.

**Base URL:** `http://localhost:3000`

---

## Contents

| File | Description |
|------|-------------|
| [authentication.md](./authentication.md) | Register, login, logout, token refresh, password reset |
| [users.md](./users.md) | Authenticated user profile (get, update, delete) |
| [symptoms.md](./symptoms.md) | Symptoms CRUD + Symptom Logs CRUD |
| [mood-logs.md](./mood-logs.md) | Mood Logs CRUD |
| [medications.md](./medications.md) | Medications CRUD + Medication Logs CRUD |
| [habits.md](./habits.md) | Habits CRUD + Habit Logs CRUD |

---

## Quick Reference

### Auth Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| POST | `/api/auth/refresh` | No |
| POST | `/api/auth/logout` | Yes |
| POST | `/api/auth/forgot-password` | No |
| POST | `/api/auth/reset-password` | No |

### User Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| GET | `/api/users/me` | Yes |
| PATCH | `/api/users/me` | Yes |
| DELETE | `/api/users/me` | Yes |

### Symptom Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| GET | `/api/symptoms` | Yes |
| POST | `/api/symptoms` | Yes |
| PATCH | `/api/symptoms/:id` | Yes |
| DELETE | `/api/symptoms/:id` | Yes |
| GET | `/api/symptom-logs` | Yes |
| POST | `/api/symptom-logs` | Yes |
| PATCH | `/api/symptom-logs/:id` | Yes |
| DELETE | `/api/symptom-logs/:id` | Yes |

### Mood Log Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| GET | `/api/mood-logs` | Yes |
| POST | `/api/mood-logs` | Yes |
| PATCH | `/api/mood-logs/:id` | Yes |
| DELETE | `/api/mood-logs/:id` | Yes |

### Medication Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| GET | `/api/medications` | Yes |
| POST | `/api/medications` | Yes |
| PATCH | `/api/medications/:id` | Yes |
| DELETE | `/api/medications/:id` | Yes |
| GET | `/api/medication-logs` | Yes |
| POST | `/api/medication-logs` | Yes |
| PATCH | `/api/medication-logs/:id` | Yes |
| DELETE | `/api/medication-logs/:id` | Yes |

### Habit Endpoints
| Method | Path | Auth Required |
|--------|------|:---:|
| GET | `/api/habits` | Yes |
| POST | `/api/habits` | Yes |
| PATCH | `/api/habits/:id` | Yes |
| DELETE | `/api/habits/:id` | Yes |
| GET | `/api/habit-logs` | Yes |
| POST | `/api/habit-logs` | Yes |
| PATCH | `/api/habit-logs/:id` | Yes |
| DELETE | `/api/habit-logs/:id` | Yes |

---

## Authentication

Protected endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained from `POST /api/auth/login` or `POST /api/auth/register`. Access tokens expire after **15 minutes**. Use `POST /api/auth/refresh` with your refresh token to obtain a new access token.

---

## Error Responses

All errors return a consistent JSON shape:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (e.g. expired/invalid reset token) |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not authorised (e.g. editing another user's resource) |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already registered) |
| 422 | Validation error — request body or query param failed validation |
| 500 | Unexpected server error |

---

## Common Query Parameters

The following query parameters are accepted by all `GET` list endpoints:

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO 8601 string | Filter results on or after this date |
| `endDate` | ISO 8601 string | Filter results on or before this date |
| `limit` | positive integer | Maximum number of records to return |
| `offset` | non-negative integer | Number of records to skip (for pagination) |

---

## Getting Started with Postman

1. Start the database: `docker compose up -d`
2. Start the API server: `npm run dev`
3. Register a user: `POST http://localhost:3000/api/auth/register`
4. Copy the `accessToken` from the response
5. Add the header `Authorization: Bearer <accessToken>` to subsequent requests
