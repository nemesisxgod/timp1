import os

import pytest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret"

from app import create_app 
from app.extensions import db  


@pytest.fixture()
def client():
    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as testing_client:
        yield testing_client


def _register_and_login(client):
    register_payload = {"username": "admin", "email": "admin@example.com", "password": "12345678"}
    assert client.post("/api/auth/register", json=register_payload).status_code == 201
    login_response = client.post("/api/auth/login", json={"username": "admin", "password": "12345678"})
    assert login_response.status_code == 200
    return login_response.get_json()["access_token"]


def test_auth_and_facility_crud(client):
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/api/facilities",
        json={"name": "Warehouse A", "address": "Sector 5", "security_level": "high"},
        headers=headers,
    )
    assert create_response.status_code == 201
    facility_id = create_response.get_json()["item"]["id"]

    list_response = client.get("/api/facilities?page=1&per_page=5", headers=headers)
    assert list_response.status_code == 200
    assert list_response.get_json()["total"] == 1

    update_response = client.put(
        f"/api/facilities/{facility_id}",
        json={"security_level": "critical"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["item"]["security_level"] == "critical"

    delete_response = client.delete(f"/api/facilities/{facility_id}", headers=headers)
    assert delete_response.status_code == 204
