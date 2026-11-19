MISSING_ID = "64b000000000000000000000"


def test_create_project_with_team(client, make_employee):
    lead = make_employee()
    member = make_employee()
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "Billing Service",
            "description": "Rebuild invoicing",
            "status": "Active",
            "priority": "High",
            "start_date": "2026-01-05",
            "target_date": "2026-06-30",
            "team_lead_id": lead["id"],
            "team_member_ids": [member["id"]],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["team_lead_id"] == lead["id"]
    assert body["team_member_ids"] == [member["id"]]
    assert body["start_date"] == "2026-01-05"
    assert body["archived_at"] is None


def test_create_project_with_missing_lead_returns_404(client, make_employee):
    member = make_employee()
    response = client.post(
        "/api/v1/projects",
        json={"name": "Orphan", "team_lead_id": MISSING_ID, "team_member_ids": [member["id"]]},
    )
    assert response.status_code == 404


def test_project_with_only_the_lead_is_rejected(client, make_employee):
    lead = make_employee()
    response = client.post("/api/v1/projects", json={"name": "Solo", "team_lead_id": lead["id"]})
    assert response.status_code == 422
    assert "at least one team member" in response.text


def test_lead_listed_as_member_is_rejected(client, make_employee):
    lead = make_employee()
    response = client.post(
        "/api/v1/projects",
        json={"name": "Self", "team_lead_id": lead["id"], "team_member_ids": [lead["id"]]},
    )
    assert response.status_code == 422
    assert "cannot also be listed" in response.text


def test_update_cannot_remove_all_members(client, make_project):
    project = make_project()
    response = client.patch(f"/api/v1/projects/{project['id']}", json={"team_member_ids": []})
    assert response.status_code == 422


def test_update_cannot_make_lead_a_member_without_changing_members(client, make_project, make_employee):
    project = make_project()
    existing_member = project["team_member_ids"][0]
    response = client.patch(f"/api/v1/projects/{project['id']}", json={"team_lead_id": existing_member})
    assert response.status_code == 400


def test_update_members_keeps_rule_when_lead_changes(client, make_project, make_employee):
    project = make_project()
    new_lead = make_employee()
    other = make_employee()
    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"team_lead_id": new_lead["id"], "team_member_ids": [other["id"]]},
    )
    assert response.status_code == 200
    assert response.json()["team_lead_id"] == new_lead["id"]


def test_create_project_with_invalid_member_id_returns_400(client, make_employee):
    lead = make_employee()
    response = client.post(
        "/api/v1/projects",
        json={"name": "Bad members", "team_lead_id": lead["id"], "team_member_ids": ["nope"]},
    )
    assert response.status_code == 400


def test_target_date_before_start_date_rejected(client, make_employee):
    lead = make_employee()
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "Dates",
            "team_lead_id": lead["id"],
            "start_date": "2026-05-01",
            "target_date": "2026-04-01",
        },
    )
    assert response.status_code == 422


def test_list_filter_and_get_project(client, make_project):
    make_project(name="Alpha", status="Active")
    make_project(name="Beta", status="Planning")
    response = client.get("/api/v1/projects", params={"status": "Active"})
    assert [p["name"] for p in response.json()] == ["Alpha"]

    project_id = response.json()[0]["id"]
    assert client.get(f"/api/v1/projects/{project_id}").json()["name"] == "Alpha"


def test_update_project_status_archive_sets_and_clears_archived_at(client, make_project):
    project = make_project()
    archived = client.patch(f"/api/v1/projects/{project['id']}", json={"status": "Archived"}).json()
    assert archived["status"] == "Archived"
    assert archived["archived_at"] is not None

    restored = client.patch(f"/api/v1/projects/{project['id']}", json={"status": "Active"}).json()
    assert restored["archived_at"] is None


def test_update_unknown_project_returns_404(client):
    assert client.patch(f"/api/v1/projects/{MISSING_ID}", json={"name": "Renamed project"}).status_code == 404


def test_delete_project_without_children_is_removed(client, make_project):
    project = make_project()
    response = client.delete(f"/api/v1/projects/{project['id']}")
    assert response.json()["action"] == "deleted"
    assert client.get(f"/api/v1/projects/{project['id']}").status_code == 404


def test_delete_project_with_tasks_is_archived(client, make_project, make_task):
    project = make_project()
    make_task(project["id"])
    response = client.delete(f"/api/v1/projects/{project['id']}")
    assert response.json()["action"] == "archived"
    assert client.get(f"/api/v1/projects/{project['id']}").json()["status"] == "Archived"


def test_trailing_slash_is_not_redirected(client):
    response = client.get("/api/v1/projects/", follow_redirects=False)
    assert response.status_code == 404
    assert client.get("/api/v1/employees/", follow_redirects=False).status_code == 404
