from functools import lru_cache

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database

from app.config import get_settings

EMPLOYEES = "employees"
PROJECTS = "projects"
TASKS = "tasks"
HANDOVERS = "handovers"


@lru_cache
def get_client() -> MongoClient:
    return MongoClient(get_settings().mongodb_uri, tz_aware=True, serverSelectionTimeoutMS=5000)


def get_db() -> Database:
    return get_client()[get_settings().mongodb_database]


def ensure_indexes(db: Database) -> None:
    db[EMPLOYEES].create_index([("email", ASCENDING)], unique=True, name="uniq_email")
    db[PROJECTS].create_index([("status", ASCENDING)], name="status")
    db[TASKS].create_index([("project_id", ASCENDING)], name="project_id")
    db[TASKS].create_index([("assigned_to", ASCENDING)], name="assigned_to")
    db[TASKS].create_index([("status", ASCENDING)], name="status")
    db[TASKS].create_index([("due_date", ASCENDING)], name="due_date")
    db[HANDOVERS].create_index([("project_id", ASCENDING)], name="project_id")
    db[HANDOVERS].create_index([("to_employee_id", ASCENDING)], name="to_employee_id")
    db[HANDOVERS].create_index([("status", ASCENDING)], name="status")
    db[HANDOVERS].create_index([("created_at", DESCENDING)], name="created_at")


def require_document(db: Database, collection: str, oid: ObjectId, label: str) -> None:
    if db[collection].count_documents({"_id": oid}, limit=1) == 0:
        raise HTTPException(status_code=404, detail=f"{label} not found")
