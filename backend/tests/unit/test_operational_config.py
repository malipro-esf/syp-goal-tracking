import json
import logging

import pytest
from pydantic import ValidationError

from syp.core.config import Settings
from syp.core.logging import JsonFormatter


@pytest.mark.parametrize(
    "auth_secret_key",
    [
        "local-development-secret-key-change-before-production",
        "replace-this-with-at-least-32-random-characters",
    ],
)
def test_production_rejects_known_unsafe_auth_secrets(auth_secret_key: str) -> None:
    with pytest.raises(ValidationError, match="Production requires a private"):
        Settings(environment="production", auth_secret_key=auth_secret_key)


def test_structured_log_formatter_emits_machine_readable_fields() -> None:
    record = logging.LogRecord(
        name="syp.requests",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="request_completed",
        args=(),
        exc_info=None,
    )
    record.request_id = "trace-123"
    record.status_code = 200

    payload = json.loads(JsonFormatter().format(record))

    assert payload["message"] == "request_completed"
    assert payload["request_id"] == "trace-123"
    assert payload["status_code"] == 200
