# Users

Endpoints for reading and managing the authenticated user's own profile. All endpoints require a valid JWT.

**Headers (all endpoints)**

```
Authorization: Bearer <accessToken>
```

---

## GET /api/users/me

Return the authenticated user's profile. Password hash is never included.

**Response — 200 OK**

```json
{
  "id": "clxxx...",
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "timezone": "America/New_York",
  "createdAt": "2026-02-21T12:00:00.000Z"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |

---

## PATCH /api/users/me

Update the authenticated user's `displayName` and/or `timezone`. All fields are optional — only send the fields you want to change.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `displayName` | string \| null | No | Any string, or `null` to clear |
| `timezone` | string | No | Must be a valid IANA timezone (e.g. `"America/New_York"`) |

```json
{
  "displayName": "Jane Smith",
  "timezone": "Europe/London"
}
```

**Response — 200 OK**

Returns the updated user object (same shape as `GET /api/users/me`).

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
| 422 | `displayName` is not a string/null, or `timezone` is not a valid IANA string |

---

## DELETE /api/users/me

Permanently delete the authenticated user's account and cascade-delete all associated data (logs, medications, habits, tokens).

**Response — 200 OK**

```json
{
  "message": "Account deleted successfully"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
