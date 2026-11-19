from datetime import datetime, timezone

from fastapi import HTTPException


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def reject_null_fields(values: dict, nullable: frozenset[str] = frozenset()) -> None:
    for key, value in values.items():
        if value is None and key not in nullable:
            raise HTTPException(status_code=400, detail=f"{key} cannot be null")


def start_of_today_utc() -> datetime:
    now = utc_now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)
