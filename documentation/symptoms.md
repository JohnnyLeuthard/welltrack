# Symptoms & Symptom Logs

All endpoints require a valid JWT.

**Headers (all endpoints)**

```
Authorization: Bearer <accessToken>
```

---

## Symptoms

Symptoms are the conditions being tracked (e.g. "Headache", "Fatigue"). The database includes system-default symptoms (shared across all users, `userId = null`) and user-created custom symptoms.

### GET /api/symptoms

Return all symptoms visible to the current user: system defaults plus the user's own custom symptoms.

**Response — 200 OK**

```json
[
  {
    "id": "clxxx...",
    "userId": null,
    "name": "Headache",
    "category": "Neurological",
    "isActive": true
  },
  {
    "id": "clyyy...",
    "userId": "clzzz...",
    "name": "My Custom Symptom",
    "category": null,
    "isActive": true
  }
]
```

---

### POST /api/symptoms

Create a custom symptom for the authenticated user.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `name` | string | Yes | Non-empty |
| `category` | string | No | Any string |

```json
{
  "name": "Eye Strain",
  "category": "Neurological"
}
```

**Response — 201 Created**

```json
{
  "id": "clxxx...",
  "userId": "cluuu...",
  "name": "Eye Strain",
  "category": "Neurological",
  "isActive": true
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | `name` is missing or empty; `category` is not a string |

---

### PATCH /api/symptoms/:id

Update a custom symptom. Only the owner of the symptom may update it — system defaults are read-only.

**URL parameter:** `id` — the symptom ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Non-empty |
| `category` | string \| null | Any string, or `null` to clear |
| `isActive` | boolean | `true` or `false` |

```json
{
  "name": "Eye Pain",
  "isActive": false
}
```

**Response — 200 OK**

Returns the updated symptom object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Symptom belongs to another user or is a system default |
| 404 | Symptom not found |
| 422 | Validation error on any field |

---

### DELETE /api/symptoms/:id

Delete a custom symptom. System defaults cannot be deleted.

**URL parameter:** `id` — the symptom ID

**Response — 200 OK**

```json
{
  "message": "Symptom deleted successfully"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Symptom is a system default or belongs to another user |
| 404 | Symptom not found |

---

## Symptom Logs

Log entries recording when and how severely a symptom was experienced.

### GET /api/symptom-logs

Return symptom logs for the authenticated user. Sorted by `loggedAt` descending.

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
    "symptomId": "clsss...",
    "severity": 7,
    "notes": "Came on after lunch",
    "loggedAt": "2026-02-21T13:30:00.000Z",
    "createdAt": "2026-02-21T13:31:00.000Z"
  }
]
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | Invalid date format, non-integer limit/offset |

---

### POST /api/symptom-logs

Create a new symptom log entry.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `symptomId` | string | Yes | Must be a valid symptom ID accessible to the user |
| `severity` | integer | Yes | 1–10 |
| `notes` | string | No | Any text |
| `loggedAt` | ISO 8601 string | No | Defaults to now if omitted |

```json
{
  "symptomId": "clsss...",
  "severity": 6,
  "notes": "Dull ache behind eyes",
  "loggedAt": "2026-02-21T09:00:00.000Z"
}
```

**Response — 201 Created**

Returns the created log object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | `symptomId` not found or not accessible to the user |
| 422 | `symptomId` missing; `severity` not an integer 1–10; invalid `loggedAt` |

---

### PATCH /api/symptom-logs/:id

Update a symptom log. Only the log's owner may update it.

**URL parameter:** `id` — the log ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `severity` | integer | 1–10 |
| `notes` | string \| null | Any text, or `null` to clear |
| `loggedAt` | ISO 8601 string | Valid date |

```json
{
  "severity": 4,
  "notes": null
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

### DELETE /api/symptom-logs/:id

Delete a symptom log. Only the log's owner may delete it.

**URL parameter:** `id` — the log ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Log belongs to another user |
| 404 | Log not found |
