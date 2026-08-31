import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


def register(client: TestClient, email: str, account_type: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "display_name": email.split("@")[0].title(),
            "account_type": account_type,
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_template_with_activity(
    client: TestClient, coach_token: str, default_end_date: str | None = None
) -> str:
    created = client.post(
        "/api/v1/coaching/templates",
        headers=auth(coach_token),
        json={
            "title": "IELTS foundation",
            "description": "Reusable program",
            "default_end_date": default_end_date,
        },
    )
    assert created.status_code == 201
    template_id = created.json()["id"]
    activity = client.post(
        f"/api/v1/coaching/templates/{template_id}/activities",
        headers=auth(coach_token),
        json={
            "name": "Listening",
            "unit_code": "minute",
            "target_quantity": "30",
            "schedule_type": "daily",
        },
    )
    assert activity.status_code == 200
    return template_id


def test_acceptance_copies_an_independent_enrollment(api_client: TestClient) -> None:
    coach = register(api_client, "coach@example.com", "coach")
    participant = register(api_client, "learner@example.com", "participant")
    template_id = create_template_with_activity(api_client, coach, "2026-09-24")

    sent = api_client.post(
        f"/api/v1/coaching/templates/{template_id}/assignments",
        headers=auth(coach),
        json={"participant_email": "learner@example.com", "start_date": "2026-08-24"},
    )
    assignment_id = sent.json()["id"]
    accepted = api_client.post(
        f"/api/v1/coaching/invitations/{assignment_id}/accept",
        headers=auth(participant),
    )
    assert accepted.status_code == 200
    enrollment_id = accepted.json()["enrollment_id"]
    plan = api_client.get(f"/api/v1/plans/{enrollment_id}", headers=auth(participant))
    assert plan.json()["end_date"] == "2026-09-24"
    assert plan.json()["status"] == "active"
    coach_update = api_client.patch(
        f"/api/v1/coaching/enrollments/{enrollment_id}",
        headers=auth(coach),
        json={"end_date": "2026-10-01"},
    )
    assert coach_update.status_code == 200
    assert coach_update.json()["end_date"] == "2026-10-01"
    plan = api_client.get(f"/api/v1/plans/{enrollment_id}", headers=auth(participant))
    assert plan.json()["end_date"] == "2026-10-01"
    copied = api_client.get(f"/api/v1/plans/{enrollment_id}/activities", headers=auth(participant))
    assert copied.json()[0]["current_target"]["target_quantity"] == "30.0000"

    locked_plan = api_client.patch(
        f"/api/v1/plans/{enrollment_id}",
        headers=auth(participant),
        json={"end_date": "2026-10-01"},
    )
    assert locked_plan.status_code == 403
    locked_activity = api_client.post(
        f"/api/v1/plans/{enrollment_id}/activities",
        headers=auth(participant),
        json={
            "name": "Extra work",
            "unit_code": "minute",
            "target_quantity": "10",
            "schedule_type": "daily",
            "effective_from": "2026-08-24",
        },
    )
    assert locked_activity.status_code == 403
    recorded = api_client.post(
        f"/api/v1/plans/{enrollment_id}/activities/{copied.json()[0]['id']}/progress-entries",
        headers=auth(participant),
        json={
            "quantity": "20",
            "performed_on": "2026-08-24",
        },
    )
    assert recorded.status_code == 201

    api_client.post(
        f"/api/v1/coaching/templates/{template_id}/activities",
        headers=auth(coach),
        json={
            "name": "Reading",
            "unit_code": "page",
            "target_quantity": "20",
            "schedule_type": "daily",
        },
    )
    unchanged = api_client.get(
        f"/api/v1/plans/{enrollment_id}/activities", headers=auth(participant)
    )
    assert len(unchanged.json()) == 1
    participants = api_client.get("/api/v1/coaching/participants", headers=auth(coach))
    assert participants.json()[0]["enrollment_id"] == enrollment_id


def test_role_and_invitation_authorization(api_client: TestClient) -> None:
    coach = register(api_client, "coach@example.com", "coach")
    participant = register(api_client, "learner@example.com", "participant")
    stranger = register(api_client, "stranger@example.com", "participant")
    forbidden = api_client.post(
        "/api/v1/coaching/templates",
        headers=auth(participant),
        json={"title": "Not allowed"},
    )
    assert forbidden.status_code == 403

    template_id = create_template_with_activity(api_client, coach)
    sent = api_client.post(
        f"/api/v1/coaching/templates/{template_id}/assignments",
        headers=auth(coach),
        json={"participant_email": "learner@example.com", "start_date": "2026-08-24"},
    )
    assignment_id = sent.json()["id"]
    hidden = api_client.post(
        f"/api/v1/coaching/invitations/{assignment_id}/accept", headers=auth(stranger)
    )
    assert hidden.status_code == 404
    rejected = api_client.post(
        f"/api/v1/coaching/invitations/{assignment_id}/reject", headers=auth(participant)
    )
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["enrollment_id"] is None


def test_coach_progress_and_feedback_follow_accepted_assignment(api_client: TestClient) -> None:
    coach = register(api_client, "coach@example.com", "coach")
    other_coach = register(api_client, "other@example.com", "coach")
    participant = register(api_client, "learner@example.com", "participant")
    template_id = create_template_with_activity(api_client, coach)
    sent = api_client.post(
        f"/api/v1/coaching/templates/{template_id}/assignments",
        headers=auth(coach),
        json={"participant_email": "learner@example.com", "start_date": "2026-08-24"},
    )
    accepted = api_client.post(
        f"/api/v1/coaching/invitations/{sent.json()['id']}/accept",
        headers=auth(participant),
    )
    enrollment_id = accepted.json()["enrollment_id"]

    report = api_client.get(
        f"/api/v1/plans/{enrollment_id}/progress-report",
        headers=auth(coach),
        params={"start_date": "2026-08-24", "end_date": "2026-08-30"},
    )
    assert report.status_code == 200
    hidden_report = api_client.get(
        f"/api/v1/plans/{enrollment_id}/progress-report",
        headers=auth(other_coach),
        params={"start_date": "2026-08-24", "end_date": "2026-08-30"},
    )
    assert hidden_report.status_code == 404

    created = api_client.post(
        f"/api/v1/coaching/enrollments/{enrollment_id}/feedback",
        headers=auth(coach),
        json={"message": "Strong start. Keep the sessions consistent."},
    )
    assert created.status_code == 201
    assert created.json()["coach_name"] == "Coach"
    forbidden = api_client.post(
        f"/api/v1/coaching/enrollments/{enrollment_id}/feedback",
        headers=auth(other_coach),
        json={"message": "Not authorized"},
    )
    assert forbidden.status_code == 404
    visible = api_client.get(
        f"/api/v1/coaching/enrollments/{enrollment_id}/feedback",
        headers=auth(participant),
    )
    assert visible.status_code == 200
    assert visible.json()[0]["message"].startswith("Strong start")
