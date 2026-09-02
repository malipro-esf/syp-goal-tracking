import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, inspect, text

pytestmark = pytest.mark.integration


def test_migrations_reach_current_revision(migrated_test_engine: Engine) -> None:
    inspector = inspect(migrated_test_engine)

    assert "alembic_version" in inspector.get_table_names()

    with migrated_test_engine.connect() as connection:
        revision = connection.scalar(text("SELECT version_num FROM alembic_version"))

        assert revision == "20260902_29"


def test_transaction_rollback_isolates_changes(migrated_test_engine: Engine) -> None:
    with migrated_test_engine.connect() as connection:
        outer_transaction = connection.begin()
        connection.execute(text("CREATE TEMP TABLE rollback_probe (value INTEGER NOT NULL)"))

        savepoint = connection.begin_nested()
        connection.execute(text("INSERT INTO rollback_probe (value) VALUES (1)"))
        assert connection.scalar(text("SELECT count(*) FROM rollback_probe")) == 1

        savepoint.rollback()
        assert connection.scalar(text("SELECT count(*) FROM rollback_probe")) == 0

        outer_transaction.rollback()


def test_readiness_checks_database(api_client: TestClient) -> None:
    response = api_client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
