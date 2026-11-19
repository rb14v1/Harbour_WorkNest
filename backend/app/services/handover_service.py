from bson import ObjectId
from fastapi import HTTPException
from pymongo.database import Database

from app.database import EMPLOYEES, HANDOVERS, PROJECTS, TASKS, require_document
from app.models.handover import HandoverStatus
from app.models.project import ProjectStatus
from app.utils import utc_now
from app.utils.object_id import parse_object_id


def validate_handover_refs(
    db: Database,
    project_id: ObjectId,
    from_employee_id: ObjectId,
    to_employee_id: ObjectId,
    task_ids: list[ObjectId],
) -> None:
    project = db[PROJECTS].find_one({"_id": project_id}, {"status": 1})
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["status"] == ProjectStatus.ARCHIVED.value:
        raise HTTPException(status_code=409, detail="Cannot create or edit handovers for an archived project")
    if from_employee_id == to_employee_id:
        raise HTTPException(status_code=400, detail="Outgoing and incoming employees must be different")
    require_document(db, EMPLOYEES, from_employee_id, "Outgoing employee")
    require_document(db, EMPLOYEES, to_employee_id, "Incoming employee")
    unique_task_ids = list(set(task_ids))
    if unique_task_ids:
        matching = db[TASKS].count_documents({"_id": {"$in": unique_task_ids}, "project_id": project_id})
        if matching != len(unique_task_ids):
            raise HTTPException(status_code=400, detail="One or more task IDs do not belong to this project")


def parse_task_ids(values: list[str]) -> list[ObjectId]:
    return [parse_object_id(value, "task ID") for value in values]


def transition_handover(
    db: Database,
    handover_id: ObjectId,
    expected_status: HandoverStatus,
    new_status: HandoverStatus,
    timestamp_field: str,
) -> None:
    now = utc_now()
    result = db[HANDOVERS].update_one(
        {"_id": handover_id, "status": expected_status.value},
        {"$set": {"status": new_status.value, timestamp_field: now, "updated_at": now}},
    )
    if result.matched_count == 0:
        if db[HANDOVERS].count_documents({"_id": handover_id}, limit=1) == 0:
            raise HTTPException(status_code=404, detail="Handover not found")
        raise HTTPException(
            status_code=409,
            detail=f"Handover must be {expected_status.value} to move to {new_status.value}",
        )
