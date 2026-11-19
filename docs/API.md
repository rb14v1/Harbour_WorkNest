# API reference

Base path: `/api/v1`. Interactive documentation: `http://localhost:8000/docs`.

## Conventions

- No trailing slashes. `/api/v1/projects/` returns 404 (no redirect).
- IDs are 24-character hexadecimal strings. Malformed IDs return `400`. Missing records return `404`.
- Duplicate emails and conflicting state changes return `409`.
- Validation errors return `422` with FastAPI's standard `detail` array.
- Database failures return `503` with `{"detail": "Database unavailable"}`. Unexpected errors return `500` with `{"detail": "Internal server error"}`. No stack traces are returned.
- No authentication. Local/demo use only.
- Lists return at most 500 items, newest first (by `created_at`), except employees (sorted by name).

## Health

### `GET /health`

```json
{ "status": "ok", "database": "ok" }
```

Returns `503` with `{"status": "error", "database": "unavailable"}` when MongoDB cannot be reached.

## Input rules

Field limits and allowed characters are listed in the README under "Input rules and limits". Violations return `422` (format and length) or `400` (business rules). Team rules:

- A project needs at least one team member other than the team lead (`422` on create, `400` on update).
- The team lead cannot also appear in `team_member_ids` (`422` on create, `400` on update).

## Dashboard

### `GET /api/v1/dashboard/stats`

Response:

```json
{
  "total_projects": 4,
  "active_projects": 2,
  "total_tasks": 12,
  "task_counts": { "Pending": 5, "In Progress": 3, "Blocked": 1, "Completed": 3 },
  "overdue_tasks": 2,
  "handovers_awaiting_acknowledgement": 1,
  "recent_projects": [
    { "id": "66a1f0c2e4b0a1b2c3d4e5f6", "name": "Billing Service", "status": "Active", "created_at": "2026-11-18T09:12:00Z" }
  ],
  "recent_handovers": [
    { "id": "66a1f0c2e4b0a1b2c3d4e7aa", "project_id": "66a1f0c2e4b0a1b2c3d4e5f6", "status": "Submitted", "created_at": "2026-11-18T10:03:00Z" }
  ]
}
```

## Employees

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/employees` | List. Query: `q` (name or email contains), `is_active` (bool). |
| POST | `/api/v1/employees` | Create. Returns `201`. |
| GET | `/api/v1/employees/{employee_id}` | Get one. |
| PATCH | `/api/v1/employees/{employee_id}` | Partial update. `null` is rejected for required fields. |

Create request:

```json
{
  "name": "Asha Rao",
  "email": "Asha.Rao@example.com",
  "department": "Delivery",
  "job_title": "Project Manager",
  "is_active": true
}
```

Response (`email` is normalised to lowercase):

```json
{
  "id": "66a1f0c2e4b0a1b2c3d4e5f1",
  "name": "Asha Rao",
  "email": "asha.rao@example.com",
  "department": "Delivery",
  "job_title": "Project Manager",
  "is_active": true,
  "created_at": "2026-11-18T09:00:00Z",
  "updated_at": "2026-11-18T09:00:00Z"
}
```

Deactivate: `PATCH /api/v1/employees/{id}` with `{"is_active": false}`.

## Projects

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/projects` | List. Query: `q` (name contains), `status`. |
| POST | `/api/v1/projects` | Create. Returns `201`. |
| GET | `/api/v1/projects/{project_id}` | Get one. |
| PATCH | `/api/v1/projects/{project_id}` | Partial update. |
| DELETE | `/api/v1/projects/{project_id}` | Archives if the project has tasks or handovers, otherwise deletes. |

Create request:

```json
{
  "name": "Billing Service",
  "description": "Rebuild invoicing",
  "status": "Active",
  "priority": "High",
  "start_date": "2026-01-05",
  "target_date": "2026-06-30",
  "team_lead_id": "66a1f0c2e4b0a1b2c3d4e5f1",
  "team_member_ids": ["66a1f0c2e4b0a1b2c3d4e5f2"]
}
```

Delete response:

```json
{ "id": "66a1f0c2e4b0a1b2c3d4e5f6", "action": "archived" }
```

`action` is `archived` or `deleted`.

## Tasks

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/tasks` | List. Query: `project_id`, `assigned_to`, `status`, `priority`, `overdue` (bool). |
| POST | `/api/v1/tasks` | Create. Returns `201`. Project must exist and not be archived. |
| GET | `/api/v1/tasks/{task_id}` | Get one. |
| PATCH | `/api/v1/tasks/{task_id}` | Partial update. Can append a progress note. |
| DELETE | `/api/v1/tasks/{task_id}` | Delete. Also removes the task ID from any handover. |

Create request:

```json
{
  "project_id": "66a1f0c2e4b0a1b2c3d4e5f6",
  "title": "Write integration tests",
  "description": "Cover the invoice export path",
  "assigned_to": "66a1f0c2e4b0a1b2c3d4e5f2",
  "status": "Pending",
  "priority": "Medium",
  "due_date": "2026-03-15"
}
```

Update with a progress note and a status change:

```json
{
  "status": "In Progress",
  "progress_note": {
    "author_id": "66a1f0c2e4b0a1b2c3d4e5f2",
    "text": "Export endpoint done; starting tests."
  }
}
```

Response (abridged):

```json
{
  "id": "66a1f0c2e4b0a1b2c3d4e5f9",
  "project_id": "66a1f0c2e4b0a1b2c3d4e5f6",
  "title": "Write integration tests",
  "status": "In Progress",
  "priority": "Medium",
  "due_date": "2026-03-15",
  "is_overdue": false,
  "progress_notes": [
    { "author_id": "66a1f0c2e4b0a1b2c3d4e5f2", "text": "Export endpoint done; starting tests.", "timestamp": "2026-02-02T11:20:00Z" }
  ],
  "completed_at": null
}
```

`assigned_to` and `due_date` accept `null` to clear them. `status` set to `Completed` sets `completed_at`; any other status clears it.

## Handovers

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/handovers` | List. Query: `project_id`, `status`, `to_employee_id`, `from_employee_id`. |
| POST | `/api/v1/handovers` | Create a draft. Returns `201`. |
| GET | `/api/v1/handovers/{handover_id}` | Get one. |
| PATCH | `/api/v1/handovers/{handover_id}` | Edit. Draft only (`409` otherwise). |
| POST | `/api/v1/handovers/{handover_id}/submit` | `Draft` → `Submitted`. |
| POST | `/api/v1/handovers/{handover_id}/acknowledge` | `Submitted` → `Acknowledged`. |

Create request:

```json
{
  "project_id": "66a1f0c2e4b0a1b2c3d4e5f6",
  "from_employee_id": "66a1f0c2e4b0a1b2c3d4e5f1",
  "to_employee_id": "66a1f0c2e4b0a1b2c3d4e5f2",
  "summary": "Billing service is in the middle of the invoice export rewrite.",
  "completed_work": ["Schema migration done"],
  "pending_work": ["Export endpoint tests"],
  "blockers": ["Waiting on vendor sandbox credentials"],
  "known_issues": ["Timeout on invoices over 500 lines"],
  "next_steps": ["Add load test for large invoices"],
  "useful_links": [{ "label": "Repository", "url": "https://git.example.com/billing" }],
  "task_ids": ["66a1f0c2e4b0a1b2c3d4e5f9"]
}
```

Validation: `from_employee_id` and `to_employee_id` must differ and exist. `project_id` must exist and not be archived. Every `task_ids` entry must belong to `project_id`.

Submit response (abridged):

```json
{
  "id": "66a1f0c2e4b0a1b2c3d4e7aa",
  "status": "Submitted",
  "submitted_at": "2026-02-03T16:45:00Z",
  "acknowledged_at": null
}
```

Errors:

| Situation | Status | Example `detail` |
|---|---|---|
| Edit a submitted handover | 409 | `Only draft handovers can be edited` |
| Submit a non-draft | 409 | `Handover must be Draft to move to Submitted` |
| Acknowledge a draft | 409 | `Handover must be Submitted to move to Acknowledged` |
| Same outgoing and incoming employee | 400 | `Outgoing and incoming employees must be different` |
| Task from another project | 400 | `One or more task IDs do not belong to this project` |
