from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database import EMPLOYEES, HANDOVERS, PROJECTS, TASKS, get_db, require_document
from app.models.project import ProjectStatus
from app.models.task import Priority, TaskStatus
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate
from app.utils import reject_null_fields, start_of_today_utc, utc_now
from app.utils.object_id import parse_object_id, serialize_doc, to_datetime

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


def _overdue_query() -> dict:
    return {"due_date": {"$lt": start_of_today_utc()}, "status": {"$ne": TaskStatus.COMPLETED.value}}


def _to_out(doc: dict) -> dict:
    out = serialize_doc(doc)
    due = doc.get("due_date")
    out["is_overdue"] = bool(
        due and due < start_of_today_utc() and doc["status"] != TaskStatus.COMPLETED.value
    )
    return out


def _ensure_project_open(db: Database, project_id: ObjectId) -> None:
    project = db[PROJECTS].find_one({"_id": project_id}, {"status": 1})
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["status"] == ProjectStatus.ARCHIVED.value:
        raise HTTPException(status_code=409, detail="Cannot add tasks to an archived project")


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: str | None = None,
    assigned_to: str | None = None,
    status: TaskStatus | None = None,
    priority: Priority | None = None,
    overdue: bool | None = None,
    db: Database = Depends(get_db),
):
    conditions: list[dict] = []
    if project_id:
        conditions.append({"project_id": parse_object_id(project_id, "project ID")})
    if assigned_to:
        conditions.append({"assigned_to": parse_object_id(assigned_to, "employee ID")})
    if status is not None:
        conditions.append({"status": status.value})
    if priority is not None:
        conditions.append({"priority": priority.value})
    if overdue:
        conditions.append(_overdue_query())
    query = {"$and": conditions} if conditions else {}
    docs = db[TASKS].find(query).sort("created_at", -1).limit(500)
    return [_to_out(doc) for doc in docs]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Database = Depends(get_db)):
    project_id = parse_object_id(payload.project_id, "project ID")
    _ensure_project_open(db, project_id)
    assignee = None
    if payload.assigned_to:
        assignee = parse_object_id(payload.assigned_to, "employee ID")
        require_document(db, EMPLOYEES, assignee, "Assigned employee")

    now = utc_now()
    is_completed = payload.status == TaskStatus.COMPLETED
    doc = {
        "project_id": project_id,
        "title": payload.title,
        "description": payload.description,
        "assigned_to": assignee,
        "status": payload.status.value,
        "priority": payload.priority.value,
        "due_date": to_datetime(payload.due_date),
        "progress_notes": [],
        "created_at": now,
        "updated_at": now,
        "completed_at": now if is_completed else None,
    }
    result = db[TASKS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(task_id, "task ID")
    doc = db[TASKS].find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_out(doc)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskUpdate, db: Database = Depends(get_db)):
    oid = parse_object_id(task_id, "task ID")
    current = db[TASKS].find_one({"_id": oid})
    if current is None:
        raise HTTPException(status_code=404, detail="Task not found")

    provided = payload.model_fields_set
    reject_null_fields(
        {key: getattr(payload, key) for key in provided},
        nullable=frozenset({"assigned_to", "due_date", "progress_note"}),
    )
    updates: dict = {}
    if "title" in provided:
        updates["title"] = payload.title
    if "description" in provided:
        updates["description"] = payload.description
    if "priority" in provided:
        updates["priority"] = payload.priority.value
    if "due_date" in provided:
        updates["due_date"] = to_datetime(payload.due_date)
    if "assigned_to" in provided:
        if payload.assigned_to:
            assignee = parse_object_id(payload.assigned_to, "employee ID")
            require_document(db, EMPLOYEES, assignee, "Assigned employee")
            updates["assigned_to"] = assignee
        else:
            updates["assigned_to"] = None

    now = utc_now()
    if "status" in provided:
        updates["status"] = payload.status.value
        if payload.status == TaskStatus.COMPLETED:
            if current.get("completed_at") is None:
                updates["completed_at"] = now
        else:
            updates["completed_at"] = None

    push = {}
    if payload.progress_note is not None:
        author = parse_object_id(payload.progress_note.author_id, "author ID")
        require_document(db, EMPLOYEES, author, "Author")
        push["progress_notes"] = {
            "author_id": author,
            "text": payload.progress_note.text,
            "timestamp": now,
        }

    if not updates and not push:
        return _to_out(current)

    updates["updated_at"] = now
    operation: dict = {"$set": updates}
    if push:
        operation["$push"] = push
    doc = db[TASKS].find_one_and_update({"_id": oid}, operation, return_document=True)
    return _to_out(doc)


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(task_id, "task ID")
    result = db[TASKS].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    db[HANDOVERS].update_many({"task_ids": oid}, {"$pull": {"task_ids": oid}})
    return {"id": task_id, "deleted": True}
