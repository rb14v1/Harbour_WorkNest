from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.models.task import Priority, TaskStatus
from app.schemas import Description, ProgressText, TaskTitle


class ProgressNoteIn(BaseModel):
    author_id: str
    text: ProgressText


class ProgressNoteOut(BaseModel):
    author_id: str
    text: str
    timestamp: datetime


class TaskCreate(BaseModel):
    project_id: str
    title: TaskTitle
    description: Description = ""
    assigned_to: str | None = None
    status: TaskStatus = TaskStatus.PENDING
    priority: Priority = Priority.MEDIUM
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: TaskTitle | None = None
    description: Description | None = None
    assigned_to: str | None = None
    status: TaskStatus | None = None
    priority: Priority | None = None
    due_date: date | None = None
    progress_note: ProgressNoteIn | None = None


class TaskOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    assigned_to: str | None
    status: str
    priority: str
    due_date: date | None
    progress_notes: list[ProgressNoteOut]
    is_overdue: bool
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    @field_validator("due_date", mode="before")
    @classmethod
    def dates_only(cls, value):
        return value.date() if isinstance(value, datetime) else value
