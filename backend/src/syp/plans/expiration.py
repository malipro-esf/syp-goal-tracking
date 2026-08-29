import asyncio
import contextlib
import logging
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.identity.models import User
from syp.plans.domain import PlanStatus
from syp.plans.models import PlanEnrollment, PlanStatusEvent

logger = logging.getLogger(__name__)


def complete_expired_plans(
    session: Session,
    *,
    now: datetime | None = None,
) -> list[uuid.UUID]:
    """Complete active plans after their end date passes in the participant's timezone."""

    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    rows = session.execute(
        select(PlanEnrollment, User.timezone)
        .join(User, User.id == PlanEnrollment.participant_user_id)
        .where(
            PlanEnrollment.status == PlanStatus.ACTIVE.value,
            PlanEnrollment.end_date.is_not(None),
        )
        .with_for_update(of=PlanEnrollment, skip_locked=True)
    ).all()

    completed_ids: list[uuid.UUID] = []
    for plan, timezone_name in rows:
        try:
            local_today = current_time.astimezone(ZoneInfo(timezone_name)).date()
        except ZoneInfoNotFoundError:
            logger.warning(
                "Invalid stored timezone %s for participant %s",
                timezone_name,
                plan.participant_user_id,
            )
            local_today = current_time.astimezone(ZoneInfo("UTC")).date()
        if plan.end_date is None or plan.end_date >= local_today:
            continue

        plan.status = PlanStatus.COMPLETED.value
        session.add(
            PlanStatusEvent(
                plan_id=plan.id,
                status=PlanStatus.COMPLETED.value,
                effective_on=plan.end_date + timedelta(days=1),
                source="automatic",
            )
        )
        completed_ids.append(plan.id)

    if completed_ids:
        session.commit()
    return completed_ids


async def run_plan_completion_scheduler(
    session_factory: Callable[[], Session],
    interval_seconds: int,
) -> None:
    """Run the idempotent expiration sweep until the application shuts down."""

    while True:
        await asyncio.sleep(interval_seconds)
        try:
            def sweep() -> list[uuid.UUID]:
                with session_factory() as session:
                    return complete_expired_plans(session)

            completed_ids = await asyncio.to_thread(sweep)
            if completed_ids:
                logger.info("Automatically completed %s expired plan(s)", len(completed_ids))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Automatic plan completion sweep failed")


async def stop_scheduler(task: asyncio.Task[None]) -> None:
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
