from fastapi import APIRouter

from syp.ai_coach.schemas import CoachAnswer, CoachQuestion
from syp.ai_coach.service import ask_progress_coach
from syp.api.dependencies import AppSettings, CurrentUser, DatabaseSession

router = APIRouter(prefix="/ai-coach", tags=["AI coach"])


@router.post("/ask", response_model=CoachAnswer)
def ask(
    payload: CoachQuestion,
    session: DatabaseSession,
    current_user: CurrentUser,
    settings: AppSettings,
) -> CoachAnswer:
    return ask_progress_coach(session, current_user, payload, settings)
