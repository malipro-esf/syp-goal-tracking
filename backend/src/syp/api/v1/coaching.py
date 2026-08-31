import uuid

from fastapi import APIRouter, status

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.coaching.schemas import (
    AssignmentCreate,
    AssignmentResponse,
    CoachEnrollmentUpdate,
    FeedbackCreate,
    FeedbackResponse,
    TemplateActivityCreate,
    TemplateResponse,
    TemplateWrite,
)
from syp.coaching.service import (
    add_template_activity,
    assign_template,
    create_feedback,
    create_template,
    get_coach_enrollment,
    list_feedback,
    list_my_invitations,
    list_participants,
    list_sent_assignments,
    list_templates,
    remove_template,
    remove_template_activity,
    respond_to_assignment,
    update_coach_enrollment,
    update_template,
)
from syp.plans.models import PlanEnrollment
from syp.plans.schemas import PlanResponse

router = APIRouter(prefix="/coaching", tags=["coaching"])


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: TemplateWrite, session: DatabaseSession, current_user: CurrentUser
) -> TemplateResponse:
    return create_template(session, current_user.id, payload)


@router.get("/templates", response_model=list[TemplateResponse])
def templates(session: DatabaseSession, current_user: CurrentUser) -> list[TemplateResponse]:
    return list_templates(session, current_user.id)


@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update(
    template_id: uuid.UUID,
    payload: TemplateWrite,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> TemplateResponse:
    return update_template(session, current_user.id, template_id, payload)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(template_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser) -> None:
    remove_template(session, current_user.id, template_id)


@router.post("/templates/{template_id}/activities", response_model=TemplateResponse)
def add_activity(
    template_id: uuid.UUID,
    payload: TemplateActivityCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> TemplateResponse:
    return add_template_activity(session, current_user.id, template_id, payload)


@router.delete(
    "/templates/{template_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_activity(
    template_id: uuid.UUID,
    activity_id: uuid.UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> None:
    remove_template_activity(session, current_user.id, template_id, activity_id)


@router.post(
    "/templates/{template_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign(
    template_id: uuid.UUID,
    payload: AssignmentCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> AssignmentResponse:
    return assign_template(session, current_user.id, template_id, payload)


@router.get("/assignments/sent", response_model=list[AssignmentResponse])
def sent(session: DatabaseSession, current_user: CurrentUser) -> list[AssignmentResponse]:
    return list_sent_assignments(session, current_user.id)


@router.get("/invitations", response_model=list[AssignmentResponse])
def invitations(session: DatabaseSession, current_user: CurrentUser) -> list[AssignmentResponse]:
    return list_my_invitations(session, current_user.id)


@router.post("/invitations/{assignment_id}/accept", response_model=AssignmentResponse)
def accept(
    assignment_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> AssignmentResponse:
    return respond_to_assignment(session, current_user.id, assignment_id, True)


@router.post("/invitations/{assignment_id}/reject", response_model=AssignmentResponse)
def reject(
    assignment_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> AssignmentResponse:
    return respond_to_assignment(session, current_user.id, assignment_id, False)


@router.get("/participants", response_model=list[AssignmentResponse])
def participants(session: DatabaseSession, current_user: CurrentUser) -> list[AssignmentResponse]:
    return list_participants(session, current_user.id)


@router.get("/enrollments/{enrollment_id}", response_model=PlanResponse)
def enrollment(
    enrollment_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanEnrollment:
    return get_coach_enrollment(session, current_user.id, enrollment_id)


@router.patch("/enrollments/{enrollment_id}", response_model=PlanResponse)
def update_enrollment(
    enrollment_id: uuid.UUID,
    payload: CoachEnrollmentUpdate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> PlanEnrollment:
    return update_coach_enrollment(session, current_user.id, enrollment_id, payload)


@router.get("/enrollments/{enrollment_id}/feedback", response_model=list[FeedbackResponse])
def feedback(
    enrollment_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> list[FeedbackResponse]:
    return list_feedback(session, current_user.id, enrollment_id)


@router.post(
    "/enrollments/{enrollment_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def leave_feedback(
    enrollment_id: uuid.UUID,
    payload: FeedbackCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> FeedbackResponse:
    return create_feedback(session, current_user.id, enrollment_id, payload)
