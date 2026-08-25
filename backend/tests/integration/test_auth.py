import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

REGISTRATION = {
    "email": "learner@example.com",
    "password": "correct-horse-battery-staple",
    "display_name": "SYP Learner",
}


def test_register_and_access_current_user(api_client: TestClient) -> None:
    response = api_client.post("/api/v1/auth/register", json=REGISTRATION)

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["roles"] == ["participant"]
    assert "syp_refresh_token" in response.cookies

    me = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == REGISTRATION["email"]


def test_duplicate_email_is_rejected_case_insensitively(api_client: TestClient) -> None:
    assert api_client.post("/api/v1/auth/register", json=REGISTRATION).status_code == 201
    duplicate = {**REGISTRATION, "email": "LEARNER@example.com"}

    response = api_client.post("/api/v1/auth/register", json=duplicate)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_already_registered"


def test_user_can_update_only_their_profile_preferences(api_client: TestClient) -> None:
    registration = api_client.post("/api/v1/auth/register", json=REGISTRATION).json()
    headers = {"Authorization": f"Bearer {registration['access_token']}"}

    response = api_client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={
            "display_name": "Updated Learner",
            "bio": "Working toward IELTS band 8.",
            "timezone": "Europe/Bucharest",
            "preferred_language": "ko",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        **registration["user"],
        "display_name": "Updated Learner",
        "bio": "Working toward IELTS band 8.",
        "timezone": "Europe/Bucharest",
        "preferred_language": "ko",
    }
    assert (
        api_client.patch(
            "/api/v1/users/me",
            headers=headers,
            json={
                "display_name": "Updated Learner",
                "bio": None,
                "timezone": "Not/A_Timezone",
                "preferred_language": "en",
            },
        ).status_code
        == 422
    )


def test_registration_requires_at_least_eight_password_characters(
    api_client: TestClient,
) -> None:
    too_short = {**REGISTRATION, "password": "1234567"}
    accepted = {**REGISTRATION, "password": "12345678"}

    assert api_client.post("/api/v1/auth/register", json=too_short).status_code == 422
    assert api_client.post("/api/v1/auth/register", json=accepted).status_code == 201


def test_login_rejects_invalid_password(api_client: TestClient) -> None:
    assert api_client.post("/api/v1/auth/register", json=REGISTRATION).status_code == 201

    response = api_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTRATION["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_refresh_rotation_detects_reuse_and_revokes_family(api_client: TestClient) -> None:
    registration = api_client.post("/api/v1/auth/register", json=REGISTRATION)
    original_token = registration.cookies["syp_refresh_token"]

    refreshed = api_client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    replacement_token = refreshed.cookies["syp_refresh_token"]
    assert replacement_token != original_token

    reuse = api_client.post(
        "/api/v1/auth/refresh",
        cookies={"syp_refresh_token": original_token},
    )
    assert reuse.status_code == 401

    revoked_replacement = api_client.post(
        "/api/v1/auth/refresh",
        cookies={"syp_refresh_token": replacement_token},
    )
    assert revoked_replacement.status_code == 401


def test_logout_revokes_refresh_session(api_client: TestClient) -> None:
    assert api_client.post("/api/v1/auth/register", json=REGISTRATION).status_code == 201

    logout = api_client.post("/api/v1/auth/logout")

    assert logout.status_code == 204
    assert api_client.post("/api/v1/auth/refresh").status_code == 401
