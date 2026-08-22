import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from syp.activities.domain import UNIT_DIMENSIONS, UnitCode
from syp.activities.models import ActivitySchedule, ActivityTargetRevision, EnrollmentActivity
from syp.coaching.models import PlanAssignment, PlanTemplate, PlanTemplateActivity
from syp.coaching.schemas import (
    AssignmentCreate,
    AssignmentResponse,
    TemplateActivityCreate,
    TemplateResponse,
    TemplateWrite,
)
from syp.core.exceptions import ApplicationError
from syp.identity.models import Role, User, UserRole
from syp.identity.service import normalize_email
from syp.plans.models import PlanEnrollment, PlanStatusEvent


def _require_role(session: Session, user_id: uuid.UUID, role_code: str) -> None:
    has_role = session.scalar(
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id == user_id, Role.code == role_code)
    )
    if has_role is None:
        raise ApplicationError(
            code="role_required", message=f"The {role_code} role is required.", status_code=403
        )


def _owned_template(session: Session, coach_id: uuid.UUID, template_id: uuid.UUID) -> PlanTemplate:
    template = session.scalar(
        select(PlanTemplate).where(
            PlanTemplate.id == template_id, PlanTemplate.created_by_user_id == coach_id
        )
    )
    if template is None:
        raise ApplicationError(
            code="template_not_found",
            message="The requested plan template was not found.",
            status_code=404,
        )
    return template


def _template_response(session: Session, template: PlanTemplate) -> TemplateResponse:
    activities = list(
        session.scalars(
            select(PlanTemplateActivity)
            .where(PlanTemplateActivity.template_id == template.id)
            .order_by(PlanTemplateActivity.display_order, PlanTemplateActivity.name)
        )
    )
    return TemplateResponse.model_validate({**template.__dict__, "activities": activities})


def create_template(
    session: Session, coach_id: uuid.UUID, payload: TemplateWrite
) -> TemplateResponse:
    _require_role(session, coach_id, "coach")
    template = PlanTemplate(
        created_by_user_id=coach_id, title=payload.title.strip(), description=payload.description
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return _template_response(session, template)


def list_templates(session: Session, coach_id: uuid.UUID) -> list[TemplateResponse]:
    _require_role(session, coach_id, "coach")
    templates = session.scalars(
        select(PlanTemplate)
        .where(PlanTemplate.created_by_user_id == coach_id)
        .order_by(PlanTemplate.updated_at.desc())
    ).all()
    return [_template_response(session, item) for item in templates]


def update_template(
    session: Session, coach_id: uuid.UUID, template_id: uuid.UUID, payload: TemplateWrite
) -> TemplateResponse:
    template = _owned_template(session, coach_id, template_id)
    template.title = payload.title.strip()
    template.description = payload.description
    session.commit()
    session.refresh(template)
    return _template_response(session, template)


def remove_template(session: Session, coach_id: uuid.UUID, template_id: uuid.UUID) -> None:
    template = _owned_template(session, coach_id, template_id)
    has_assignment = session.scalar(
        select(PlanAssignment.id).where(PlanAssignment.template_id == template.id)
    )
    if has_assignment:
        raise ApplicationError(
            code="template_has_assignments",
            message="An assigned plan template cannot be deleted.",
            status_code=409,
        )
    session.delete(template)
    session.commit()


def add_template_activity(
    session: Session, coach_id: uuid.UUID, template_id: uuid.UUID, payload: TemplateActivityCreate
) -> TemplateResponse:
    template = _owned_template(session, coach_id, template_id)
    session.add(PlanTemplateActivity(template_id=template.id, **payload.model_dump(mode="json")))
    session.commit()
    session.refresh(template)
    return _template_response(session, template)


def remove_template_activity(
    session: Session, coach_id: uuid.UUID, template_id: uuid.UUID, activity_id: uuid.UUID
) -> None:
    _owned_template(session, coach_id, template_id)
    result = session.execute(
        delete(PlanTemplateActivity).where(
            PlanTemplateActivity.id == activity_id, PlanTemplateActivity.template_id == template_id
        )
    )
    if result.rowcount == 0:
        raise ApplicationError(
            code="template_activity_not_found",
            message="The plan template activity was not found.",
            status_code=404,
        )
    session.commit()


def _assignment_response(session: Session, assignment: PlanAssignment) -> AssignmentResponse:
    template = session.get(PlanTemplate, assignment.template_id)
    participant = session.get(User, assignment.participant_user_id)
    enrollment_id = session.scalar(
        select(PlanEnrollment.id).where(PlanEnrollment.source_assignment_id == assignment.id)
    )
    if template is None or participant is None:
        raise RuntimeError("Assignment references are missing.")
    return AssignmentResponse(
        **assignment.__dict__,
        template_title=template.title,
        participant_name=participant.display_name,
        participant_email=participant.email,
        enrollment_id=enrollment_id,
    )


def assign_template(
    session: Session, coach_id: uuid.UUID, template_id: uuid.UUID, payload: AssignmentCreate
) -> AssignmentResponse:
    template = _owned_template(session, coach_id, template_id)
    if not session.scalar(
        select(PlanTemplateActivity.id).where(PlanTemplateActivity.template_id == template.id)
    ):
        raise ApplicationError(
            code="empty_template",
            message="Add at least one activity before assigning this plan template.",
            status_code=409,
        )
    participant = session.scalar(
        select(User).where(User.normalized_email == normalize_email(str(payload.participant_email)))
    )
    if participant is None:
        raise ApplicationError(
            code="participant_not_found",
            message="No participant account uses that email.",
            status_code=404,
        )
    _require_role(session, participant.id, "participant")
    duplicate = session.scalar(
        select(PlanAssignment.id).where(
            PlanAssignment.template_id == template.id,
            PlanAssignment.participant_user_id == participant.id,
            PlanAssignment.status == "pending",
        )
    )
    if duplicate:
        raise ApplicationError(
            code="assignment_already_pending",
            message="This participant already has a pending invitation.",
            status_code=409,
        )
    assignment = PlanAssignment(
        template_id=template.id,
        participant_user_id=participant.id,
        assigned_by_user_id=coach_id,
        start_date=payload.start_date,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return _assignment_response(session, assignment)


def list_sent_assignments(session: Session, coach_id: uuid.UUID) -> list[AssignmentResponse]:
    _require_role(session, coach_id, "coach")
    items = session.scalars(
        select(PlanAssignment)
        .where(PlanAssignment.assigned_by_user_id == coach_id)
        .order_by(PlanAssignment.created_at.desc())
    ).all()
    return [_assignment_response(session, item) for item in items]


def list_my_invitations(session: Session, participant_id: uuid.UUID) -> list[AssignmentResponse]:
    items = session.scalars(
        select(PlanAssignment)
        .where(PlanAssignment.participant_user_id == participant_id)
        .order_by(PlanAssignment.created_at.desc())
    ).all()
    return [_assignment_response(session, item) for item in items]


def respond_to_assignment(
    session: Session, participant_id: uuid.UUID, assignment_id: uuid.UUID, accept: bool
) -> AssignmentResponse:
    assignment = session.scalar(
        select(PlanAssignment)
        .where(
            PlanAssignment.id == assignment_id, PlanAssignment.participant_user_id == participant_id
        )
        .with_for_update()
    )
    if assignment is None:
        raise ApplicationError(
            code="assignment_not_found", message="The invitation was not found.", status_code=404
        )
    if assignment.status != "pending":
        raise ApplicationError(
            code="assignment_already_answered",
            message="This invitation has already been answered.",
            status_code=409,
        )
    assignment.status = "accepted" if accept else "rejected"
    assignment.responded_at = datetime.now(UTC)
    if accept:
        template = session.get(PlanTemplate, assignment.template_id)
        if template is None:
            raise RuntimeError("Assignment plan template is missing.")
        plan = PlanEnrollment(
            participant_user_id=participant_id,
            created_by_user_id=assignment.assigned_by_user_id,
            coach_user_id=assignment.assigned_by_user_id,
            source_template_id=template.id,
            source_assignment_id=assignment.id,
            title=template.title,
            description=template.description,
            status="draft",
            start_date=assignment.start_date,
        )
        session.add(plan)
        session.flush()
        session.add(
            PlanStatusEvent(plan_id=plan.id, status="draft", effective_on=assignment.start_date)
        )
        template_activities = session.scalars(
            select(PlanTemplateActivity).where(PlanTemplateActivity.template_id == template.id)
        ).all()
        for source in template_activities:
            activity = EnrollmentActivity(
                enrollment_id=plan.id,
                name=source.name,
                description=source.description,
                measurement_dimension=UNIT_DIMENSIONS[UnitCode(source.unit_code)].value,
                unit_code=source.unit_code,
                custom_unit_label=source.custom_unit_label,
                display_order=source.display_order,
            )
            session.add(activity)
            session.flush()
            session.add(
                ActivityTargetRevision(
                    activity_id=activity.id,
                    target_quantity=source.target_quantity,
                    effective_from=assignment.start_date,
                    created_by_user_id=assignment.assigned_by_user_id,
                    reason="Copied from coach plan template",
                )
            )
            session.add(
                ActivitySchedule(
                    activity_id=activity.id,
                    schedule_type=source.schedule_type,
                    weekdays=source.weekdays,
                    effective_from=assignment.start_date,
                    created_by_user_id=assignment.assigned_by_user_id,
                )
            )
    session.commit()
    session.refresh(assignment)
    return _assignment_response(session, assignment)


def list_participants(session: Session, coach_id: uuid.UUID) -> list[AssignmentResponse]:
    _require_role(session, coach_id, "coach")
    items = session.scalars(
        select(PlanAssignment)
        .where(PlanAssignment.assigned_by_user_id == coach_id, PlanAssignment.status == "accepted")
        .order_by(PlanAssignment.responded_at.desc())
    ).all()
    return [_assignment_response(session, item) for item in items]
