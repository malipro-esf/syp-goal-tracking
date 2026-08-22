import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session

from syp.core.database import get_db_session
from syp.main import app

TEST_DATABASE_URL = os.getenv(
    "SYP_TEST_DATABASE_URL",
    "postgresql+psycopg://syp:local-development-only@localhost:55433/syp_test",
)


def _assert_test_database(url: str) -> None:
    database_name = url.rsplit("/", maxsplit=1)[-1].split("?", maxsplit=1)[0]
    if database_name != "syp_test":
        raise RuntimeError("Integration tests may run only against the 'syp_test' database.")


@pytest.fixture(scope="session")
def migrated_test_engine() -> Generator[Engine]:
    """Apply migrations to the isolated test database and provide its engine."""

    _assert_test_database(TEST_DATABASE_URL)
    alembic_config = Config("alembic.ini")
    alembic_config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)

    try:
        command.upgrade(alembic_config, "head")
        engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
        yield engine
        engine.dispose()
    finally:
        command.downgrade(alembic_config, "base")


@pytest.fixture
def api_client(migrated_test_engine: Engine) -> Generator[TestClient]:
    def override_database_session() -> Generator[Session]:
        with Session(migrated_test_engine) as session:
            yield session

    app.dependency_overrides[get_db_session] = override_database_session
    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    with migrated_test_engine.begin() as connection:
        connection.execute(text("DELETE FROM progress_entries"))
        connection.execute(text("DELETE FROM activity_schedules"))
        connection.execute(text("DELETE FROM activity_target_revisions"))
        connection.execute(text("DELETE FROM enrollment_activities"))
        connection.execute(text("DELETE FROM plan_status_events"))
        connection.execute(text("DELETE FROM plan_enrollments"))
        connection.execute(text("DELETE FROM plan_assignments"))
        connection.execute(text("DELETE FROM plan_template_activities"))
        connection.execute(text("DELETE FROM plan_templates"))
        connection.execute(text("DELETE FROM refresh_sessions"))
        connection.execute(text("DELETE FROM user_roles"))
        connection.execute(text("DELETE FROM users"))
