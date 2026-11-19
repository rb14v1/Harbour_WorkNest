from datetime import date, timedelta


def test_health_endpoint_reports_database(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_empty_dashboard_has_zero_counts(client):
    body = client.get("/api/v1/dashboard/stats").json()
    assert body["total_projects"] == 0
    assert body["total_tasks"] == 0
    assert body["overdue_tasks"] == 0
    assert body["handovers_awaiting_acknowledgement"] == 0
    assert body["task_counts"] == {"Pending": 0, "In Progress": 0, "Blocked": 0, "Completed": 0}
    assert body["recent_projects"] == []
    assert body["recent_handovers"] == []


def test_dashboard_counts_reflect_database_records(client, make_employee, make_project, make_task, make_handover):
    project = make_project(name="Active one", status="Active")
    make_project(name="Planning one", status="Planning")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    make_task(project["id"], title="Pending task", status="Pending")
    make_task(project["id"], title="Active task", status="In Progress", due_date=yesterday)
    make_task(project["id"], title="Blocked task", status="Blocked")
    make_task(project["id"], title="Completed task", status="Completed", due_date=yesterday)

    outgoing, incoming = make_employee(), make_employee()
    handover = make_handover(project["id"], outgoing["id"], incoming["id"])
    client.post(f"/api/v1/handovers/{handover['id']}/submit")

    body = client.get("/api/v1/dashboard/stats").json()
    assert body["total_projects"] == 2
    assert body["active_projects"] == 1
    assert body["total_tasks"] == 4
    assert body["task_counts"] == {"Pending": 1, "In Progress": 1, "Blocked": 1, "Completed": 1}
    assert body["overdue_tasks"] == 1
    assert body["handovers_awaiting_acknowledgement"] == 1
    assert len(body["recent_projects"]) == 2
    assert body["recent_handovers"][0]["status"] == "Submitted"
