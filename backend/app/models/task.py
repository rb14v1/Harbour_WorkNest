from datetime import datetime
from enum import Enum
from typing import TypedDict

from bson import ObjectId


class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    COMPLETED = "Completed"


class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ProgressNoteDocument(TypedDict):
    author_id: ObjectId
    text: str
    timestamp: datetime


class TaskDocument(TypedDict):
    _id: ObjectId
    project_id: ObjectId
    title: str
    description: str
    assigned_to: ObjectId | None
    status: str
    priority: str
    due_date: datetime | None
    progress_notes: list[ProgressNoteDocument]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
