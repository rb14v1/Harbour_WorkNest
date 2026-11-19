# Project Handover & Task Tracking System

A small internal web application for managing projects and tasks, and for handing work over when an employee goes on leave, changes teams, or leaves a project.

> **Local/demo application.** No authentication or authorisation is implemented. Do not deploy this version to a shared or production environment.

> **Harbour deployment: not verified.** Harbour-specific configuration (`healthz.py`, Docker Compose, CI workflow) has not been added because the Harbour documentation was not available. The standard `GET /health` endpoint is implemented.

## Features

- **Dashboard:** project and task counts, task status breakdown, overdue tasks, handovers awaiting acknowledgement, recent projects and handovers. All values come from MongoDB aggregations.
- **Employees:** create, edit, activate/deactivate. Emails are validated and unique (case-insensitive).
- **Projects:** create, list, view, edit, archive. Projects with tasks or handovers are archived rather than deleted.
- **Tasks:** create, edit, delete, filter by project, assignee, status, priority and overdue. Progress notes with author and timestamp. Completion timestamp set and cleared automatically.
- **Handovers:** draft, edit while draft, submit, acknowledge. Submitted handovers are locked. Linked to a project and related tasks.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React (JavaScript), Vite, React Router, Axios, plain CSS |
| Backend | Python, FastAPI, Pydantic, pydantic-settings |
| Database | MongoDB with PyMongo (synchronous driver) |
| Tests | pytest, FastAPI TestClient |

## Repository structure

```text
project-handover/
├── backend/
│   ├── app/                 FastAPI application (config, database, models, schemas, routers, services)
│   ├── tests/               pytest suite (runs against a dedicated test database)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/                 React application (components, pages, services, styles)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── docs/
│   ├── API.md               Endpoint summaries and examples
│   └── DATA_MODEL.md        Collections, fields, indexes, embedding decisions
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.11 or later (developed on 3.14)
- Node.js 20 or later with npm
- MongoDB Community Server 7.x or later, or a MongoDB Atlas cluster

## MongoDB setup

### Option A: local MongoDB (Windows)

1. Install MongoDB Community Server from the official `.msi`, choosing **Complete** and keeping **Install MongoDB as a Service** ticked.
2. Confirm the service is running:
   ```powershell
   Get-Service MongoDB
   ```
3. The default connection string is `mongodb://localhost:27017`. No credentials are needed for a local install.

### Option B: MongoDB Atlas

1. Create a cluster and a database user in the Atlas console.
2. Copy the connection string from **Connect → Drivers**.
3. Replace the placeholder user and password with your own values. Keep real credentials out of version control and out of this README.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string. Use placeholders in examples. |
| `MONGODB_DATABASE` | Yes | Development database name. |
| `MONGODB_TEST_DATABASE` | No (default `project_handover_test`) | Dedicated test database. Must end in `_test` and differ from `MONGODB_DATABASE`. |
| `CORS_ORIGINS` | No (default `http://localhost:5173`) | Comma-separated frontend origins. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend base URL without a trailing slash, e.g. `http://localhost:8000`. |

Copy each `.env.example` to `.env` and adjust. `.env` files are gitignored.

## Running locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- Health check: `GET http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Running tests

Tests need a reachable MongoDB instance configured in `backend/.env`. They use only the test database and refuse to run if its name does not end in `_test` or matches the development database.

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

Frontend production build:

```powershell
cd frontend
npm run build
```

## Docker (not yet verified)

The root `docker-compose.yml` runs MongoDB, the backend and the frontend (nginx). It was written without Docker available, so the images have not been built or started. Verify before relying on it:

```powershell
cd c:\Users\admin\Downloads\project-handover
Copy-Item .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`, health at `/health`, Swagger at `/docs`

`healthz.py` at the root checks the backend health endpoint. Set `HEALTH_URL` to target a different host:

```powershell
python healthz.py
```

## API documentation

Interactive documentation is served by FastAPI at `/docs`. Endpoint summaries and example payloads are in [docs/API.md](docs/API.md).

## Input rules and limits

Rules are enforced in both the frontend (immediate feedback, live character counters) and the backend (`backend/app/schemas/__init__.py`). The frontend copy is in `frontend/src/services/validation.js`. Keep the two in sync.

| Field | Limit | Allowed characters |
|---|---|---|
| Person name | 2–100 | Letters only. Spaces, apostrophes, hyphens and full stops between words. |
| Department, job title | 2–100 | Letters, numbers, spaces and `& / ( ) , . - : '` |
| Email | up to 254 | Standard email format. Stored in lowercase. Unique. |
| Project name | 3–150 | Same as labels above |
| Project description | up to 2000 | Any text except `< >` and control characters |
| Task title | 3–150 | Same as labels above |
| Task description | up to 2000 | Any text except `< >` and control characters |
| Progress note | 1–1000 | Any text except `< >` and control characters |
| Handover summary | 1–2000 | Any text except `< >` and control characters |
| Handover list items (completed, pending, blockers, known issues, next steps) | up to 50 items, each 1–300 characters | Any text except `< >` and control characters |
| Useful link label | 2–60 | Same as labels above |
| Useful link URL | up to 2000 | Must start with `http://` or `https://`. No spaces. |
| Useful links per handover | up to 20 | |
| Related tasks per handover | up to 100 | Must belong to the handover's project |
| Team members per project | up to 50 | At least one member, excluding the team lead. The lead cannot also be a member. |

Letters are Unicode-aware, so names such as `Zoë Müller` are accepted.

## Known limitations

- No authentication. Any client that can reach the API can change any record.
- The list endpoints return at most 500 records each. There is no pagination.
- Deleting a task removes its ID from any handover that linked it.
- Deactivating an employee does not remove them from existing project teams or task assignments.
- Harbour deployment is not configured. Docker files and the GitHub Actions workflow are present but unverified (see Docker section and `infra/README.md`).
