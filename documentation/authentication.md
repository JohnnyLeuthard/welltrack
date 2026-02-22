# Authentication

All auth endpoints live under `/api/auth`. None of them require a JWT unless noted.

---

## POST /api/auth/register

Create a new user account.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |
| `displayName` | string | No | Any non-empty string |

```json
{
  "email": "jane@example.com",
  "password": "supersecret123",
  "displayName": "Jane Doe"
}
```

**Response — 201 Created**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "user": {
    "id": "clxxx...",
    "email": "jane@example.com",
    "displayName": "Jane Doe",
    "timezone": null,
    "createdAt": "2026-02-21T12:00:00.000Z"
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 409 | Email already registered |
| 422 | Missing/invalid email or password too short |

---

## POST /api/auth/login

Authenticate with email and password.

**Request body**

| Field | Type | Required |
|-------|------|:--------:|
| `email` | string | Yes |
| `password` | string | Yes |

```json
{
  "email": "jane@example.com",
  "password": "supersecret123"
}
```

**Response — 200 OK**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "user": {
    "id": "clxxx...",
    "email": "jane@example.com",
    "displayName": "Jane Doe",
    "timezone": null,
    "createdAt": "2026-02-21T12:00:00.000Z"
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Invalid email or password |
| 422 | Missing/invalid email or password |

---

## POST /api/auth/refresh

Exchange a valid refresh token for a new access token. The old refresh token is rotated (invalidated and replaced).

**Request body**

| Field | Type | Required |
|-------|------|:--------:|
| `refreshToken` | string | Yes |

```json
{
  "refreshToken": "<token>"
}
```

**Response — 200 OK**

```json
{
  "accessToken": "<new-jwt>",
  "refreshToken": "<new-token>"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Refresh token not found, expired, or already used |
| 422 | `refreshToken` field missing |

---

## POST /api/auth/logout

Invalidate the current refresh token. Requires a valid JWT access token.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request body**

| Field | Type | Required |
|-------|------|:--------:|
| `refreshToken` | string | Yes |

```json
{
  "refreshToken": "<token>"
}
```

**Response — 200 OK**

```json
{
  "message": "Logged out successfully"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
| 422 | `refreshToken` field missing |

---

## POST /api/auth/forgot-password

Request a password reset link. Always returns 200 regardless of whether the email exists, to prevent user enumeration.

**Request body**

| Field | Type | Required |
|-------|------|:--------:|
| `email` | string | Yes |

```json
{
  "email": "jane@example.com"
}
```

**Response — 200 OK**

```json
{
  "message": "If that email is registered, a reset link has been sent"
}
```

> **Note:** In development the reset link is printed to the server console rather than sent via email.

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | Invalid email format |

---

## POST /api/auth/reset-password

Reset a user's password using the token from the reset link.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `token` | string | Yes | The raw token from the reset link |
| `password` | string | Yes | Minimum 8 characters |

```json
{
  "token": "<reset-token>",
  "password": "newpassword456"
}
```

**Response — 200 OK**

```json
{
  "message": "Password reset successfully"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Token not found, expired, or already used |
| 422 | Missing token or password too short |
