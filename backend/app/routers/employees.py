import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError
from pymongo.database import Database

from app.database import EMPLOYEES, get_db
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.utils import reject_null_fields, utc_now
from app.utils.object_id import parse_object_id, serialize_doc

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])

DUPLICATE_EMAIL = "An employee with this email already exists"


@router.get("", response_model=list[EmployeeOut])
def list_employees(
    q: str | None = Query(default=None, max_length=100),
    is_active: bool | None = None,
    db: Database = Depends(get_db),
):
    query: dict = {}
    if q:
        pattern = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": pattern}, {"email": pattern}]
    if is_active is not None:
        query["is_active"] = is_active
    docs = db[EMPLOYEES].find(query).sort("name", 1).limit(500)
    return [serialize_doc(doc) for doc in docs]


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(payload: EmployeeCreate, db: Database = Depends(get_db)):
    now = utc_now()
    doc = {**payload.model_dump(), "created_at": now, "updated_at": now}
    try:
        result = db[EMPLOYEES].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail=DUPLICATE_EMAIL)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: str, db: Database = Depends(get_db)):
    oid = parse_object_id(employee_id, "employee ID")
    doc = db[EMPLOYEES].find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return serialize_doc(doc)


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: str, payload: EmployeeUpdate, db: Database = Depends(get_db)):
    oid = parse_object_id(employee_id, "employee ID")
    updates = payload.model_dump(exclude_unset=True)
    reject_null_fields(updates)
    if not updates:
        doc = db[EMPLOYEES].find_one({"_id": oid})
    else:
        updates["updated_at"] = utc_now()
        try:
            doc = db[EMPLOYEES].find_one_and_update(
                {"_id": oid}, {"$set": updates}, return_document=True
            )
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail=DUPLICATE_EMAIL)
    if doc is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return serialize_doc(doc)
