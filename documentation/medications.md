# Medications & Medication Logs

All endpoints require a valid JWT.

**Headers (all endpoints)**

```
Authorization: Bearer <accessToken>
```

---

## Medications

Medications belonging to the authenticated user. Each medication can be active or inactive.

### GET /api/medications

Return all medications for the authenticated user.

**Response — 200 OK**

```json
[
  {
    "id": "clxxx...",
    "userId": "cluuu...",
    "name": "Ibuprofen",
    "dosage": "400mg",
    "frequency": "As needed",
    "isActive": true,
    "createdAt": "2026-02-01T10:00:00.000Z"
  }
]
```

---

### POST /api/medications

Create a new medication.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `name` | string | Yes | Non-empty |
| `dosage` | string | No | e.g. `"400mg"` |
| `frequency` | string | No | e.g. `"Twice daily"`, `"As needed"` |

```json
{
  "name": "Ibuprofen",
  "dosage": "400mg",
  "frequency": "As needed"
}
```

**Response — 201 Created**

Returns the created medication object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | `name` is missing or empty; `dosage`/`frequency` not a string |

---

### PATCH /api/medications/:id

Update a medication. Only the owner may update it.

**URL parameter:** `id` — the medication ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Non-empty |
| `dosage` | string \| null | Any string, or `null` to clear |
| `frequency` | string \| null | Any string, or `null` to clear |
| `isActive` | boolean | `true` or `false` |

```json
{
  "dosage": "600mg",
  "isActive": false
}
```

**Response — 200 OK**

Returns the updated medication object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Medication belongs to another user |
| 404 | Medication not found |
| 422 | Validation error on any field |

---

### DELETE /api/medications/:id

Delete a medication. Only the owner may delete it.

**URL parameter:** `id` — the medication ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Medication belongs to another user |
| 404 | Medication not found |

---

## Medication Logs

Log entries recording whether a medication was taken.

### GET /api/medication-logs

Return medication logs for the authenticated user. Sorted by `createdAt` descending.

> **Note:** Medication logs use `createdAt` for filtering (not `loggedAt`) — there is no `loggedAt` field on this resource.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO 8601 string | Include logs created on or after this date |
| `endDate` | ISO 8601 string | Include logs created on or before this date |
| `limit` | positive integer | Maximum records to return |
| `offset` | non-negative integer | Records to skip (for pagination) |

**Response — 200 OK**

```json
[
  {
    "id": "clxxx...",
    "userId": "cluuu...",
    "medicationId": "clmmm...",
    "taken": true,
    "takenAt": "2026-02-21T08:30:00.000Z",
    "notes": "Taken with food",
    "createdAt": "2026-02-21T08:31:00.000Z"
  }
]
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 422 | Invalid date format, non-integer limit/offset |

---

### POST /api/medication-logs

Log a medication as taken or not taken.

**Request body**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `medicationId` | string | Yes | Must be a valid medication belonging to the user |
| `taken` | boolean | No | Whether the medication was taken; defaults to `true` |
| `takenAt` | ISO 8601 string | No | When it was taken; defaults to now if omitted |
| `notes` | string | No | Any text |

```json
{
  "medicationId": "clmmm...",
  "taken": true,
  "takenAt": "2026-02-21T08:30:00.000Z",
  "notes": "Taken with food"
}
```

**Response — 201 Created**

Returns the created log object (same shape as the list response).

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | `medicationId` not found or belongs to another user |
| 422 | `medicationId` missing; `taken` not a boolean; invalid `takenAt` |

---

### PATCH /api/medication-logs/:id

Update a medication log. Only the log's owner may update it.

**URL parameter:** `id` — the log ID

**Request body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `taken` | boolean | `true` or `false` |
| `takenAt` | ISO 8601 string \| null | Valid date, or `null` to clear |
| `notes` | string \| null | Any text, or `null` to clear |

```json
{
  "taken": false,
  "takenAt": null
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

### DELETE /api/medication-logs/:id

Delete a medication log. Only the log's owner may delete it.

**URL parameter:** `id` — the log ID

**Response — 204 No Content**

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Log belongs to another user |
| 404 | Log not found |
