from fastapi import APIRouter

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.identity.schemas import ProfileUpdate, UserResponse
from syp.identity.service import build_user_response, update_profile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser, session: DatabaseSession) -> UserResponse:
    return build_user_response(session, current_user)


@router.patch("/me", response_model=UserResponse)
def patch_me(
    payload: ProfileUpdate, current_user: CurrentUser, session: DatabaseSession
) -> UserResponse:
    return update_profile(session, current_user, payload)
