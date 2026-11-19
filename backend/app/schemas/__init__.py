from typing import Annotated

from pydantic import StringConstraints

# Person names: letters only, with spaces, apostrophes, hyphens and full stops between words.
PERSON_NAME_PATTERN = r"^[^\W\d_]+(?:[ .'\-]+[^\W\d_]+)*\.?$"

# Labels (departments, job titles, project and task names, link labels): letters, digits and
# & / ( ) , . - : ' and spaces. Must start with a letter or digit and end with a letter, digit or ")".
LABEL_PATTERN = r"^[^\W_](?:[^\W_]|[ &/(),.\-:'])*(?:[^\W_]|\))$"

# Free text: any printable text, but no angle brackets or control characters.
FREE_TEXT_PATTERN = r"^[^<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$"

# Limits. Mirrored in frontend/src/services/validation.js and shown on the forms.
LIMITS = {
    "person_name": 100,
    "label": 100,
    "project_name": 150,
    "task_title": 150,
    "link_label": 60,
    "description": 2000,
    "summary": 2000,
    "progress_note": 1000,
    "list_item": 300,
    "list_items": 50,
    "links": 20,
    "team_members": 50,
    "task_ids": 100,
    "url": 2000,
}

PersonName = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=2, max_length=LIMITS["person_name"], pattern=PERSON_NAME_PATTERN)]
Label = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=2, max_length=LIMITS["label"], pattern=LABEL_PATTERN)]
ProjectName = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=3, max_length=LIMITS["project_name"], pattern=LABEL_PATTERN)]
TaskTitle = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=3, max_length=LIMITS["task_title"], pattern=LABEL_PATTERN)]
LinkLabel = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=2, max_length=LIMITS["link_label"], pattern=LABEL_PATTERN)]
Description = Annotated[str, StringConstraints(
    strip_whitespace=True, max_length=LIMITS["description"], pattern=FREE_TEXT_PATTERN)]
Summary = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=1, max_length=LIMITS["summary"], pattern=FREE_TEXT_PATTERN)]
ProgressText = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=1, max_length=LIMITS["progress_note"], pattern=FREE_TEXT_PATTERN)]
ListItem = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=1, max_length=LIMITS["list_item"], pattern=FREE_TEXT_PATTERN)]
