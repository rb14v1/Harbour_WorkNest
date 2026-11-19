# Data model

MongoDB database: `MONGODB_DATABASE` (development) or `MONGODB_TEST_DATABASE` (tests).
Four collections. Identifiers are MongoDB `ObjectId` values, returned as strings in API responses. Dates are stored as BSON dates in UTC.

## Collections

### `employees`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | 1–200 characters |
| `email` | string | Lowercase, unique |
| `department` | string | |
| `job_title` | string | |
| `is_active` | bool | Default `true` |
| `created_at` | date | |
| `updated_at` | date | |

### `projects`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | |
| `description` | string | May be empty |
| `status` | string | `Planning`, `Active`, `On Hold`, `Completed`, `Archived` |
| `priority` | string | `Low`, `Medium`, `High`, `Critical` |
| `start_date` | date or null | |
| `target_date` | date or null | Not earlier than `start_date` |
| `team_lead_id` | ObjectId | Reference to `employees._id` |
| `team_member_ids` | array of ObjectId | References to `employees._id` |
| `created_at` | date | |
| `updated_at` | date | |
| `archived_at` | date or null | Set when status becomes `Archived`, cleared otherwise |

### `tasks`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `project_id` | ObjectId | Reference to `projects._id`. Fixed after creation. |
| `title` | string | |
| `description` | string | May be empty |
| `assigned_to` | ObjectId or null | Reference to `employees._id` |
| `status` | string | `Pending`, `In Progress`, `Blocked`, `Completed` |
| `priority` | string | `Low`, `Medium`, `High`, `Critical` |
| `due_date` | date or null | |
| `progress_notes` | array of embedded notes | See below |
| `created_at` | date | |
| `updated_at` | date | |
| `completed_at` | date or null | Set when status becomes `Completed`, cleared when reopened |

Embedded progress note:

| Field | Type |
|---|---|
| `author_id` | ObjectId (reference to `employees._id`) |
| `text` | string, up to 2000 characters |
| `timestamp` | date |

### `handovers`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `project_id` | ObjectId | Reference to `projects._id` |
| `from_employee_id` | ObjectId | Outgoing employee. Reference to `employees._id`. |
| `to_employee_id` | ObjectId | Incoming employee. Must differ from `from_employee_id`. |
| `summary` | string | Required |
| `completed_work` | array of string | |
| `pending_work` | array of string | |
| `blockers` | array of string | |
| `known_issues` | array of string | |
| `next_steps` | array of string | |
| `useful_links` | array of `{label, url}` | `url` must start with `http://` or `https://` |
| `task_ids` | array of ObjectId | References to `tasks._id`. Each task must belong to `project_id`. |
| `status` | string | `Draft`, `Submitted`, `Acknowledged` |
| `created_at` | date | |
| `updated_at` | date | Added beyond the suggested shape, for draft edit tracking |
| `submitted_at` | date or null | |
| `acknowledged_at` | date or null | |

## Status lifecycle

Handovers:

```text
Draft ──submit──▶ Submitted ──acknowledge──▶ Acknowledged
```

- Editing is allowed only in `Draft` (409 otherwise).
- `submit` requires `Draft`. `acknowledge` requires `Submitted`.

Projects: `Archived` is set by `PATCH` or by `DELETE` on a project that has tasks or handovers. Tasks cannot be added to an archived project, and handovers cannot be created or edited for one (409).

## Embedding decisions

| Data | Decision | Reason |
|---|---|---|
| Progress notes | Embedded in `tasks` | Small, bounded, always read with their task. |
| Handover lists (work items, blockers, issues, next steps) | Embedded arrays of strings | Small, bounded, always read and written with the handover. |
| Useful links | Embedded array of objects | Small, bounded, always read with the handover. |
| Tasks | Separate collection | Queried independently (filters, overdue, dashboard) and updated independently. |
| Handovers | Separate collection | Queried independently (status, recipient) and updated through their own lifecycle. |
| Employee and project details | Referenced by ID only | Avoids duplicating mutable records that change over time. |

## Indexes

Created at application startup by `ensure_indexes` in `backend/app/database.py`.

| Collection | Index | Unique |
|---|---|---|
| `employees` | `email` | Yes |
| `projects` | `status` | No |
| `tasks` | `project_id` | No |
| `tasks` | `assigned_to` | No |
| `tasks` | `status` | No |
| `tasks` | `due_date` | No |
| `handovers` | `project_id` | No |
| `handovers` | `to_employee_id` | No |
| `handovers` | `status` | No |
| `handovers` | `created_at` (descending) | No |

The `created_at` index on `handovers` supports the dashboard's recent-handovers query. The task and project list queries sort by `created_at` without a dedicated index; with the 500-record cap this is acceptable for the mini-project scale.

## Aggregations

- Task counts per status: `$group` on `tasks.status`.
- Overdue tasks: `count_documents` on `due_date < start of today (UTC)` and `status != Completed`.
- Handovers awaiting acknowledgement: `count_documents` on `status = Submitted`.
- Recent projects and handovers: `find` sorted by `created_at` descending, limit 5.
