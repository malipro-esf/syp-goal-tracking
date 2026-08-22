import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine

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
