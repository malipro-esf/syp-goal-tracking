from fastapi import APIRouter

from syp.api.dependencies import DatabaseSession
from syp.support.schemas import SupportRequestCreate, SupportRequestResponse
from syp.support.service import create_support_request

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/requests", response_model=SupportRequestResponse, status_code=201)
def submit_support_request(
    payload: SupportRequestCreate, session: DatabaseSession
) -> SupportRequestResponse:
    return create_support_request(session, payload)
