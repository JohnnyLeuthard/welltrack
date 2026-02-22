# Habits & Habit Logs

All endpoints require a valid JWT.

**Headers (all endpoints)**

```
Authorization: Bearer <accessToken>
```

---

## Habits

Habits define what is being tracked (e.g. "Sleep Duration", "Water Intake"). The database includes system-default habits (shared across all users, `userId = null`) and user-created custom habits.

Each habit has a `trackingType` that determines which value field should be populated in a habit log:

| `trackingType` | Value field | Description |
|---------------|-------------|-------------|
| `boolean` | `valueBoolean` | Yes/no habit (e.g. "Did you exercise?") |
| `numeric` | `valueNumeric` | A counted quantity (e.g. glasses of water) |
| `duration` | `valueDuration` | A duration in minutes (e.g. sleep minutes) |

---

### GET /api/habits

Return all habits visible to the current user: system defaults plus the user's own custom habits.

**Response — 200 OK**

```json
[
  {
    "id": "clxxx...",
    "userId": null,
    "name": "Sleep Duration",
    "trackingType": "duration",
    "unit": "minutes",
    "isActive": true
  },
  {
    "id": "clyyy...",
    "userId": "cluuu...",
    "name": "Meditation",
    "trackingType": "boolean",
    "unit": null,
    "isActive": true
  }
]
```

---

### POST /api/habits

Create a custom habit for the authenticated user.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `name` | string | Yes | Non-empty |
| `trackingType` | string | Yes | `"boolean"`, `"numeric"`, or `"duration"` |
| `unit` | string | No | e.g. `"glasses"`, `"minutes"` |

```json
{
  "name": "Meditation",
  "trackingType": "boolean"
}
```

```json
{
  "name": "Water Intake",
  "trackingType": "numeric",
  "unit": "glasses"
}
```

**Response — 201 Created**

Returns the created habit object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | `name` missing/empty; `trackingType` not one of `boolean`, `numeric`, `duration`; `unit` not a string |

---

### PATCH /api/habits/:id

Update a custom habit. Only the owner may update it — system defaults are read-only. Note: `trackingType` cannot be changed after creation.

**URL parameter:** `id` — the habit ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Non-empty |
| `unit` | string \| null | Any string, or `null` to clear |
| `isActive` | boolean | `true` or `false` |

```json
{
  "name": "Morning Meditation",
  "isActive": true
}
```

**Response — 200 OK**

Returns the updated habit object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Habit belongs to another user or is a system default |
| 404 | Habit not found |
| 422 | Validation error on any field |

---

### DELETE /api/habits/:id

Delete a custom habit. System defaults cannot be deleted.

**URL parameter:** `id` — the habit ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Habit is a system default or belongs to another user |
| 404 | Habit not found |

---

## Habit Logs

Log entries recording the tracked value for a habit on a given day. Only the value field matching the habit's `trackingType` should be populated.

### GET /api/habit-logs

Return habit logs for the authenticated user. Sorted by `loggedAt` descending.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO 8601 string | Include logs on or after this date |
| `endDate` | ISO 8601 string | Include logs on or before this date |
| `limit` | positive integer | Maximum records to return |
| `offset` | non-negative integer | Records to skip (for pagination) |

**Response — 200 OK**

```json
[
  {
    "id": "clxxx...",
    "userId": "cluuu...",
    "habitId": "clhhh...",
    "valueBoolean": null,
    "valueNumeric": null,
    "valueDuration": 480,
    "notes": "Slept well",
    "loggedAt": "2026-02-21T07:00:00.000Z",
    "createdAt": "2026-02-21T07:01:00.000Z"
  }
]
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | Invalid date format, non-integer limit/offset |

---

### POST /api/habit-logs

Create a new habit log entry. Populate only the value field that matches the habit's `trackingType`.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `habitId` | string | Yes | Must be a valid habit ID accessible to the user |
| `valueBoolean` | boolean | Conditional | Use for `trackingType: "boolean"` habits |
| `valueNumeric` | number | Conditional | Use for `trackingType: "numeric"` habits |
| `valueDuration` | integer | Conditional | Use for `trackingType: "duration"` habits; non-negative whole number (minutes) |
| `notes` | string | No | Any text |
| `loggedAt` | ISO 8601 string | No | Defaults to now if omitted |

**Example — boolean habit (Exercise)**

```json
{
  "habitId": "clhhh...",
  "valueBoolean": true,
  "loggedAt": "2026-02-21T07:00:00.000Z"
}
```

**Example — numeric habit (Water Intake)**

```json
{
  "habitId": "clhhh...",
  "valueNumeric": 8,
  "notes": "Hit my daily goal"
}
```

**Example — duration habit (Sleep)**

```json
{
  "habitId": "clhhh...",
  "valueDuration": 480,
  "notes": "Slept 8 hours"
}
```

**Response — 201 Created**

Returns the created log object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | `habitId` not found or not accessible to the user |
| 422 | `habitId` missing; wrong value field for the habit's `trackingType`; `valueDuration` is not a non-negative integer; invalid `loggedAt` |

---

### PATCH /api/habit-logs/:id

Update a habit log. Only the log's owner may update it.

**URL parameter:** `id` — the log ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `valueBoolean` | boolean \| null | `true`/`false`, or `null` to clear |
| `valueNumeric` | number \| null | Any number, or `null` to clear |
| `valueDuration` | integer \| null | Non-negative integer, or `null` to clear |
| `notes` | string \| null | Any text, or `null` to clear |
| `loggedAt` | ISO 8601 string | Valid date |

```json
{
  "valueDuration": 420,
  "notes": "Slept less than planned"
}
```

**Response — 200 OK**

Returns the updated log object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Log belongs to another user |
| 404 | Log not found |
| 422 | Validation error on any field |

---

### DELETE /api/habit-logs/:id

Delete a habit log. Only the log's owner may delete it.

**URL parameter:** `id` — the log ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Log belongs to another user |
| 404 | Log not found |
