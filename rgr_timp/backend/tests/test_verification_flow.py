import io
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret"

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402


@pytest.fixture()
def client():
    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as testing_client:
        yield testing_client


def _register_operator_and_login(client):
    register_payload = {"username": "operator1", "email": "operator1@example.com", "password": "12345678"}
    assert client.post("/api/auth/register-operator", json=register_payload).status_code == 201
    login_response = client.post("/api/auth/login", json={"username": "operator1", "password": "12345678"})
    assert login_response.status_code == 200
    return login_response.get_json()["access_token"]


def test_verification_flow(client):
    create_response = client.post(
        "/api/verification-requests",
        data={
            "full_name": "Иван Иванов",
            "about_info": "Хочу пройти проверку",
            "document": (io.BytesIO(b"fake image bytes"), "passport.jpg"),
        },
        content_type="multipart/form-data",
    )
    assert create_response.status_code == 201
    request_number = create_response.get_json()["request_number"]

    status_response = client.get(f"/api/verification-requests/status/{request_number}")
    assert status_response.status_code == 200
    assert status_response.get_json()["status"] == "pending"

    token = _register_operator_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    pending_response = client.get("/api/operator/requests?status=pending", headers=headers)
    assert pending_response.status_code == 200
    assert len(pending_response.get_json()["items"]) == 1

    download_response = client.get(f"/api/operator/requests/{request_number}/document", headers=headers)
    assert download_response.status_code == 200
    assert len(download_response.data) > 0

    decision_response = client.post(
        f"/api/operator/requests/{request_number}/decision",
        json={"decision": "approved", "comment": "Документ и лицо совпадают"},
        headers=headers,
    )
    assert decision_response.status_code == 200
    assert decision_response.get_json()["item"]["status"] == "approved"

    status_after_response = client.get(f"/api/verification-requests/status/{request_number}")
    assert status_after_response.status_code == 200
    assert status_after_response.get_json()["status"] == "approved"

    logs_response = client.get("/api/operator/logs", headers=headers)
    assert logs_response.status_code == 200
    assert len(logs_response.get_json()["items"]) >= 2
