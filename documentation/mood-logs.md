# Mood Logs

Log entries recording mood, energy, and stress levels. All endpoints require a valid JWT.

**Headers (all endpoints)**

```
Authorization: Bearer <accessToken>
```

---

## GET /api/mood-logs

Return mood logs for the authenticated user. Sorted by `loggedAt` descending.

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
    "moodScore": 4,
    "energyLevel": 3,
    "stressLevel": 2,
    "notes": "Feeling pretty good today",
    "loggedAt": "2026-02-21T08:00:00.000Z",
    "createdAt": "2026-02-21T08:01:00.000Z"
  }
]
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | Invalid date format, non-integer limit/offset |

---

## POST /api/mood-logs

Create a new mood log entry.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `moodScore` | integer | Yes | 1–5 |
| `energyLevel` | integer | No | 1–5 |
| `stressLevel` | integer | No | 1–5 |
| `notes` | string | No | Any text |
| `loggedAt` | ISO 8601 string | No | Defaults to now if omitted |

**Score scale:** 1 = very low / very stressed, 5 = very high / very calm

```json
{
  "moodScore": 4,
  "energyLevel": 3,
  "stressLevel": 2,
  "notes": "Feeling pretty good today",
  "loggedAt": "2026-02-21T08:00:00.000Z"
}
```

**Response — 201 Created**

Returns the created log object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | `moodScore` missing or not an integer 1–5; `energyLevel`/`stressLevel` not in 1–5 range; invalid `loggedAt` |

---

## PATCH /api/mood-logs/:id

Update a mood log. Only the log's owner may update it.

**URL parameter:** `id` — the log ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `moodScore` | integer | 1–5 |
| `energyLevel` | integer \| null | 1–5, or `null` to clear |
| `stressLevel` | integer \| null | 1–5, or `null` to clear |
| `notes` | string \| null | Any text, or `null` to clear |
| `loggedAt` | ISO 8601 string | Valid date |

```json
{
  "moodScore": 2,
  "stressLevel": 5,
  "notes": "Rough afternoon"
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

## DELETE /api/mood-logs/:id

Delete a mood log. Only the log's owner may delete it.

**URL parameter:** `id` — the log ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Log belongs to another user |
| 404 | Log not found |
