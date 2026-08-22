from enum import StrEnum

from syp.core.exceptions import ApplicationError


class PlanStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


ALLOWED_TRANSITIONS: dict[PlanStatus, frozenset[PlanStatus]] = {
    PlanStatus.DRAFT: frozenset({PlanStatus.ACTIVE, PlanStatus.ARCHIVED}),
    PlanStatus.ACTIVE: frozenset({PlanStatus.PAUSED, PlanStatus.COMPLETED, PlanStatus.ARCHIVED}),
    PlanStatus.PAUSED: frozenset({PlanStatus.ACTIVE, PlanStatus.COMPLETED, PlanStatus.ARCHIVED}),
    PlanStatus.COMPLETED: frozenset({PlanStatus.ARCHIVED}),
    PlanStatus.ARCHIVED: frozenset(),
}


def ensure_transition_allowed(current: PlanStatus, target: PlanStatus) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise ApplicationError(
            code="invalid_plan_transition",
            message=f"A {current.value} plan cannot transition to {target.value}.",
            status_code=409,
        )
