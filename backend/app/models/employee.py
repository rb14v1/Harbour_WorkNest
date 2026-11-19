from typing import TypedDict

from bson import ObjectId
from datetime import datetime


class EmployeeDocument(TypedDict):
    _id: ObjectId
    name: str
    email: str
    department: str
    job_title: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
