import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas import Label, PersonName

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalise_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address")
    return email


class EmployeeCreate(BaseModel):
    name: PersonName
    email: str = Field(max_length=254)
    department: Label
    job_title: Label
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str) -> str:
        return normalise_email(value)


class EmployeeUpdate(BaseModel):
    name: PersonName | None = None
    email: str | None = Field(default=None, max_length=254)
    department: Label | None = None
    job_title: Label | None = None
    is_active: bool | None = None

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        return None if value is None else normalise_email(value)


class EmployeeOut(BaseModel):
    id: str
    name: str
    email: str
    department: str
    job_title: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
