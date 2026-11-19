# CLAUDE.md --- Project Handover & Task Tracking System

## 1. Project objective

Build a small, company-oriented **Project Handover & Task Tracking
System**.

The application helps teams manage projects and tasks, track progress,
and transfer responsibility when an employee goes on leave, changes
teams, or leaves a project.

A handover must clearly communicate: - What the project is about and its
current status. - What has been completed. - What work is pending or
blocked. - Who is taking over responsibility. - Important technical
notes, known issues, links, and next steps.

Keep the implementation practical for a 3--4 hour mini project.
Prioritise a complete, working end-to-end workflow over extra features.

## 2. Mandatory technology stack

-   Frontend: React with JavaScript (not TypeScript), using the existing
    frontend toolchain if present.
-   Backend: Python with FastAPI.
-   Database: MongoDB.
-   MongoDB driver: PyMongo (synchronous driver for a straightforward
    implementation).
-   Validation: Pydantic.
-   API documentation: FastAPI Swagger UI at `/docs`.
-   Frontend API calls: use the existing HTTP client if one is already
    configured; otherwise Axios.
-   Styling: use the existing styling approach. If none exists, use
    plain CSS with a clean, responsive business dashboard design.

Do not use PostgreSQL, SQLite, SQLAlchemy, Alembic, or relational
database migrations for this project.

## 3. Repository layout --- preserve the screenshot's top-level structure

The repository must retain this top-level layout:

``` text
project-handover/
├── .github/                  # Preserve existing workflows and repository config
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   └── object_id.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── handover.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── handover.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── employees.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── handovers.py
│   │   │   └── dashboard.py
│   │   └── services/
│   │       ├── __init__.py
│   │       └── handover_service.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_projects.py
│   │   ├── test_tasks.py
│   │   └── test_handovers.py
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   ├── API.md
│   └── DATA_MODEL.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── .env.example
├── infra/                    # Preserve existing Harbour/deployment files
├── .dockerignore
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml        # Preserve existing file; update only if required
└── healthz.py                # Preserve existing Harbour health-check contract
```

This is the target structure, not permission to replace the repository.
First inspect the actual files. Reuse existing files and conventions
where sensible. Do not delete or overwrite existing `.github/`,
`infra/`, `docker-compose.yml`, `healthz.py`, or repository
configuration. If an existing structure differs, explain the difference
and make the smallest compatible changes. Do not create empty or
unnecessary files just to match the tree.

## 4. Main users and workflow

Keep roles simple: - **Team Lead**: creates projects, creates and
assigns tasks, reviews handovers. - **Employee**: views assigned work,
updates task status, prepares a handover. - **Incoming Owner**: receives
the handover and reviews pending work.

For the mini-project, do not build a full authentication/authorization
system unless the repository already has one or the user explicitly asks
for it. Do not pretend a role selector is secure authentication. If
there is no authentication, clearly document that the app is a
local/demo application.

### Core workflow

1.  Create employees.
2.  Create a project and assign a team lead.
3.  Add tasks to the project, assign employees, set priority and due
    date.
4.  Employees update task status and add progress comments.
5.  An outgoing employee creates a handover for a project or a set of
    tasks.
6.  The handover records the outgoing employee, incoming employee,
    summary, completed work, pending work, blockers, known issues,
    useful links, and next steps.
7.  The incoming employee reviews and acknowledges the handover.
8.  The dashboard shows project progress, task counts, overdue work, and
    handovers awaiting acknowledgement.

## 5. Required features

### Dashboard

-   Total projects.
-   Active projects.
-   Total tasks.
-   Pending / In Progress / Completed / Blocked task counts.
-   Overdue tasks.
-   Handovers awaiting acknowledgement.
-   Recent projects and recent handovers.

Dashboard values must come from MongoDB queries/aggregation, not
hardcoded numbers.

### Employees

-   List employees.
-   Add an employee with name, email, department, and job title.
-   Edit employee details.
-   Mark employee active/inactive.
-   Validate email and prevent duplicate employee emails.

### Projects

-   Create, list, view, update, and archive projects.
-   Fields: project name, description, status, priority, start date,
    target date, team lead, and team member IDs.
-   Project status: `Planning`, `Active`, `On Hold`, `Completed`,
    `Archived`.
-   Project detail should show its tasks and handovers.

### Tasks

-   Create, list, view, update, and delete tasks.
-   Fields: project ID, title, description, assigned employee ID,
    status, priority, due date, created date, updated date, and optional
    progress notes.
-   Task status: `Pending`, `In Progress`, `Blocked`, `Completed`.
-   Priority: `Low`, `Medium`, `High`, `Critical`.
-   Support filtering by project, assignee, status, priority, and
    overdue.
-   Validate that referenced projects and employees exist.
-   A completed task should have a completion timestamp; clear it if
    reopened.

### Handovers

-   Create a handover linked to a project.
-   Record outgoing employee and incoming employee.
-   Include summary, completed work, pending work, blockers, known
    issues, next steps, useful document/URL links, and relevant task
    IDs.
-   Status: `Draft`, `Submitted`, `Acknowledged`.
-   Submitted handovers cannot be silently overwritten; allow edits only
    while Draft, unless a clearly documented rule is implemented.
-   Incoming employee can acknowledge a submitted handover, recording
    acknowledgement time.
-   Display handover history on the project page.
-   Validate that outgoing and incoming employees are different and that
    the project exists.

### UI

Create a clean, responsive company dashboard with: - Sidebar navigation:
Dashboard, Projects, Tasks, Handovers, Employees. - Top bar with
application name and simple page context. - Dashboard cards and readable
tables. - Search and useful filters. - Create/edit forms with
client-side validation and clear API error messages. - Loading, empty,
success, and error states. - Confirmation before destructive actions. -
Detail views or modals for projects, tasks, and handovers.

Do not add decorative charts that show fake data. If a chart is
included, it must use real API results.

## 6. MongoDB data design

Use separate collections for `employees`, `projects`, `tasks`, and
`handovers`.

Use MongoDB `ObjectId` identifiers. Convert ObjectIds to strings in API
responses. Keep database documents and API response schemas separate.

Suggested document shapes:

### employees

-   `_id`
-   `name`
-   `email` (unique index, normalised to lowercase)
-   `department`
-   `job_title`
-   `is_active`
-   `created_at`
-   `updated_at`

### projects

-   `_id`
-   `name`
-   `description`
-   `status`
-   `priority`
-   `start_date`
-   `target_date`
-   `team_lead_id` (ObjectId reference)
-   `team_member_ids` (array of ObjectId references)
-   `created_at`
-   `updated_at`
-   `archived_at` (optional)

### tasks

-   `_id`
-   `project_id` (ObjectId reference)
-   `title`
-   `description`
-   `assigned_to` (ObjectId reference, optional)
-   `status`
-   `priority`
-   `due_date`
-   `progress_notes` (array of small embedded note objects with author,
    text, timestamp)
-   `created_at`
-   `updated_at`
-   `completed_at` (optional)

### handovers

-   `_id`
-   `project_id` (ObjectId reference)
-   `from_employee_id` (ObjectId reference)
-   `to_employee_id` (ObjectId reference)
-   `summary`
-   `completed_work` (array of strings)
-   `pending_work` (array of strings)
-   `blockers` (array of strings)
-   `known_issues` (array of strings)
-   `next_steps` (array of strings)
-   `useful_links` (array of objects containing label and URL)
-   `task_ids` (array of ObjectId references)
-   `status`
-   `created_at`
-   `submitted_at` (optional)
-   `acknowledged_at` (optional)

Create indexes for common lookups: - `employees.email` unique. -
`projects.status`. - `tasks.project_id`, `tasks.assigned_to`,
`tasks.status`, and `tasks.due_date`. - `handovers.project_id`,
`handovers.to_employee_id`, and `handovers.status`.

Use embedded arrays for small, bounded information such as task progress
notes and handover checklist sections. Keep tasks and handovers in their
own collections because they are independently queried and updated.
Avoid duplicating large employee or project documents inside other
collections.

Use MongoDB aggregation pipelines for dashboard counts and project task
summaries where appropriate. Do not implement a relational ORM or SQL
migrations.

## 7. API conventions

Use a consistent prefix `/api/v1`.

Expected endpoints (adjust only if the existing repository has an
established convention): - `GET /health` --- application health. -
`GET /api/v1/dashboard/stats` - `GET /api/v1/employees` -
`POST /api/v1/employees` - `GET /api/v1/employees/{employee_id}` -
`PATCH /api/v1/employees/{employee_id}` - `GET /api/v1/projects` -
`POST /api/v1/projects` - `GET /api/v1/projects/{project_id}` -
`PATCH /api/v1/projects/{project_id}` -
`DELETE /api/v1/projects/{project_id}` --- archive rather than
hard-delete if it has tasks or handovers. - `GET /api/v1/tasks` -
`POST /api/v1/tasks` - `GET /api/v1/tasks/{task_id}` -
`PATCH /api/v1/tasks/{task_id}` - `DELETE /api/v1/tasks/{task_id}` -
`GET /api/v1/handovers` - `POST /api/v1/handovers` -
`GET /api/v1/handovers/{handover_id}` -
`PATCH /api/v1/handovers/{handover_id}` --- draft-only editing. -
`POST /api/v1/handovers/{handover_id}/submit` -
`POST /api/v1/handovers/{handover_id}/acknowledge`

API rules: - Define paths without trailing slashes. - Configure FastAPI
with `redirect_slashes=False`; trailing-slash variants should not
silently redirect. - Use appropriate HTTP status codes and consistent
error responses. - Validate ObjectId strings and return 400 for
malformed IDs, 404 for missing records, and 409 for duplicate emails or
conflicting state changes. - Do not expose MongoDB internal objects or
raw exception traces to clients. - Keep API URL configuration in
environment variables; do not hardcode localhost URLs throughout the
frontend.

## 8. Configuration and security

-   Read configuration from environment variables.
-   Backend `.env.example` must document all required variables with
    placeholders only:
    -   `MONGODB_URI`
    -   `MONGODB_DATABASE`
    -   `CORS_ORIGINS`
-   Frontend `.env.example` must document:
    -   `VITE_API_BASE_URL`
-   Root `.env.example` should document only variables actually consumed
    by existing Docker/Harbour configuration. Do not duplicate secrets
    unnecessarily.
-   Never commit real `.env` files, credentials, tokens, or private
    connection strings.
-   Ensure `.gitignore` excludes `.env`, `**/.env`, virtual
    environments, `node_modules`, build output, caches, and test
    artifacts.
-   Never print secrets in logs or reports.
-   Validate user input on both frontend and backend.
-   Configure CORS only for the required frontend origin(s), not `*`
    when credentials are enabled.
-   Do not introduce authentication claims unless real authentication is
    implemented.

## 9. Harbour, Docker, and repository integration

The screenshot shows `.github/`, `infra/`, `.dockerignore`,
`.env.example`, `.gitignore`, `docker-compose.yml`, and `healthz.py`.
Treat these as existing repository infrastructure: - Inspect their
contents before changing anything. - Preserve existing Harbour
deployment conventions, health-check expectations, CI workflows, and
environment variable names. - Do not replace existing Docker or Harbour
setup with a new pattern. - Update Docker configuration only if required
to run this app and only after understanding the existing
configuration. - Keep the backend and frontend compatible with the
existing deployment layout. - Ensure `healthz.py` and/or the FastAPI
health endpoint satisfy the actual health-check contract already present
in the repo. - Do not invent Harbour commands, configuration keys, or
deployment steps. If documentation/access is missing, record what
information is needed. - Do not add Kubernetes, Terraform, or other
infrastructure unless already present or explicitly requested.

## 10. Testing and quality checks

Backend tests should cover: - Employee creation and duplicate email
handling. - Project CRUD and invalid references. - Task creation,
assignment, filtering, status updates, and completion timestamp. -
Handover creation, validation, draft editing, submission, and
acknowledgement. - Dashboard counts. - Invalid ObjectIds and missing
records. - Trailing-slash behaviour.

Use a separate test database, never the development database. Tests must
not delete or reset a database unless its name is explicitly identified
as a test database and guarded in test setup. Prefer isolated test
collections or a dedicated test database configured via environment
variable.

Frontend checks: - Production build succeeds. - Main flows work: create
employee, create project, create task, update task, submit handover,
acknowledge handover. - Loading, empty, validation, and server-error
states are handled. - No console errors or failed API requests in the
normal flow. - Frontend requests use clean paths without double slashes
or trailing slashes.

Do not claim tests passed unless they were actually executed. Report
skipped checks clearly.

## 11. README and documentation

Create or update `README.md` with: - Project overview and features. -
Technology stack. - Repository structure. - Prerequisites and local
setup. - MongoDB local/Atlas configuration without real credentials. -
Environment variables. - Backend and frontend run commands. - Test
commands. - API documentation URL. - Docker/Harbour instructions only
when verified from the existing repository configuration.

Create `docs/DATA_MODEL.md` describing collections, fields, references,
indexes, and embedding decisions.

Create `docs/API.md` with endpoint summaries and example
request/response payloads.

## 12. Development workflow

Work in small stages. At the end of each stage, report files changed and
checks performed.

1.  **Inspect first:** list the repository tree, read existing README,
    `.gitignore`, `.env.example`, Docker files, `healthz.py`,
    `.github/`, and `infra/`. Identify Harbour-specific contracts and
    existing conventions. Do not edit in this stage.
2.  **Plan:** propose the smallest compatible implementation and
    identify any conflicts with the target structure. Do not guess
    missing Harbour requirements.
3.  **Backend:** implement MongoDB connection, models/schemas, indexes,
    routers, services, and tests.
4.  **Frontend:** implement the dashboard and required pages, connect to
    real APIs.
5.  **Integration:** run tests and build, verify the end-to-end workflow
    and route conventions.
6.  **Documentation:** complete README and docs based on actual
    implementation.
7.  **Final audit:** report exact files changed, commands executed, test
    results, unresolved items, and Harbour readiness.

Do not start implementation until the inspection and plan are complete.
Ask the user only when a missing decision blocks safe progress;
otherwise use the simplest reasonable implementation and document the
assumption.

## 13. Strict constraints

-   Do not run any Git commands or perform Git operations: no
    `git init`, `status`, `add`, `commit`, `push`, `pull`, branch
    changes, or Git configuration changes. The user handles Git
    manually.
-   Do not overwrite or delete existing repository files without first
    inspecting them and explaining why a change is needed.
-   Do not modify existing Harbour or CI/CD configuration unless
    required and understood.
-   Do not add unrelated features such as chat, timesheets, payroll,
    billing, AI summaries, or notifications through external services.
-   Do not use hardcoded demo data as if it were live data. If seed data
    is needed, make it optional and clearly labelled.
-   Do not add unnecessary dependencies.
-   Do not leave placeholder buttons or nonfunctional UI controls.
-   Do not claim deployment or Harbour testing succeeded unless actually
    tested.
-   Keep the implementation maintainable and appropriately scoped for a
    mini project.

## 14. Definition of done

The project is ready for handover when: - The backend connects to
MongoDB using environment configuration. - Employees, projects, tasks,
and handovers can be managed through the UI and API. - A complete
task-to-handover-to-acknowledgement workflow works. - Dashboard metrics
reflect actual database records. - Validation and error handling work. -
Backend tests pass against a dedicated test database. - Frontend
production build succeeds. - No accidental trailing-slash redirects or
malformed API URLs occur. - README and docs match the actual code. -
Existing repository/Harbour infrastructure is preserved. - No Git
operations have been performed.
