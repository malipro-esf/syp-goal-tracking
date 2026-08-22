from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration


def register(api_client: TestClient, email: str, timezone: str = "UTC") -> str:
    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "display_name": "Learner",
            "timezone": timezone,
        },
    )
    assert response.status_code == 201
    assert response.json()["user"]["timezone"] == timezone
    return response.json()["access_token"]


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_active_activity(api_client: TestClient, token: str) -> tuple[str, str]:
    plan = api_client.post(
        "/api/v1/plans", headers=headers(token), json={"title": "IELTS"}
    ).json()
    api_client.post(f"/api/v1/plans/{plan['id']}/activate", headers=headers(token))
    activity = api_client.post(
        f"/api/v1/plans/{plan['id']}/activities",
        headers=headers(token),
        json={
            "name": "Listening",
            "unit_code": "minute",
            "target_quantity": "30",
            "schedule_type": "daily",
            "weekdays": None,
            "effective_from": "2026-01-01",
        },
    ).json()
    return plan["id"], activity["id"]


def entry_url(plan_id: str, activity_id: str) -> str:
    return f"/api/v1/plans/{plan_id}/activities/{activity_id}/progress-entries"


def test_partial_multiple_and_above_target_entries_are_preserved(
    api_client: TestClient,
) -> None:
    token = register(api_client, "owner@example.com")
    plan_id, activity_id = create_active_activity(api_client, token)
    today = datetime.now(ZoneInfo("UTC")).date().isoformat()

    first = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(token),
        json={"quantity": "18", "performed_on": today, "note": "Morning"},
    )
    second = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(token),
        json={"quantity": "20", "performed_on": today},
    )
    assert first.status_code == 201
    assert first.json()["quantity"] == "18.0000"
    assert second.status_code == 201

    listed = api_client.get(
        f"/api/v1/plans/{plan_id}/progress-entries", headers=headers(token)
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 2
    assert sum(float(item["quantity"]) for item in listed.json()) == 38


def test_entry_can_be_corrected_and_soft_deleted(
    api_client: TestClient, migrated_test_engine: Engine
) -> None:
    token = register(api_client, "owner@example.com")
    plan_id, activity_id = create_active_activity(api_client, token)
    today = datetime.now(ZoneInfo("UTC")).date().isoformat()
    entry = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(token),
        json={"quantity": "18", "performed_on": today},
    ).json()
    url = f"{entry_url(plan_id, activity_id)}/{entry['id']}"

    corrected = api_client.patch(
        url, headers=headers(token), json={"quantity": "22", "note": "Corrected"}
    )
    assert corrected.status_code == 200
    assert corrected.json()["quantity"] == "22.0000"

    removed = api_client.delete(url, headers=headers(token))
    assert removed.status_code == 204
    assert api_client.get(
        f"/api/v1/plans/{plan_id}/progress-entries", headers=headers(token)
    ).json() == []
    with migrated_test_engine.connect() as connection:
        deleted_at = connection.scalar(
            text("SELECT deleted_at FROM progress_entries WHERE id = :id"),
            {"id": entry["id"]},
        )
    assert deleted_at is not None


def test_future_date_uses_participant_timezone(api_client: TestClient) -> None:
    timezone = "Pacific/Kiritimati"
    token = register(api_client, "owner@example.com", timezone)
    plan_id, activity_id = create_active_activity(api_client, token)
    local_today = datetime.now(ZoneInfo(timezone)).date()

    accepted = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(token),
        json={"quantity": "5", "performed_on": local_today.isoformat()},
    )
    assert accepted.status_code == 201

    future = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(token),
        json={
            "quantity": "5",
            "performed_on": (local_today + timedelta(days=1)).isoformat(),
        },
    )
    assert future.status_code == 422
    assert future.json()["error"]["code"] == "future_progress_not_allowed"


def test_cross_user_entry_access_is_hidden(api_client: TestClient) -> None:
    owner = register(api_client, "owner@example.com")
    plan_id, activity_id = create_active_activity(api_client, owner)
    today = datetime.now(ZoneInfo("UTC")).date().isoformat()
    entry = api_client.post(
        entry_url(plan_id, activity_id),
        headers=headers(owner),
        json={"quantity": "5", "performed_on": today},
    ).json()
    other = register(api_client, "other@example.com")

    response = api_client.patch(
        f"{entry_url(plan_id, activity_id)}/{entry['id']}",
        headers=headers(other),
        json={"quantity": "99"},
    )
    assert response.status_code == 404
