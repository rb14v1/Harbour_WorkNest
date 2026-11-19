from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database import HANDOVERS, get_db
from app.models.handover import HandoverStatus
from app.schemas.handover import HandoverCreate, HandoverOut, HandoverUpdate
from app.services.handover_service import (
    parse_task_ids,
    transition_handover,
    validate_handover_refs,
)
from app.utils import reject_null_fields, utc_now
from app.utils.object_id import parse_object_id, serialize_doc

router = APIRouter(prefix="/api/v1/handovers", tags=["handovers"])

SUMMARY_FIELDS = ("completed_work", "pending_work", "blockers", "known_issues", "next_steps")


@router.get("", response_model=list[HandoverOut])
def list_handovers(
    project_id: str | None = None,
    status: HandoverStatus | None = None,
    to_employee_id: str | None = None,
    from_employee_id: str | None = None,
    db: Database = Depends(get_db),
):
    query: dict = {}
    if project_id:
        query["project_id"] = parse_object_id(project_id, "project ID")
    if status is not None:
        query["status"] = status.value
    if to_employee_id:
        query["to_employee_id"] = parse_object_id(to_employee_id, "employee ID")
    if from_employee_id:
        query["from_employee_id"] = parse_object_id(from_employee_id, "employee ID")
    docs = db[HANDOVERS].find(query).sort("created_at", -1).limit(500)
    return [serialize_doc(doc) for doc in docs]


@router.post("", response_model=HandoverOut, status_code=201)
def create_handover(payload: HandoverCreate, db: Database = Depends(get_db)):
    project_id = parse_object_id(payload.project_id, "project ID")
    from_id = parse_object_id(payload.from_employee_id, "outgoing employee ID")
    to_id = parse_object_id(payload.to_employee_id, "incoming employee ID")
    task_ids = parse_task_ids(payload.task_ids)
    validate_handover_refs(db, project_id, from_id, to_id, task_ids)

    now = utc_now()
    doc = {
        "project_id": project_id,
        "from_employee_id": from_id,
        "to_employee_id": to_id,
        "summary": payload.summary,
        **{field: getattr(payload, field) for field in SUMMARY_FIELDS},
        "useful_links": [link.model_dump() for link in payload.useful_links],
        "task_ids": list(dict.fromkeys(task_ids)),
        "status": HandoverStatus.DRAFT.value,
        "created_at": now,
        "updated_at": now,
        "submitted_at": None,
        "acknowledged_at": None,
    }
    result = db[HANDOVERS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/{handover_id}", response_model=HandoverOut)
def get_handover(handover_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(handover_id, "handover ID")
    doc = db[HANDOVERS].find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    return serialize_doc(doc)


@router.patch("/{handover_id}", response_model=HandoverOut)
def update_handover(handover_id: str, payload: HandoverUpdate, db: Database = Depends(get_db)):
    oid = parse_object_id(handover_id, "handover ID")
    current = db[HANDOVERS].find_one({"_id": oid})
    if current is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    if current["status"] != HandoverStatus.DRAFT.value:
        raise HTTPException(status_code=409, detail="Only draft handovers can be edited")

    raw = payload.model_dump(exclude_unset=True)
    reject_null_fields(raw)
    updates: dict = {}
    for key, value in raw.items():
        if key in ("project_id", "from_employee_id", "to_employee_id"):
            updates[key] = parse_object_id(value, key)
        elif key == "task_ids":
            updates[key] = list(dict.fromkeys(parse_task_ids(value)))
        elif key == "useful_links":
            updates[key] = [link.model_dump() for link in payload.useful_links]
        else:
            updates[key] = value

    merged_refs = {
        "project_id": updates.get("project_id", current["project_id"]),
        "from_employee_id": updates.get("from_employee_id", current["from_employee_id"]),
        "to_employee_id": updates.get("to_employee_id", current["to_employee_id"]),
        "task_ids": updates.get("task_ids", current.get("task_ids", [])),
    }
    validate_handover_refs(
        db,
        merged_refs["project_id"],
        merged_refs["from_employee_id"],
        merged_refs["to_employee_id"],
        merged_refs["task_ids"],
    )

    if updates:
        updates["updated_at"] = utc_now()
        doc = db[HANDOVERS].find_one_and_update({"_id": oid}, {"$set": updates}, return_document=True)
    else:
        doc = current
    return serialize_doc(doc)


@router.post("/{handover_id}/submit", response_model=HandoverOut)
def submit_handover(handover_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(handover_id, "handover ID")
    transition_handover(db, oid, HandoverStatus.DRAFT, HandoverStatus.SUBMITTED, "submitted_at")
    return serialize_doc(db[HANDOVERS].find_one({"_id": oid}))


@router.post("/{handover_id}/acknowledge", response_model=HandoverOut)
def acknowledge_handover(handover_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(handover_id, "handover ID")
    transition_handover(db, oid, HandoverStatus.SUBMITTED, HandoverStatus.ACKNOWLEDGED, "acknowledged_at")
    return serialize_doc(db[HANDOVERS].find_one({"_id": oid}))
