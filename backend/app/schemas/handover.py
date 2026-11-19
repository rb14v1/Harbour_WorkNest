from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.handover import HandoverStatus
from app.schemas import LIMITS, LinkLabel, ListItem, Summary

URL_PATTERN = r"^https?://[^\s<>]+$"


class UsefulLink(BaseModel):
    label: LinkLabel
    url: str = Field(max_length=LIMITS["url"], pattern=URL_PATTERN)

    @field_validator("url")
    @classmethod
    def strip_url(cls, value: str) -> str:
        return value.strip()


ItemList = list[ListItem]


class HandoverCreate(BaseModel):
    project_id: str
    from_employee_id: str
    to_employee_id: str
    summary: Summary
    completed_work: ItemList = Field(default_factory=list, max_length=LIMITS["list_items"])
    pending_work: ItemList = Field(default_factory=list, max_length=LIMITS["list_items"])
    blockers: ItemList = Field(default_factory=list, max_length=LIMITS["list_items"])
    known_issues: ItemList = Field(default_factory=list, max_length=LIMITS["list_items"])
    next_steps: ItemList = Field(default_factory=list, max_length=LIMITS["list_items"])
    useful_links: list[UsefulLink] = Field(default_factory=list, max_length=LIMITS["links"])
    task_ids: list[str] = Field(default_factory=list, max_length=LIMITS["task_ids"])


class HandoverUpdate(BaseModel):
    project_id: str | None = None
    from_employee_id: str | None = None
    to_employee_id: str | None = None
    summary: Summary | None = None
    completed_work: ItemList | None = Field(default=None, max_length=LIMITS["list_items"])
    pending_work: ItemList | None = Field(default=None, max_length=LIMITS["list_items"])
    blockers: ItemList | None = Field(default=None, max_length=LIMITS["list_items"])
    known_issues: ItemList | None = Field(default=None, max_length=LIMITS["list_items"])
    next_steps: ItemList | None = Field(default=None, max_length=LIMITS["list_items"])
    useful_links: list[UsefulLink] | None = Field(default=None, max_length=LIMITS["links"])
    task_ids: list[str] | None = Field(default=None, max_length=LIMITS["task_ids"])


class HandoverOut(BaseModel):
    id: str
    project_id: str
    from_employee_id: str
    to_employee_id: str
    summary: str
    completed_work: list[str]
    pending_work: list[str]
    blockers: list[str]
    known_issues: list[str]
    next_steps: list[str]
    useful_links: list[UsefulLink]
    task_ids: list[str]
    status: HandoverStatus
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    acknowledged_at: datetime | None
