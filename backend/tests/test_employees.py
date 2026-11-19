def test_create_employee_normalises_email(client):
    response = client.post(
        "/api/v1/employees",
        json={"name": "Asha", "email": "  Asha.Rao@Example.com ", "department": "HR", "job_title": "Lead"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "asha.rao@example.com"
    assert body["is_active"] is True
    assert "_id" not in body


def test_duplicate_email_returns_409(client, make_employee):
    make_employee(email="dup@example.com")
    response = client.post(
        "/api/v1/employees",
        json={"name": "Other", "email": "DUP@example.com", "department": "IT", "job_title": "Admin"},
    )
    assert response.status_code == 409


def test_invalid_email_returns_422(client):
    response = client.post(
        "/api/v1/employees",
        json={"name": "Bad", "email": "not-an-email", "department": "IT", "job_title": "Admin"},
    )
    assert response.status_code == 422


def test_name_with_special_characters_rejected(client):
    for bad_name in ["Asha@Rao", "Asha<script>", "Asha123", "Asha_Rao", "  ", "A"]:
        response = client.post(
            "/api/v1/employees",
            json={"name": bad_name, "email": "x@example.com", "department": "IT", "job_title": "Admin"},
        )
        assert response.status_code == 422, bad_name


def test_name_allows_real_world_punctuation(client):
    for good_name in ["Mary-Jane O'Neill", "J. R. Smith", "Zoë Müller"]:
        response = client.post(
            "/api/v1/employees",
            json={"name": good_name, "email": f"{len(good_name)}@example.com", "department": "IT", "job_title": "Admin"},
        )
        assert response.status_code == 201, good_name


def test_department_rejects_markup(client):
    response = client.post(
        "/api/v1/employees",
        json={"name": "Asha Rao", "email": "markup@example.com", "department": "<b>IT</b>", "job_title": "Admin"},
    )
    assert response.status_code == 422


def test_label_allows_brackets_and_ampersand(client):
    response = client.post(
        "/api/v1/employees",
        json={
            "name": "Asha Rao",
            "email": "labels@example.com",
            "department": "Software Engineering (Backend)",
            "job_title": "Ops & Infra Lead",
        },
    )
    assert response.status_code == 201


def test_name_over_limit_rejected(client):
    response = client.post(
        "/api/v1/employees",
        json={"name": "A" * 101, "email": "long@example.com", "department": "IT", "job_title": "Admin"},
    )
    assert response.status_code == 422


def test_update_employee_and_mark_inactive(client, make_employee):
    employee = make_employee()
    response = client.patch(f"/api/v1/employees/{employee['id']}", json={"is_active": False, "job_title": "Manager"})
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert response.json()["job_title"] == "Manager"


def test_update_to_existing_email_returns_409(client, make_employee):
    make_employee(email="first@example.com")
    second = make_employee(email="second@example.com")
    response = client.patch(f"/api/v1/employees/{second['id']}", json={"email": "first@example.com"})
    assert response.status_code == 409


def test_null_required_field_rejected(client, make_employee):
    employee = make_employee()
    response = client.patch(f"/api/v1/employees/{employee['id']}", json={"name": None})
    assert response.status_code == 400


def test_list_employees_with_search(client, make_employee):
    make_employee(name="Priya Shah", email="priya@example.com")
    make_employee(name="Tom Hale", email="tom@example.com")
    response = client.get("/api/v1/employees", params={"q": "priya"})
    assert response.status_code == 200
    assert [e["name"] for e in response.json()] == ["Priya Shah"]


def test_invalid_and_missing_employee_ids(client):
    assert client.get("/api/v1/employees/not-an-id").status_code == 400
    assert client.get("/api/v1/employees/64b000000000000000000000").status_code == 404
