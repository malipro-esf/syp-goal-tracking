import asyncio
import logging
import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.coaching.models import PlanAssignment, PlanTemplate
from syp.identity.models import User
from syp.notifications.models import Notification
from syp.notifications.service import create_notification
from syp.plans.domain import PlanStatus
from syp.plans.models import PlanEnrollment

logger = logging.getLogger(__name__)


def _local_today(now: datetime, timezone_name: str) -> date:
    try:
        return now.astimezone(ZoneInfo(timezone_name)).date()
    except ZoneInfoNotFoundError:
        logger.warning("Invalid stored timezone %s; using UTC", timezone_name)
        return now.astimezone(ZoneInfo("UTC")).date()


def _add_once(
    session: Session,
    *,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    message: str,
    action_url: str,
    dedupe_key: str,
) -> bool:
    exists = session.scalar(
        select(Notification.id).where(
            Notification.user_id == user_id,
            Notification.dedupe_key == dedupe_key,
        )
    )
    if exists is not None:
        return False
    notification = create_notification(
        session,
        user_id=user_id,
        kind=kind,
        title=title,
        message=message,
        action_url=action_url,
        dedupe_key=dedupe_key,
    )
    return notification is not None


def generate_automated_reminders(
    session: Session,
    *,
    now: datetime | None = None,
    plan_ending_days: int = 3,
    stale_invitation_days: int = 3,
) -> int:
    """Create each due reminder once and return the number created."""

    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    created = 0
    plans = session.execute(
        select(PlanEnrollment, User.timezone)
        .join(User, User.id == PlanEnrollment.participant_user_id)
        .where(
            PlanEnrollment.status == PlanStatus.ACTIVE.value,
            PlanEnrollment.end_date.is_not(None),
        )
        .with_for_update(of=PlanEnrollment, skip_locked=True)
    ).all()
    for plan, timezone_name in plans:
        today = _local_today(current_time, timezone_name)
        days_left = (plan.end_date - today).days
        if not 0 <= days_left <= plan_ending_days:
            continue
        created += _add_once(
            session,
            user_id=plan.participant_user_id,
            kind="plan_ending",
            title="Plan ending soon",
            message=f'Your plan "{plan.title}" ends in {days_left} day(s).',
            action_url=f"/plans/{plan.id}",
            dedupe_key=f"plan-ending:{plan.id}:{plan.end_date.isoformat()}",
        )

    stale_before = current_time - timedelta(days=stale_invitation_days)
    assignments = session.execute(
        select(PlanAssignment, PlanTemplate.title)
        .join(PlanTemplate, PlanTemplate.id == PlanAssignment.template_id)
        .where(
            PlanAssignment.status == "pending",
            PlanAssignment.created_at <= stale_before,
        )
        .with_for_update(of=PlanAssignment, skip_locked=True)
    ).all()
    for assignment, template_title in assignments:
        age_days = max((current_time - assignment.created_at).days, stale_invitation_days)
        created += _add_once(
            session,
            user_id=assignment.participant_user_id,
            kind="stale_invitation",
            title="Invitation waiting for your response",
            message=f'"{template_title}" has been waiting for {age_days} day(s).',
            action_url="/coaching",
            dedupe_key=f"stale-invitation:participant:{assignment.id}",
        )
        created += _add_once(
            session,
            user_id=assignment.assigned_by_user_id,
            kind="stale_invitation",
            title="Invitation still pending",
            message=f'Your invitation for "{template_title}" is still pending.',
            action_url="/coach/participants?status=pending",
            dedupe_key=f"stale-invitation:coach:{assignment.id}",
        )

    if created:
        session.commit()
    return created


async def run_reminder_scheduler(
    session_factory: Callable[[], Session],
    interval_seconds: int,
    *,
    plan_ending_days: int,
    stale_invitation_days: int,
) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        try:

            def sweep() -> int:
                with session_factory() as session:
                    return generate_automated_reminders(
                        session,
                        plan_ending_days=plan_ending_days,
                        stale_invitation_days=stale_invitation_days,
                    )

            created = await asyncio.to_thread(sweep)
            if created:
                logger.info("Created %s automated reminder(s)", created)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Automated reminder sweep failed")
