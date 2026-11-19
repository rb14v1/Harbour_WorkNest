from datetime import date, timedelta

MISSING_ID = "64b000000000000000000000"


def test_create_task_with_assignee_and_defaults(client, make_employee, make_project, make_task):
    project = make_project()
    assignee = make_employee()
    task = make_task(project["id"], assigned_to=assignee["id"], priority="Critical", due_date="2026-12-01")
    assert task["status"] == "Pending"
    assert task["priority"] == "Critical"
    assert task["assigned_to"] == assignee["id"]
    assert task["due_date"] == "2026-12-01"
    assert task["completed_at"] is None
    assert task["progress_notes"] == []


def test_create_task_with_unknown_project_returns_404(client):
    response = client.post("/api/v1/tasks", json={"project_id": MISSING_ID, "title": "Orphan"})
    assert response.status_code == 404


def test_create_task_with_unknown_assignee_returns_404(client, make_project):
    project = make_project()
    response = client.post(
        "/api/v1/tasks", json={"project_id": project["id"], "title": "Unknown assignee", "assigned_to": MISSING_ID}
    )
    assert response.status_code == 404


def test_create_task_with_invalid_project_id_returns_400(client):
    response = client.post("/api/v1/tasks", json={"project_id": "bad", "title": "Bad project id"})
    assert response.status_code == 400


def test_completion_sets_and_reopen_clears_completed_at(client, make_project, make_task):
    project = make_project()
    task = make_task(project["id"])
    done = client.patch(f"/api/v1/tasks/{task['id']}", json={"status": "Completed"}).json()
    assert done["status"] == "Completed"
    assert done["completed_at"] is not None

    reopened = client.patch(f"/api/v1/tasks/{task['id']}", json={"status": "In Progress"}).json()
    assert reopened["completed_at"] is None


def test_filter_by_project_status_priority_and_assignee(client, make_employee, make_project, make_task):
    project = make_project()
    other = make_project(name="Other project")
    assignee = make_employee()
    make_task(project["id"], title="Alpha task", status="Blocked", priority="High", assigned_to=assignee["id"])
    make_task(project["id"], title="Bravo task", status="Pending", priority="Low")
    make_task(other["id"], title="Charlie task", status="Blocked", priority="High")

    by_project = client.get("/api/v1/tasks", params={"project_id": project["id"]}).json()
    assert {t["title"] for t in by_project} == {"Alpha task", "Bravo task"}

    blocked_high = client.get("/api/v1/tasks", params={"status": "Blocked", "priority": "High"}).json()
    assert {t["title"] for t in blocked_high} == {"Alpha task", "Charlie task"}

    by_assignee = client.get("/api/v1/tasks", params={"assigned_to": assignee["id"]}).json()
    assert [t["title"] for t in by_assignee] == ["Alpha task"]


def test_overdue_filter_and_flag(client, make_project, make_task):
    project = make_project()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    overdue = make_task(project["id"], title="Late", due_date=yesterday)
    make_task(project["id"], title="Future", due_date="2999-01-01")
    finished_late = make_task(project["id"], title="Finished", due_date=yesterday, status="Completed")

    assert overdue["is_overdue"] is True
    assert finished_late["is_overdue"] is False

    listed = client.get("/api/v1/tasks", params={"overdue": True}).json()
    assert [t["title"] for t in listed] == ["Late"]


def test_progress_note_is_appended_with_author(client, make_employee, make_project, make_task):
    project = make_project()
    author = make_employee()
    task = make_task(project["id"])
    response = client.patch(
        f"/api/v1/tasks/{task['id']}",
        json={"progress_note": {"author_id": author["id"], "text": "Halfway through the API."}},
    )
    assert response.status_code == 200
    notes = response.json()["progress_notes"]
    assert len(notes) == 1
    assert notes[0]["author_id"] == author["id"]
    assert notes[0]["text"] == "Halfway through the API."
    assert notes[0]["timestamp"]


def test_task_cannot_be_added_to_archived_project(client, make_project):
    project = make_project()
    client.patch(f"/api/v1/projects/{project['id']}", json={"status": "Archived"})
    response = client.post("/api/v1/tasks", json={"project_id": project["id"], "title": "Too late"})
    assert response.status_code == 409


def test_delete_task_removes_it_and_unlinks_from_handovers(client, make_employee, make_project, make_task, make_handover):
    project = make_project()
    task = make_task(project["id"])
    handover = make_handover(
        project["id"],
        make_employee()["id"],
        make_employee()["id"],
        task_ids=[task["id"]],
    )
    assert client.delete(f"/api/v1/tasks/{task['id']}").status_code == 200
    assert client.get(f"/api/v1/tasks/{task['id']}").status_code == 404
    assert client.get(f"/api/v1/handovers/{handover['id']}").json()["task_ids"] == []


def test_null_title_rejected(client, make_project, make_task):
    task = make_task(make_project()["id"])
    assert client.patch(f"/api/v1/tasks/{task['id']}", json={"title": None}).status_code == 400
