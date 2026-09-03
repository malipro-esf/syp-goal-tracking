from typing import Annotated

from fastapi import APIRouter, File, Response, UploadFile, status

from syp.admin.service import get_system_configuration
from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.core.exceptions import ApplicationError
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


@router.get("/me/profile-photo")
def get_profile_photo(current_user: CurrentUser) -> Response:
    if current_user.profile_photo is None or current_user.profile_photo_content_type is None:
        raise ApplicationError(
            code="profile_photo_not_found", message="No profile photo is set.", status_code=404
        )
    return Response(
        current_user.profile_photo,
        media_type=current_user.profile_photo_content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@router.put("/me/profile-photo", response_model=UserResponse)
async def put_profile_photo(
    current_user: CurrentUser,
    session: DatabaseSession,
    photo: Annotated[UploadFile, File()],
) -> UserResponse:
    signatures = {
        "image/jpeg": b"\xff\xd8\xff",
        "image/png": b"\x89PNG\r\n\x1a\n",
        "image/webp": b"RIFF",
    }
    if photo.content_type not in signatures:
        raise ApplicationError(
            code="invalid_profile_photo", message="Use a JPEG, PNG, or WebP image.", status_code=422
        )
    maximum_mb = get_system_configuration(session).profile_photo_max_mb
    content = await photo.read(maximum_mb * 1024 * 1024 + 1)
    if len(content) > maximum_mb * 1024 * 1024:
        raise ApplicationError(
            code="profile_photo_too_large",
            message=f"Profile photos must be {maximum_mb} MB or smaller.",
            status_code=413,
        )
    if not content.startswith(signatures[photo.content_type]) or (
        photo.content_type == "image/webp" and content[8:12] != b"WEBP"
    ):
        raise ApplicationError(
            code="invalid_profile_photo",
            message="The uploaded file is not a valid image.",
            status_code=422,
        )
    current_user.profile_photo = content
    current_user.profile_photo_content_type = photo.content_type
    session.commit()
    return build_user_response(session, current_user)


@router.delete("/me/profile-photo", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_photo(current_user: CurrentUser, session: DatabaseSession) -> None:
    current_user.profile_photo = None
    current_user.profile_photo_content_type = None
    session.commit()
