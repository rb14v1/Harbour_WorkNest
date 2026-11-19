import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import EMPLOYEES, HANDOVERS, PROJECTS, TASKS, ensure_indexes, get_client, get_db
from app.main import app

TEST_COLLECTIONS = (EMPLOYEES, PROJECTS, TASKS, HANDOVERS)


def _test_database_name() -> str:
    settings = get_settings()
    name = settings.mongodb_test_database
    if not name.endswith("_test"):
        pytest.exit(f"MONGODB_TEST_DATABASE must end in '_test' (got '{name}')", returncode=2)
    if name == settings.mongodb_database:
        pytest.exit("MONGODB_TEST_DATABASE must differ from MONGODB_DATABASE", returncode=2)
    return name


@pytest.fixture(scope="session")
def test_db():
    name = _test_database_name()
    db = get_client()[name]
    get_client().admin.command("ping")
    ensure_indexes(db)
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def clean_collections(test_db):
    assert test_db.name.endswith("_test")
    for name in TEST_COLLECTIONS:
        test_db[name].delete_many({})
    yield


@pytest.fixture
def client(test_db):
    return TestClient(app)


@pytest.fixture
def make_employee(client):
    counter = {"n": 0}

    def _make(**overrides):
        counter["n"] += 1
        letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[counter["n"] % 26]
        payload = {
            "name": f"Test Person {letter}",
            "email": f"employee{counter['n']}@example.com",
            "department": "Engineering",
            "job_title": "Developer",
            **overrides,
        }
        response = client.post("/api/v1/employees", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def make_project(client, make_employee):
    def _make(**overrides):
        lead = make_employee()
        member = make_employee()
        payload = {
            "name": "Website Revamp",
            "team_lead_id": lead["id"],
            "team_member_ids": [member["id"]],
            **overrides,
        }
        response = client.post("/api/v1/projects", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def make_task(client):
    def _make(project_id, **overrides):
        payload = {"project_id": project_id, "title": "Write tests", **overrides}
        response = client.post("/api/v1/tasks", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def make_handover(client):
    def _make(project_id, from_id, to_id, **overrides):
        payload = {
            "project_id": project_id,
            "from_employee_id": from_id,
            "to_employee_id": to_id,
            "summary": "Handing over the project.",
            **overrides,
        }
        response = client.post("/api/v1/handovers", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make
