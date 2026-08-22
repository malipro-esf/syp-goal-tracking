import pytest
from sqlalchemy import Engine, inspect, text

pytestmark = pytest.mark.integration


def test_migrations_reach_current_revision(migrated_test_engine: Engine) -> None:
    inspector = inspect(migrated_test_engine)

    assert "alembic_version" in inspector.get_table_names()

    with migrated_test_engine.connect() as connection:
        revision = connection.scalar(text("SELECT version_num FROM alembic_version"))

    assert revision == "20260822_02"


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
