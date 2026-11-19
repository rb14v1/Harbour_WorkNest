import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.database import ensure_indexes, get_db, get_client
from app.routers import dashboard, employees, handovers, projects, tasks

logger = logging.getLogger("project_handover")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_indexes(get_db())
    logger.info("Indexes verified")
    yield


app = FastAPI(
    title="Project Handover & Task Tracking API",
    version="0.1.0",
    description="Local/demo application. No authentication is implemented.",
    lifespan=lifespan,
)
app.router.redirect_slashes = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(handovers.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["health"])
def health():
    try:
        get_client().admin.command("ping")
    except PyMongoError:
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})
    return {"status": "ok", "database": "ok"}


@app.exception_handler(PyMongoError)
async def database_error_handler(request: Request, exc: PyMongoError):
    logger.error("Database error on %s %s: %s", request.method, request.url.path, type(exc).__name__)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
