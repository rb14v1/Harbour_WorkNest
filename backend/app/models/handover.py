from datetime import datetime
from enum import Enum
from typing import TypedDict

from bson import ObjectId


class HandoverStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    ACKNOWLEDGED = "Acknowledged"


class UsefulLinkDocument(TypedDict):
    label: str
    url: str


class HandoverDocument(TypedDict):
    _id: ObjectId
    project_id: ObjectId
    from_employee_id: ObjectId
    to_employee_id: ObjectId
    summary: str
    completed_work: list[str]
    pending_work: list[str]
    blockers: list[str]
    known_issues: list[str]
    next_steps: list[str]
    useful_links: list[UsefulLinkDocument]
    task_ids: list[ObjectId]
    status: str
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    acknowledged_at: datetime | None
