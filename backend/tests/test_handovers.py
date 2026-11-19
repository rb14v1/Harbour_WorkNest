MISSING_ID = "64b000000000000000000000"


def _setup(make_employee, make_project, make_task):
    project = make_project()
    outgoing = make_employee()
    incoming = make_employee()
    task = make_task(project["id"], title="Integration API")
    return project, outgoing, incoming, task


def test_create_draft_handover_with_links_and_tasks(client, make_employee, make_project, make_task, make_handover):
    project, outgoing, incoming, task = _setup(make_employee, make_project, make_task)
    handover = make_handover(
        project["id"],
        outgoing["id"],
        incoming["id"],
        summary="Billing API handover",
        completed_work=["Schema done"],
        pending_work=["Webhook retries"],
        blockers=["Waiting on vendor keys"],
        known_issues=["Timeout on large invoices"],
        next_steps=["Review retry policy"],
        useful_links=[{"label": "Repo", "url": "https://example.com/repo"}],
        task_ids=[task["id"]],
    )
    assert handover["status"] == "Draft"
    assert handover["submitted_at"] is None
    assert handover["acknowledged_at"] is None
    assert handover["useful_links"] == [{"label": "Repo", "url": "https://example.com/repo"}]
    assert handover["task_ids"] == [task["id"]]


def test_same_outgoing_and_incoming_rejected(client, make_employee, make_project, make_task):
    project, outgoing, _, _ = _setup(make_employee, make_project, make_task)
    response = client.post(
        "/api/v1/handovers",
        json={
            "project_id": project["id"],
            "from_employee_id": outgoing["id"],
            "to_employee_id": outgoing["id"],
            "summary": "Self handover",
        },
    )
    assert response.status_code == 400


def test_unknown_project_returns_404(client, make_employee):
    a, b = make_employee(), make_employee()
    response = client.post(
        "/api/v1/handovers",
        json={"project_id": MISSING_ID, "from_employee_id": a["id"], "to_employee_id": b["id"], "summary": "x"},
    )
    assert response.status_code == 404


def test_task_from_another_project_rejected(client, make_employee, make_project, make_task, make_handover):
    project, outgoing, incoming, _ = _setup(make_employee, make_project, make_task)
    other_project = make_project(name="Other")
    foreign_task = make_task(other_project["id"], title="Foreign")
    response = client.post(
        "/api/v1/handovers",
        json={
            "project_id": project["id"],
            "from_employee_id": outgoing["id"],
            "to_employee_id": incoming["id"],
            "summary": "x",
            "task_ids": [foreign_task["id"]],
        },
    )
    assert response.status_code == 400


def test_invalid_link_url_rejected(client, make_employee, make_project, make_task):
    project, outgoing, incoming, _ = _setup(make_employee, make_project, make_task)
    response = client.post(
        "/api/v1/handovers",
        json={
            "project_id": project["id"],
            "from_employee_id": outgoing["id"],
            "to_employee_id": incoming["id"],
            "summary": "x",
            "useful_links": [{"label": "Bad", "url": "javascript:alert(1)"}],
        },
    )
    assert response.status_code == 422


def test_draft_edit_then_submit_locks_editing(client, make_employee, make_project, make_task, make_handover):
    project, outgoing, incoming, _ = _setup(make_employee, make_project, make_task)
    handover = make_handover(project["id"], outgoing["id"], incoming["id"])
    hid = handover["id"]

    edited = client.patch(f"/api/v1/handovers/{hid}", json={"summary": "Updated summary"})
    assert edited.status_code == 200
    assert edited.json()["summary"] == "Updated summary"

    submitted = client.post(f"/api/v1/handovers/{hid}/submit")
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "Submitted"
    assert submitted.json()["submitted_at"] is not None

    blocked_edit = client.patch(f"/api/v1/handovers/{hid}", json={"summary": "Sneaky change"})
    assert blocked_edit.status_code == 409
    assert client.post(f"/api/v1/handovers/{hid}/submit").status_code == 409


def test_acknowledge_requires_submitted_state(client, make_employee, make_project, make_task, make_handover):
    project, outgoing, incoming, _ = _setup(make_employee, make_project, make_task)
    hid = make_handover(project["id"], outgoing["id"], incoming["id"])["id"]

    assert client.post(f"/api/v1/handovers/{hid}/acknowledge").status_code == 409

    client.post(f"/api/v1/handovers/{hid}/submit")
    acknowledged = client.post(f"/api/v1/handovers/{hid}/acknowledge")
    assert acknowledged.status_code == 200
    assert acknowledged.json()["status"] == "Acknowledged"
    assert acknowledged.json()["acknowledged_at"] is not None

    assert client.post(f"/api/v1/handovers/{hid}/acknowledge").status_code == 409


def test_list_handovers_by_project_and_recipient(client, make_employee, make_project, make_task, make_handover):
    project, outgoing, incoming, _ = _setup(make_employee, make_project, make_task)
    make_handover(project["id"], outgoing["id"], incoming["id"])
    listed = client.get("/api/v1/handovers", params={"project_id": project["id"]}).json()
    assert len(listed) == 1
    to_incoming = client.get("/api/v1/handovers", params={"to_employee_id": incoming["id"]}).json()
    assert len(to_incoming) == 1
    assert client.get("/api/v1/handovers", params={"to_employee_id": outgoing["id"]}).json() == []


def test_invalid_handover_id_returns_400(client):
    assert client.get("/api/v1/handovers/xyz").status_code == 400
    assert client.post("/api/v1/handovers/xyz/submit").status_code == 400
