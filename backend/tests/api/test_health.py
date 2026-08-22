from fastapi.testclient import TestClient

from syp.main import app

client = TestClient(app)


def test_health_endpoint_reports_api_is_available() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "SYP API",
        "environment": "development",
    }
    assert response.headers["X-Request-ID"]


def test_request_id_is_preserved_for_log_correlation() -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "trace-123"})

    assert response.headers["X-Request-ID"] == "trace-123"


def test_unknown_endpoint_uses_standard_error_shape() -> None:
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "Not Found",
            "details": None,
        }
    }
