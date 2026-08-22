import pytest
from fastapi.testclient import TestClient

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
