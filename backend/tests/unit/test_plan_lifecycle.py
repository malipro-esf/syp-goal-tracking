import pytest

from syp.core.exceptions import ApplicationError
from syp.plans.domain import PlanStatus, ensure_transition_allowed


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (PlanStatus.DRAFT, PlanStatus.ACTIVE),
        (PlanStatus.ACTIVE, PlanStatus.PAUSED),
        (PlanStatus.PAUSED, PlanStatus.ACTIVE),
        (PlanStatus.ACTIVE, PlanStatus.COMPLETED),
        (PlanStatus.COMPLETED, PlanStatus.ACTIVE),
        (PlanStatus.COMPLETED, PlanStatus.ARCHIVED),
    ],
)
def test_allowed_plan_transitions(current: PlanStatus, target: PlanStatus) -> None:
    ensure_transition_allowed(current, target)


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (PlanStatus.DRAFT, PlanStatus.PAUSED),
        (PlanStatus.ARCHIVED, PlanStatus.ACTIVE),
    ],
)
def test_invalid_plan_transitions_are_rejected(current: PlanStatus, target: PlanStatus) -> None:
    with pytest.raises(ApplicationError) as error:
        ensure_transition_allowed(current, target)

    assert error.value.code == "invalid_plan_transition"
