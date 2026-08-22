import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration


def register(api_client: TestClient, email: str) -> str:
    response = api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123", "display_name": "Learner"},
    )
    return response.json()["access_token"]


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_plan(api_client: TestClient, token: str) -> str:
    response = api_client.post(
        "/api/v1/plans", headers=headers(token), json={"title": "IELTS"}
    )
    return response.json()["id"]


def activity_payload() -> dict[str, object]:
    return {
        "name": "Listening",
        "description": "Focused practice",
        "unit_code": "minute",
        "target_quantity": "30.5",
        "schedule_type": "selected_days",
        "weekdays": [0, 2, 4],
        "effective_from": "2026-08-24",
    }


def test_create_and_list_measurable_activity(api_client: TestClient) -> None:
    token = register(api_client, "owner@example.com")
    plan_id = create_plan(api_client, token)

    created = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(token),
        json=activity_payload(),
    )

    assert created.status_code == 201
    activity = created.json()
    assert activity["measurement_dimension"] == "duration"
    assert activity["current_target"]["target_quantity"] == "30.5000"
    assert activity["current_schedule"]["weekdays"] == [0, 2, 4]

    listed = api_client.get(
        f"/api/v1/plans/{plan_id}/activities", headers=headers(token)
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [activity["id"]]


def test_custom_units_require_a_label(api_client: TestClient) -> None:
    token = register(api_client, "owner@example.com")
    plan_id = create_plan(api_client, token)
    payload = {**activity_payload(), "unit_code": "custom"}

    missing = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(token),
        json=payload,
    )
    assert missing.status_code == 422

    payload["custom_unit_label"] = "essay"
    accepted = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(token),
        json=payload,
    )
    assert accepted.status_code == 201
    assert accepted.json()["custom_unit_label"] == "essay"


@pytest.mark.parametrize(
    "changes",
    [
        {"target_quantity": "0"},
        {"weekdays": []},
        {"weekdays": [0, 0]},
        {"weekdays": [7]},
        {"schedule_type": "daily", "weekdays": [1]},
    ],
)
def test_activity_expectation_validation(
    api_client: TestClient, changes: dict[str, object]
) -> None:
    token = register(api_client, "owner@example.com")
    plan_id = create_plan(api_client, token)
    response = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(token),
        json={**activity_payload(), **changes},
    )
    assert response.status_code == 422


def test_new_expectation_preserves_target_and_schedule_history(
    api_client: TestClient, migrated_test_engine: Engine
) -> None:
    token = register(api_client, "owner@example.com")
    plan_id = create_plan(api_client, token)
    activity = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(token),
        json=activity_payload(),
    ).json()

    revised = api_client.post(
        f"/api/v1/plans/{plan_id}/activities/{activity['id']}/expectations",
        headers=headers(token),
        json={
            "target_quantity": "40",
            "schedule_type": "weekly",
            "weekdays": None,
            "effective_from": "2026-09-01",
            "reason": "Increase after the first week",
        },
    )
    assert revised.status_code == 200
    assert revised.json()["current_target"]["target_quantity"] == "40.0000"
    assert revised.json()["current_schedule"]["schedule_type"] == "weekly"

    with migrated_test_engine.connect() as connection:
        target_history = connection.execute(
            text(
                "SELECT target_quantity, effective_from, effective_until "
                "FROM activity_target_revisions WHERE activity_id = :activity_id "
                "ORDER BY effective_from"
            ),
            {"activity_id": activity["id"]},
        ).all()
    assert len(target_history) == 2
    assert str(target_history[0].effective_until) == "2026-08-31"
    assert target_history[1].effective_until is None


def test_activity_ownership_and_completed_plan_are_enforced(
    api_client: TestClient,
) -> None:
    owner = register(api_client, "owner@example.com")
    plan_id = create_plan(api_client, owner)
    activity = api_client.post(
        f"/api/v1/plans/{plan_id}/activities",
        headers=headers(owner),
        json=activity_payload(),
    ).json()
    other = register(api_client, "other@example.com")

    hidden = api_client.get(
        f"/api/v1/plans/{plan_id}/activities/{activity['id']}",
        headers=headers(other),
    )
    assert hidden.status_code == 404

    api_client.post(f"/api/v1/plans/{plan_id}/activate", headers=headers(owner))
    api_client.post(f"/api/v1/plans/{plan_id}/complete", headers=headers(owner))
    blocked = api_client.patch(
        f"/api/v1/plans/{plan_id}/activities/{activity['id']}",
        headers=headers(owner),
        json={"name": "Changed"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "plan_activities_read_only"
