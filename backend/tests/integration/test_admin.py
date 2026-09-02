import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration


def register(api_client: TestClient, email: str) -> dict:
    return api_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "correct-horse-battery-staple",
            "display_name": "Admin Test",
        },
    ).json()


def test_admin_endpoints_require_role_and_return_metrics_and_users(
    api_client: TestClient, migrated_test_engine: Engine
) -> None:
    admin = register(api_client, "admin@example.com")
    participant = register(api_client, "participant@example.com")
    participant_headers = {"Authorization": f"Bearer {participant['access_token']}"}
    assert api_client.get("/api/v1/admin/metrics", headers=participant_headers).status_code == 403

    with migrated_test_engine.begin() as connection:
        connection.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, 3)"),
            {"user_id": admin["user"]["id"]},
        )

    headers = {"Authorization": f"Bearer {admin['access_token']}"}
    metrics = api_client.get("/api/v1/admin/metrics", headers=headers)
    assert metrics.status_code == 200
    assert metrics.json()["users"] == 2

    users = api_client.get("/api/v1/admin/users?search=participant", headers=headers)
    assert users.status_code == 200
    assert users.json()["total"] == 1
    assert users.json()["items"][0]["email"] == "participant@example.com"
