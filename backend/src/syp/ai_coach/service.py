from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from syp.ai_coach.agent import AgentRunner, run_openai_agent
from syp.ai_coach.models import AgentRun
from syp.ai_coach.schemas import CoachAnswer, CoachQuestion
from syp.ai_coach.tools import CoachToolbox
from syp.core.config import Settings
from syp.core.exceptions import ApplicationError
from syp.identity.models import User
from syp.plans.service import get_personal_plan


def ask_progress_coach(
    session: Session,
    user: User,
    payload: CoachQuestion,
    settings: Settings,
    runner: AgentRunner | None = None,
) -> CoachAnswer:
    if not settings.ai_coach_enabled or not settings.openai_api_key:
        raise ApplicationError(
            code="ai_coach_unavailable",
            message="The AI progress coach is not configured.",
            status_code=503,
        )
    plan = get_personal_plan(session, user.id, payload.plan_id)
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    runs_today = session.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == user.id, AgentRun.started_at >= today_start
        )
    )
    if (runs_today or 0) >= settings.ai_coach_daily_run_limit:
        raise ApplicationError(
            code="ai_coach_daily_limit_reached",
            message="The daily AI coaching limit has been reached.",
            status_code=429,
        )
    run = AgentRun(
        user_id=user.id,
        enrollment_id=plan.id,
        status="running",
        model=settings.ai_coach_model,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    toolbox = CoachToolbox(session=session, user=user, plan=plan, run_id=run.id)
    try:
        selected_runner = runner or run_openai_agent
        answer = selected_runner(
            payload.question.strip(), toolbox, settings.ai_coach_model, settings.openai_api_key
        )
        run.status = "completed"
        run.completed_at = datetime.now(UTC)
        session.commit()
        return CoachAnswer(run_id=run.id, answer=answer)
    except Exception as exception:
        run.status = "failed"
        run.error_code = type(exception).__name__[:100]
        run.completed_at = datetime.now(UTC)
        session.commit()
        raise ApplicationError(
            code="ai_coach_failed",
            message="The AI coach could not complete this request. Your plan data is unaffected.",
            status_code=502,
        ) from exception
