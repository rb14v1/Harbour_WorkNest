from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pymongo.database import Database

from app.database import HANDOVERS, PROJECTS, TASKS, get_db
from app.models.handover import HandoverStatus
from app.models.project import ProjectStatus
from app.models.task import TaskStatus
from app.utils import start_of_today_utc
from app.utils.object_id import serialize_doc

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

RECENT_LIMIT = 5


class RecentProject(BaseModel):
    id: str
    name: str
    status: str
    created_at: datetime


class RecentHandover(BaseModel):
    id: str
    project_id: str
    status: str
    created_at: datetime


class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    task_counts: dict[str, int]
    overdue_tasks: int
    handovers_awaiting_acknowledgement: int
    recent_projects: list[RecentProject]
    recent_handovers: list[RecentHandover]


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Database = Depends(get_db)):
    task_counts = {status.value: 0 for status in TaskStatus}
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    for row in db[TASKS].aggregate(pipeline):
        task_counts[row["_id"]] = row["count"]

    recent_projects = db[PROJECTS].find(
        {}, {"name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(RECENT_LIMIT)
    recent_handovers = db[HANDOVERS].find(
        {}, {"project_id": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(RECENT_LIMIT)

    return {
        "total_projects": db[PROJECTS].count_documents({}),
        "active_projects": db[PROJECTS].count_documents({"status": ProjectStatus.ACTIVE.value}),
        "total_tasks": sum(task_counts.values()),
        "task_counts": task_counts,
        "overdue_tasks": db[TASKS].count_documents(
            {"due_date": {"$lt": start_of_today_utc()}, "status": {"$ne": TaskStatus.COMPLETED.value}}
        ),
        "handovers_awaiting_acknowledgement": db[HANDOVERS].count_documents(
            {"status": HandoverStatus.SUBMITTED.value}
        ),
        "recent_projects": [serialize_doc(doc) for doc in recent_projects],
        "recent_handovers": [serialize_doc(doc) for doc in recent_handovers],
    }
