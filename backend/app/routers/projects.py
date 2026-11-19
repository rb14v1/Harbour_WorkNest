import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.database import EMPLOYEES, HANDOVERS, PROJECTS, TASKS, get_db, require_document
from app.models.project import ProjectStatus
from app.schemas.project import LEAD_LISTED_MESSAGE, TEAM_RULE_MESSAGE, ProjectCreate, ProjectOut, ProjectUpdate
from app.utils import reject_null_fields, utc_now
from app.utils.object_id import parse_object_id, serialize_doc, to_datetime

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(
    q: str | None = Query(default=None, max_length=100),
    status: ProjectStatus | None = None,
    db: Database = Depends(get_db),
):
    query: dict = {}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if status is not None:
        query["status"] = status.value
    docs = db[PROJECTS].find(query).sort("created_at", -1).limit(500)
    return [serialize_doc(doc) for doc in docs]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Database = Depends(get_db)):
    lead_id = parse_object_id(payload.team_lead_id, "team lead ID")
    require_document(db, EMPLOYEES, lead_id, "Team lead")
    member_ids = [parse_object_id(value, "team member ID") for value in payload.team_member_ids]
    for member_id in set(member_ids):
        require_document(db, EMPLOYEES, member_id, "Team member")

    now = utc_now()
    is_archived = payload.status == ProjectStatus.ARCHIVED
    doc = {
        "name": payload.name,
        "description": payload.description,
        "status": payload.status.value,
        "priority": payload.priority.value,
        "start_date": to_datetime(payload.start_date),
        "target_date": to_datetime(payload.target_date),
        "team_lead_id": lead_id,
        "team_member_ids": list(dict.fromkeys(member_ids)),
        "created_at": now,
        "updated_at": now,
        "archived_at": now if is_archived else None,
    }
    result = db[PROJECTS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(project_id, "project ID")
    doc = db[PROJECTS].find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize_doc(doc)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, db: Database = Depends(get_db)):
    oid = parse_object_id(project_id, "project ID")
    current = db[PROJECTS].find_one({"_id": oid})
    if current is None:
        raise HTTPException(status_code=404, detail="Project not found")

    raw = payload.model_dump(exclude_unset=True)
    reject_null_fields(raw, nullable=frozenset({"start_date", "target_date"}))
    updates: dict = {}
    for key, value in raw.items():
        if key in ("start_date", "target_date"):
            updates[key] = to_datetime(value)
        elif key == "status":
            updates["status"] = value.value
        elif key == "priority":
            updates["priority"] = value.value
        elif key == "team_lead_id":
            lead_id = parse_object_id(value, "team lead ID")
            require_document(db, EMPLOYEES, lead_id, "Team lead")
            updates["team_lead_id"] = lead_id
        elif key == "team_member_ids":
            member_ids = [parse_object_id(v, "team member ID") for v in value]
            for member_id in set(member_ids):
                require_document(db, EMPLOYEES, member_id, "Team member")
            updates["team_member_ids"] = list(dict.fromkeys(member_ids))
        else:
            updates[key] = value

    start = updates.get("start_date", current.get("start_date"))
    target = updates.get("target_date", current.get("target_date"))
    if start and target and target < start:
        raise HTTPException(status_code=400, detail="target_date must be on or after start_date")

    lead = updates.get("team_lead_id", current["team_lead_id"])
    members = updates.get("team_member_ids", current.get("team_member_ids", []))
    if lead in members:
        raise HTTPException(status_code=400, detail=LEAD_LISTED_MESSAGE)
    if not members:
        raise HTTPException(status_code=400, detail=TEAM_RULE_MESSAGE)

    if "status" in updates:
        now_archived = updates["status"] == ProjectStatus.ARCHIVED.value
        updates["archived_at"] = utc_now() if now_archived else None

    if updates:
        updates["updated_at"] = utc_now()
        doc = db[PROJECTS].find_one_and_update({"_id": oid}, {"$set": updates}, return_document=True)
    else:
        doc = current
    return serialize_doc(doc)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(project_id, "project ID")
    if db[PROJECTS].count_documents({"_id": oid}, limit=1) == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    has_children = (
        db[TASKS].count_documents({"project_id": oid}, limit=1) > 0
        or db[HANDOVERS].count_documents({"project_id": oid}, limit=1) > 0
    )
    if has_children:
        now = utc_now()
        db[PROJECTS].update_one(
            {"_id": oid},
            {"$set": {"status": ProjectStatus.ARCHIVED.value, "archived_at": now, "updated_at": now}},
        )
        return {"id": project_id, "action": "archived"}

    db[PROJECTS].delete_one({"_id": oid})
    return {"id": project_id, "action": "deleted"}
