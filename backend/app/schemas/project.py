from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.project import ProjectStatus
from app.models.task import Priority
from app.schemas import LIMITS, Description, ProjectName

TEAM_RULE_MESSAGE = "A project needs at least one team member besides the team lead"
LEAD_LISTED_MESSAGE = "The team lead cannot also be listed as a team member"


def check_team(lead_id: str, member_ids: list[str]) -> list[str]:
    unique = list(dict.fromkeys(member_ids))
    if lead_id in unique:
        raise ValueError(LEAD_LISTED_MESSAGE)
    if not unique:
        raise ValueError(TEAM_RULE_MESSAGE)
    return unique


class ProjectCreate(BaseModel):
    name: ProjectName
    description: Description = ""
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: Priority = Priority.MEDIUM
    start_date: date | None = None
    target_date: date | None = None
    team_lead_id: str
    team_member_ids: list[str] = Field(default_factory=list, max_length=LIMITS["team_members"])

    @model_validator(mode="after")
    def check_rules(self):
        if self.start_date and self.target_date and self.target_date < self.start_date:
            raise ValueError("target_date must be on or after start_date")
        self.team_member_ids = check_team(self.team_lead_id, self.team_member_ids)
        return self


class ProjectUpdate(BaseModel):
    name: ProjectName | None = None
    description: Description | None = None
    status: ProjectStatus | None = None
    priority: Priority | None = None
    start_date: date | None = None
    target_date: date | None = None
    team_lead_id: str | None = None
    team_member_ids: list[str] | None = Field(default=None, max_length=LIMITS["team_members"])

    @field_validator("team_member_ids")
    @classmethod
    def members_not_empty(cls, value: list[str] | None) -> list[str] | None:
        if value is not None and not value:
            raise ValueError(TEAM_RULE_MESSAGE)
        return value


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    status: str
    priority: str
    start_date: date | None
    target_date: date | None
    team_lead_id: str
    team_member_ids: list[str]
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    @field_validator("start_date", "target_date", mode="before")
    @classmethod
    def dates_only(cls, value):
        return value.date() if isinstance(value, datetime) else value
