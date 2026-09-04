from datetime import UTC, datetime

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
    created_plan = api_client.post(
        "/api/v1/plans",
        headers=participant_headers,
        json={"title": "Admin visible plan", "start_date": "2026-09-02"},
    )
    assert created_plan.status_code == 201

    metrics = api_client.get("/api/v1/admin/metrics", headers=headers)
    assert metrics.status_code == 200
    assert metrics.json()["users"] == 2
    alerts = api_client.get("/api/v1/admin/alerts", headers=headers)
    assert alerts.status_code == 200
    assert alerts.json()["stale_after_days"] == 7
    assignments = api_client.get("/api/v1/admin/assignments", headers=headers)
    assert assignments.status_code == 200
    assert assignments.json()["items"] == []

    today = datetime.now(UTC).date().isoformat()
    report = api_client.get(
        f"/api/v1/admin/reports?start_date={today}&end_date={today}", headers=headers
    )
    assert report.status_code == 200
    assert report.json()["totals"]["new_users"] == 2
    assert report.json()["totals"]["new_plans"] == 1
    assert len(report.json()["trend"]) == 1
    export = api_client.get(
        f"/api/v1/admin/reports/export?dataset=users&start_date={today}&end_date={today}",
        headers=headers,
    )
    assert export.status_code == 200
    assert "participant@example.com" in export.text

    users = api_client.get("/api/v1/admin/users?search=participant", headers=headers)
    assert users.status_code == 200
    assert users.json()["total"] == 1
    assert users.json()["items"][0]["email"] == "participant@example.com"

    plans = api_client.get("/api/v1/admin/plans?search=Admin%20visible", headers=headers)
    assert plans.status_code == 200
    assert plans.json()["total"] == 1
    plan_id = created_plan.json()["id"]
    plan = api_client.get(f"/api/v1/admin/plans/{plan_id}", headers=headers)
    assert plan.status_code == 200
    assert plan.json()["participant_email"] == "participant@example.com"
    assert plan.json()["activities"] == []
    transitioned = api_client.patch(
        f"/api/v1/admin/plans/{plan_id}/status",
        headers=headers,
        json={"status": "active"},
    )
    assert transitioned.status_code == 200
    assert transitioned.json()["status"] == "active"
    assert (
        api_client.patch(
            f"/api/v1/admin/plans/{plan_id}/status",
            headers=headers,
            json={"status": "active"},
        ).status_code
        == 409
    )

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
    filtered_users = api_client.get(
        "/api/v1/admin/users?role=coach&status=disabled", headers=headers
    )
    assert filtered_users.status_code == 200
    assert filtered_users.json()["total"] == 1
    assert filtered_users.json()["items"][0]["id"] == participant_id
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

    settings = api_client.get("/api/v1/admin/settings", headers=headers)
    assert settings.status_code == 200
    assert settings.json()["stale_invitation_days"] == 7
    updated_settings = api_client.put(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "registration_enabled": True,
            "stale_invitation_days": 14,
            "profile_photo_max_mb": 3,
            "automatic_plan_completion_enabled": False,
        },
    )
    assert updated_settings.status_code == 200
    assert updated_settings.json()["stale_invitation_days"] == 14
    assert updated_settings.json()["profile_photo_max_mb"] == 3

    audit = api_client.get("/api/v1/admin/audit-log", headers=headers)
    assert audit.status_code == 200
    assert audit.json()["total"] == 4
    assert audit.json()["items"][0]["action"] == "system_settings_changed"
    assert any(item["action"] == "plan_status_changed" for item in audit.json()["items"])
