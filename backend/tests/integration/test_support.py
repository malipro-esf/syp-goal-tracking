import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration


def register(api_client: TestClient, email: str) -> dict:
    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "correct-horse-battery-staple",
            "display_name": "Support Admin",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_public_submission_and_admin_support_queue(
    api_client: TestClient, migrated_test_engine: Engine
) -> None:
    created = api_client.post(
        "/api/v1/support/requests",
        json={
            "name": "Test User",
            "email": "support-user@example.com",
            "category": "technical",
            "subject": "Cannot record progress",
            "message": "The save action does not complete for my activity.",
        },
    )
    assert created.status_code == 201
    assert created.json()["status"] == "open"

    ordinary_user = register(api_client, "ordinary@example.com")
    ordinary_headers = {"Authorization": f"Bearer {ordinary_user['access_token']}"}
    assert (
        api_client.get("/api/v1/admin/support-requests", headers=ordinary_headers).status_code
        == 403
    )

    admin = register(api_client, "support-admin@example.com")
    with migrated_test_engine.begin() as connection:
        connection.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, 3)"),
            {"user_id": admin["user"]["id"]},
        )
    admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
    unread = api_client.get("/api/v1/admin/support-requests/unread-count", headers=admin_headers)
    assert unread.status_code == 200
    assert unread.json()["unread"] == 1
    queue = api_client.get(
        "/api/v1/admin/support-requests?status=open&search=record",
        headers=admin_headers,
    )
    assert queue.status_code == 200
    assert queue.json()["total"] == 1
    viewed = api_client.post("/api/v1/admin/support-requests/viewed", headers=admin_headers)
    assert viewed.status_code == 204
    assert (
        api_client.get("/api/v1/admin/support-requests/unread-count", headers=admin_headers).json()[
            "unread"
        ]
        == 0
    )

    updated = api_client.patch(
        f"/api/v1/admin/support-requests/{created.json()['id']}",
        headers=admin_headers,
        json={"status": "in_progress", "admin_note": "Investigating the report."},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "in_progress"
    assert updated.json()["admin_note"] == "Investigating the report."


def test_support_submission_validates_input(api_client: TestClient) -> None:
    invalid = api_client.post(
        "/api/v1/support/requests",
        json={
            "name": "A",
            "email": "not-an-email",
            "category": "unknown",
            "subject": "No",
            "message": "short",
        },
    )
    assert invalid.status_code == 422
