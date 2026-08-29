import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from syp.plans.expiration import complete_expired_plans
from syp.plans.models import PlanEnrollment, PlanStatusEvent

pytestmark = pytest.mark.integration


def register(api_client: TestClient, email: str) -> str:
    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "display_name": "Plan Owner",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def authorization(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_list_update_and_view_personal_plan(api_client: TestClient) -> None:
    token = register(api_client, "owner@example.com")
    headers = authorization(token)

    created = api_client.post(
        "/api/v1/plans",
        headers=headers,
        json={
            "title": "Learn Python",
            "description": "Build practical projects",
            "start_date": "2026-08-22",
            "end_date": "2026-12-31",
        },
    )
    assert created.status_code == 201
    plan = created.json()
    assert plan["status"] == "draft"

    listed = api_client.get("/api/v1/plans", headers=headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [plan["id"]]

    updated = api_client.patch(
        f"/api/v1/plans/{plan['id']}",
        headers=headers,
        json={"title": "Learn Python well"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Learn Python well"

    detail = api_client.get(f"/api/v1/plans/{plan['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["description"] == "Build practical projects"


def test_plan_ownership_is_enforced_as_not_found(api_client: TestClient) -> None:
    owner_token = register(api_client, "owner@example.com")
    plan = api_client.post(
        "/api/v1/plans",
        headers=authorization(owner_token),
        json={"title": "Private plan"},
    ).json()
    other_token = register(api_client, "other@example.com")

    response = api_client.get(f"/api/v1/plans/{plan['id']}", headers=authorization(other_token))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "plan_not_found"


def test_plan_lifecycle_allows_only_defined_transitions(api_client: TestClient) -> None:
    token = register(api_client, "owner@example.com")
    headers = authorization(token)
    plan = api_client.post("/api/v1/plans", headers=headers, json={"title": "Fitness"}).json()
    plan_url = f"/api/v1/plans/{plan['id']}"

    invalid = api_client.post(f"{plan_url}/pause", headers=headers)
    assert invalid.status_code == 409
    assert invalid.json()["error"]["code"] == "invalid_plan_transition"

    assert api_client.post(f"{plan_url}/activate", headers=headers).json()["status"] == "active"
    assert api_client.post(f"{plan_url}/pause", headers=headers).json()["status"] == "paused"
    assert api_client.post(f"{plan_url}/activate", headers=headers).json()["status"] == "active"
    assert api_client.post(f"{plan_url}/complete", headers=headers).json()["status"] == "completed"
    assert api_client.post(f"{plan_url}/activate", headers=headers).json()["status"] == "active"
    assert api_client.post(f"{plan_url}/complete", headers=headers).json()["status"] == "completed"
    assert api_client.post(f"{plan_url}/archive", headers=headers).json()["status"] == "archived"

    edit = api_client.patch(plan_url, headers=headers, json={"title": "Changed"})
    assert edit.status_code == 409
    assert edit.json()["error"]["code"] == "archived_plan_read_only"


def test_plan_dates_must_be_ordered(api_client: TestClient) -> None:
    token = register(api_client, "owner@example.com")
    response = api_client.post(
        "/api/v1/plans",
        headers=authorization(token),
        json={
            "title": "Invalid dates",
            "start_date": "2026-09-01",
            "end_date": "2026-08-01",
        },
    )
    assert response.status_code == 422


def test_plans_require_authentication(api_client: TestClient) -> None:
    response = api_client.get("/api/v1/plans")
    assert response.status_code == 401


def test_expired_active_plans_complete_in_participant_timezone(
    api_client: TestClient,
    migrated_test_engine: Engine,
) -> None:
    local_token = register(api_client, "local-date@example.com")
    utc_token = register(api_client, "utc-date@example.com")
    local_headers = authorization(local_token)
    utc_headers = authorization(utc_token)
    profile = api_client.patch(
        "/api/v1/users/me",
        headers=local_headers,
        json={
            "display_name": "Plan Owner",
            "bio": None,
            "timezone": "Pacific/Kiritimati",
            "preferred_language": "en",
            "gender": None,
            "gender_theme_enabled": False,
        },
    )
    assert profile.status_code == 200

    def create_active(headers: dict[str, str], title: str) -> dict[str, object]:
        plan = api_client.post(
            "/api/v1/plans",
            headers=headers,
            json={"title": title, "start_date": "2025-12-01", "end_date": "2026-01-01"},
        ).json()
        return api_client.post(
            f"/api/v1/plans/{plan['id']}/activate", headers=headers
        ).json()

    local_plan = create_active(local_headers, "Local plan")
    utc_plan = create_active(utc_headers, "UTC plan")
    paused_plan = create_active(local_headers, "Paused plan")
    api_client.post(f"/api/v1/plans/{paused_plan['id']}/pause", headers=local_headers)

    with Session(migrated_test_engine) as session:
        completed = complete_expired_plans(
            session,
            now=datetime(2026, 1, 1, 12, tzinfo=UTC),
        )
        assert completed == [uuid.UUID(str(local_plan["id"]))]
        local_record = session.get(PlanEnrollment, uuid.UUID(str(local_plan["id"])))
        utc_record = session.get(PlanEnrollment, uuid.UUID(str(utc_plan["id"])))
        paused_record = session.get(PlanEnrollment, uuid.UUID(str(paused_plan["id"])))
        assert local_record is not None and local_record.status == "completed"
        assert utc_record is not None and utc_record.status == "active"
        assert paused_record is not None and paused_record.status == "paused"
        event = session.scalar(
            select(PlanStatusEvent)
            .where(
                PlanStatusEvent.plan_id == local_record.id,
                PlanStatusEvent.status == "completed",
            )
        )
        assert event is not None
        assert event.source == "automatic"
        assert event.effective_on.isoformat() == "2026-01-02"

        assert complete_expired_plans(
            session,
            now=datetime(2026, 1, 1, 12, tzinfo=UTC),
        ) == []
