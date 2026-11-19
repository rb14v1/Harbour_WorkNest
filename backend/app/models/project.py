from datetime import datetime
from enum import Enum
from typing import TypedDict

from bson import ObjectId


class ProjectStatus(str, Enum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    ON_HOLD = "On Hold"
    COMPLETED = "Completed"
    ARCHIVED = "Archived"


class ProjectDocument(TypedDict):
    _id: ObjectId
    name: str
    description: str
    status: str
    priority: str
    start_date: datetime | None
    target_date: datetime | None
    team_lead_id: ObjectId
    team_member_ids: list[ObjectId]
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
