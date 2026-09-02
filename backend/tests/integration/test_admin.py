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

    participant_id = participant["user"]["id"]
    roles = api_client.put(
        f"/api/v1/admin/users/{participant_id}/roles",
        headers=headers,
        json={"roles": ["participant", "coach"]},
    )
    assert roles.status_code == 200
    assert roles.json()["roles"] == ["coach", "participant"]

    disabled = api_client.patch(
        f"/api/v1/admin/users/{participant_id}/status",
        headers=headers,
        json={"status": "disabled"},
    )
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "disabled"
    assert api_client.get("/api/v1/users/me", headers=participant_headers).status_code == 401

    admin_id = admin["user"]["id"]
    assert (
        api_client.patch(
            f"/api/v1/admin/users/{admin_id}/status",
            headers=headers,
            json={"status": "disabled"},
        ).status_code
        == 409
    )
    assert (
        api_client.put(
            f"/api/v1/admin/users/{admin_id}/roles",
            headers=headers,
            json={"roles": ["participant"]},
        ).status_code
        == 409
    )

    audit = api_client.get("/api/v1/admin/audit-log", headers=headers)
    assert audit.status_code == 200
    assert audit.json()["total"] == 2
