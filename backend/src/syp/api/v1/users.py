from fastapi import APIRouter

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.identity.schemas import UserResponse
from syp.identity.service import build_user_response

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser, session: DatabaseSession) -> UserResponse:
    return build_user_response(session, current_user)
