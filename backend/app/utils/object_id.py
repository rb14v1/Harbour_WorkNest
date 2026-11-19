from datetime import date, datetime, time, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException


def parse_object_id(value: str, label: str = "ID") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")
    return ObjectId(value)


def to_datetime(value: date | None) -> datetime | None:
    if value is None:
        return None
    return datetime.combine(value, time(), tzinfo=timezone.utc)


def serialize_doc(doc: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item
                for item in value
            ]
        else:
            result[key] = value
    return result
