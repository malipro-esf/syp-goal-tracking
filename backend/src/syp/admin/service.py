import csv
import io
import uuid
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, aliased

from syp.activities.models import EnrollmentActivity
from syp.admin.models import AdminAuditLog, SystemConfiguration
from syp.admin.schemas import (
    AdminAnalyticsReport,
    AdminAssignmentPage,
    AdminAssignmentSummary,
    AdminAuditEntry,
    AdminAuditPage,
    AdminCoachPerformance,
    AdminMetricsResponse,
    AdminOperationalAlerts,
    AdminPlanActivity,
    AdminPlanDetail,
    AdminPlanPage,
    AdminPlanSummary,
    AdminReportBreakdown,
    AdminReportTotals,
    AdminReportTrendPoint,
    AdminSystemSettings,
    AdminUserPage,
    AdminUserSummary,
)
from syp.coaching.models import PlanAssignment, PlanTemplate
from syp.core.exceptions import ApplicationError
from syp.identity.models import RefreshSession, Role, User, UserRole
from syp.plans.domain import PlanStatus, ensure_transition_allowed
from syp.plans.models import PlanEnrollment, PlanStatusEvent
from syp.progress.models import ProgressEntry


def analytics_report(session: Session, *, start_date: date, end_date: date) -> AdminAnalyticsReport:
    start_time = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    end_time = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=UTC)

    def created_counts(model: type[User] | type[PlanEnrollment]) -> dict[date, int]:
        return dict(
            session.execute(
                select(func.date(model.created_at), func.count())
                .where(model.created_at >= start_time, model.created_at < end_time)
                .group_by(func.date(model.created_at))
            ).all()
        )

    user_counts = created_counts(User)
    plan_counts = created_counts(PlanEnrollment)
    entry_counts = dict(
        session.execute(
            select(ProgressEntry.performed_on, func.count())
            .where(
                ProgressEntry.performed_on >= start_date,
                ProgressEntry.performed_on <= end_date,
                ProgressEntry.deleted_at.is_(None),
            )
            .group_by(ProgressEntry.performed_on)
        ).all()
    )
    trend = []
    current = start_date
    while current <= end_date:
        trend.append(
            AdminReportTrendPoint(
                date=current,
                users=user_counts.get(current, 0),
                plans=plan_counts.get(current, 0),
                entries=entry_counts.get(current, 0),
            )
        )
        current += timedelta(days=1)

    countries = [
        AdminReportBreakdown(label=country or "Not set", count=count)
        for country, count in session.execute(
            select(User.country_code, func.count())
            .group_by(User.country_code)
            .order_by(func.count().desc())
        ).all()
    ]
    roles = [
        AdminReportBreakdown(label=code, count=count)
        for code, count in session.execute(
            select(Role.code, func.count(UserRole.user_id))
            .join(UserRole, UserRole.role_id == Role.id)
            .group_by(Role.code)
            .order_by(func.count(UserRole.user_id).desc())
        ).all()
    ]
    coach = aliased(User)
    coach_rows = session.execute(
        select(
            coach.id,
            coach.display_name,
            coach.email,
            func.count(func.distinct(PlanEnrollment.participant_user_id)),
            func.count(func.distinct(PlanEnrollment.id)),
            func.count(ProgressEntry.id),
        )
        .join(PlanEnrollment, PlanEnrollment.coach_user_id == coach.id)
        .outerjoin(EnrollmentActivity, EnrollmentActivity.enrollment_id == PlanEnrollment.id)
        .outerjoin(
            ProgressEntry,
            (ProgressEntry.activity_id == EnrollmentActivity.id)
            & (ProgressEntry.recorded_at >= start_time)
            & (ProgressEntry.recorded_at < end_time)
            & ProgressEntry.deleted_at.is_(None),
        )
        .group_by(coach.id, coach.display_name, coach.email)
        .order_by(func.count(ProgressEntry.id).desc(), coach.display_name)
        .limit(20)
    ).all()
    totals = AdminReportTotals(
        new_users=sum(user_counts.values()),
        new_plans=sum(plan_counts.values()),
        activity_entries=sum(entry_counts.values()),
        active_participants=session.scalar(
            select(func.count(func.distinct(ProgressEntry.participant_user_id))).where(
                ProgressEntry.performed_on >= start_date,
                ProgressEntry.performed_on <= end_date,
                ProgressEntry.deleted_at.is_(None),
            )
        )
        or 0,
        completed_plans=session.scalar(
            select(func.count(func.distinct(PlanStatusEvent.plan_id))).where(
                PlanStatusEvent.status == "completed",
                PlanStatusEvent.recorded_at >= start_time,
                PlanStatusEvent.recorded_at < end_time,
            )
        )
        or 0,
        accepted_invitations=session.scalar(
            select(func.count())
            .select_from(PlanAssignment)
            .where(
                PlanAssignment.status == "accepted",
                PlanAssignment.responded_at >= start_time,
                PlanAssignment.responded_at < end_time,
            )
        )
        or 0,
    )
    return AdminAnalyticsReport(
        start_date=start_date,
        end_date=end_date,
        totals=totals,
        trend=trend,
        countries=countries,
        roles=roles,
        coaches=[
            AdminCoachPerformance(
                coach_id=id_,
                coach_name=name,
                coach_email=email,
                participants=participants,
                plans=plans,
                activity_entries=entries,
            )
            for id_, name, email, participants, plans, entries in coach_rows
        ],
    )


def export_admin_dataset(
    session: Session, dataset: str, *, start_date: date, end_date: date
) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    start_time = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    end_time = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=UTC)
    if dataset == "users":
        writer.writerow(["name", "email", "status", "country", "roles", "joined"])
        users = session.scalars(
            select(User)
            .where(User.created_at >= start_time, User.created_at < end_time)
            .order_by(User.created_at.desc())
        ).all()
        role_rows = session.execute(
            select(UserRole.user_id, Role.code).join(Role).order_by(Role.code)
        ).all()
        roles: dict[uuid.UUID, list[str]] = {}
        for user_id, role in role_rows:
            roles.setdefault(user_id, []).append(role)
        for user in users:
            writer.writerow(
                [
                    user.display_name,
                    user.email,
                    user.status,
                    user.country_code or "",
                    ", ".join(roles.get(user.id, [])),
                    user.created_at.isoformat(),
                ]
            )
    elif dataset == "plans":
        writer.writerow(["title", "status", "participant", "coach", "start", "end", "created"])
        participant = aliased(User)
        coach = aliased(User)
        rows = session.execute(
            select(PlanEnrollment, participant.display_name, coach.display_name)
            .join(participant, participant.id == PlanEnrollment.participant_user_id)
            .outerjoin(coach, coach.id == PlanEnrollment.coach_user_id)
            .where(PlanEnrollment.created_at >= start_time, PlanEnrollment.created_at < end_time)
            .order_by(PlanEnrollment.created_at.desc())
        ).all()
        for plan, participant_name, coach_name in rows:
            writer.writerow(
                [
                    plan.title,
                    plan.status,
                    participant_name,
                    coach_name or "Self-managed",
                    plan.start_date or "",
                    plan.end_date or "",
                    plan.created_at.isoformat(),
                ]
            )
    else:
        writer.writerow(["template", "participant", "coach", "status", "start", "end", "sent"])
        participant = aliased(User)
        coach = aliased(User)
        rows = session.execute(
            select(PlanAssignment, PlanTemplate.title, participant.display_name, coach.display_name)
            .join(PlanTemplate, PlanTemplate.id == PlanAssignment.template_id)
            .join(participant, participant.id == PlanAssignment.participant_user_id)
            .join(coach, coach.id == PlanAssignment.assigned_by_user_id)
            .where(PlanAssignment.created_at >= start_time, PlanAssignment.created_at < end_time)
            .order_by(PlanAssignment.created_at.desc())
        ).all()
        for assignment, title, participant_name, coach_name in rows:
            writer.writerow(
                [
                    title,
                    participant_name,
                    coach_name,
                    assignment.status,
                    assignment.start_date,
                    assignment.end_date or "",
                    assignment.created_at.isoformat(),
                ]
            )
    return output.getvalue()


def _plan_summary(
    plan: PlanEnrollment, participant: User, coach: User | None, creator: User, activity_count: int
) -> AdminPlanSummary:
    return AdminPlanSummary(
        id=plan.id,
        title=plan.title,
        status=plan.status,
        participant_name=participant.display_name,
        participant_email=participant.email,
        coach_name=coach.display_name if coach else None,
        created_by_name=creator.display_name,
        start_date=plan.start_date,
        end_date=plan.end_date,
        activity_count=activity_count,
        created_at=plan.created_at,
    )


def list_admin_plans(
    session: Session, *, page: int, page_size: int, search: str | None, status: str | None
) -> AdminPlanPage:
    participant = aliased(User)
    coach = aliased(User)
    creator = aliased(User)
    activity_count = (
        select(func.count(EnrollmentActivity.id))
        .where(EnrollmentActivity.enrollment_id == PlanEnrollment.id)
        .correlate(PlanEnrollment)
        .scalar_subquery()
    )
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                PlanEnrollment.title.ilike(term),
                participant.display_name.ilike(term),
                participant.email.ilike(term),
            )
        )
    if status:
        filters.append(PlanEnrollment.status == status)
    base = (
        select(PlanEnrollment)
        .join(participant, participant.id == PlanEnrollment.participant_user_id)
        .where(*filters)
    )
    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = session.execute(
        select(PlanEnrollment, participant, coach, creator, activity_count)
        .join(participant, participant.id == PlanEnrollment.participant_user_id)
        .outerjoin(coach, coach.id == PlanEnrollment.coach_user_id)
        .join(creator, creator.id == PlanEnrollment.created_by_user_id)
        .where(*filters)
        .order_by(PlanEnrollment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AdminPlanPage(
        items=[
            _plan_summary(plan, participant_user, coach_user, creator_user, count)
            for plan, participant_user, coach_user, creator_user, count in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_admin_plan(session: Session, plan_id: uuid.UUID) -> AdminPlanDetail:
    participant = aliased(User)
    coach = aliased(User)
    creator = aliased(User)
    row = session.execute(
        select(PlanEnrollment, participant, coach, creator)
        .join(participant, participant.id == PlanEnrollment.participant_user_id)
        .outerjoin(coach, coach.id == PlanEnrollment.coach_user_id)
        .join(creator, creator.id == PlanEnrollment.created_by_user_id)
        .where(PlanEnrollment.id == plan_id)
    ).one_or_none()
    if row is None:
        raise ApplicationError(
            code="plan_not_found", message="Plan was not found.", status_code=404
        )
    plan, participant_user, coach_user, creator_user = row
    activities = session.scalars(
        select(EnrollmentActivity)
        .where(EnrollmentActivity.enrollment_id == plan.id)
        .order_by(EnrollmentActivity.display_order, EnrollmentActivity.created_at)
    ).all()
    summary = _plan_summary(plan, participant_user, coach_user, creator_user, len(activities))
    return AdminPlanDetail(
        **summary.model_dump(),
        description=plan.description,
        participant_user_id=plan.participant_user_id,
        coach_user_id=plan.coach_user_id,
        created_by_user_id=plan.created_by_user_id,
        activities=[
            AdminPlanActivity(
                id=activity.id,
                name=activity.name,
                description=activity.description,
                unit=activity.custom_unit_label or activity.unit_code,
                status=activity.status,
            )
            for activity in activities
        ],
    )


def change_plan_status(
    session: Session, admin: User, plan_id: uuid.UUID, target: PlanStatus
) -> AdminPlanDetail:
    plan = session.get(PlanEnrollment, plan_id)
    if plan is None:
        raise ApplicationError(
            code="plan_not_found", message="Plan was not found.", status_code=404
        )
    current = PlanStatus(plan.status)
    ensure_transition_allowed(current, target)
    participant = session.get(User, plan.participant_user_id)
    timezone = participant.timezone if participant else "UTC"
    plan.status = target.value
    session.add(
        PlanStatusEvent(
            plan_id=plan.id,
            status=target.value,
            effective_on=datetime.now(ZoneInfo(timezone)).date(),
            source="manual",
        )
    )
    session.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            target_user_id=plan.participant_user_id,
            action="plan_status_changed",
            changes={
                "plan_id": str(plan.id),
                "plan_title": plan.title,
                "before": current.value,
                "after": target.value,
            },
        )
    )
    session.commit()
    return get_admin_plan(session, plan.id)


def dashboard_metrics(session: Session) -> AdminMetricsResponse:
    role_counts = dict(
        session.execute(
            select(Role.code, func.count(UserRole.user_id)).outerjoin(UserRole).group_by(Role.code)
        ).all()
    )
    return AdminMetricsResponse(
        users=session.scalar(select(func.count()).select_from(User)) or 0,
        participants=role_counts.get("participant", 0),
        coaches=role_counts.get("coach", 0),
        active_plans=session.scalar(
            select(func.count())
            .select_from(PlanEnrollment)
            .where(PlanEnrollment.status == "active")
        )
        or 0,
        pending_invitations=session.scalar(
            select(func.count())
            .select_from(PlanAssignment)
            .where(PlanAssignment.status == "pending")
        )
        or 0,
    )


def operational_alerts(session: Session, *, stale_days: int) -> AdminOperationalAlerts:
    stale_before = datetime.now(UTC) - timedelta(days=stale_days)
    return AdminOperationalAlerts(
        expired_active_plans=session.scalar(
            select(func.count())
            .select_from(PlanEnrollment)
            .where(PlanEnrollment.status == "active", PlanEnrollment.end_date < date.today())
        )
        or 0,
        disabled_users_with_active_plans=session.scalar(
            select(func.count(func.distinct(User.id)))
            .select_from(User)
            .join(PlanEnrollment, PlanEnrollment.participant_user_id == User.id)
            .where(User.status == "disabled", PlanEnrollment.status == "active")
        )
        or 0,
        stale_pending_invitations=session.scalar(
            select(func.count())
            .select_from(PlanAssignment)
            .where(PlanAssignment.status == "pending", PlanAssignment.created_at < stale_before)
        )
        or 0,
        stale_after_days=stale_days,
    )


def list_admin_assignments(
    session: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: str | None,
    stale_only: bool,
    stale_days: int,
) -> AdminAssignmentPage:
    participant = aliased(User)
    coach = aliased(User)
    stale_before = datetime.now(UTC) - timedelta(days=stale_days)
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                PlanTemplate.title.ilike(term),
                participant.display_name.ilike(term),
                participant.email.ilike(term),
                coach.display_name.ilike(term),
                coach.email.ilike(term),
            )
        )
    if status:
        filters.append(PlanAssignment.status == status)
    if stale_only:
        filters.extend(
            (PlanAssignment.status == "pending", PlanAssignment.created_at < stale_before)
        )
    base = (
        select(PlanAssignment.id)
        .join(PlanTemplate)
        .join(participant, participant.id == PlanAssignment.participant_user_id)
        .join(coach, coach.id == PlanAssignment.assigned_by_user_id)
        .where(*filters)
    )
    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = session.execute(
        select(PlanAssignment, PlanTemplate, participant, coach)
        .join(PlanTemplate, PlanTemplate.id == PlanAssignment.template_id)
        .join(participant, participant.id == PlanAssignment.participant_user_id)
        .join(coach, coach.id == PlanAssignment.assigned_by_user_id)
        .where(*filters)
        .order_by(PlanAssignment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    now = datetime.now(UTC)
    return AdminAssignmentPage(
        items=[
            AdminAssignmentSummary(
                id=assignment.id,
                template_title=template.title,
                participant_name=participant_user.display_name,
                participant_email=participant_user.email,
                coach_name=coach_user.display_name,
                coach_email=coach_user.email,
                status=assignment.status,
                start_date=assignment.start_date,
                end_date=assignment.end_date,
                created_at=assignment.created_at,
                responded_at=assignment.responded_at,
                pending_days=(now - assignment.created_at).days
                if assignment.status == "pending"
                else None,
                is_stale=assignment.status == "pending" and assignment.created_at < stale_before,
            )
            for assignment, template, participant_user, coach_user in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
        stale_after_days=stale_days,
    )


def get_system_configuration(session: Session) -> SystemConfiguration:
    configuration = session.get(SystemConfiguration, 1)
    if configuration is None:
        configuration = SystemConfiguration(id=1)
        session.add(configuration)
        session.flush()
    return configuration


def system_settings(session: Session) -> AdminSystemSettings:
    configuration = get_system_configuration(session)
    return AdminSystemSettings.model_validate(configuration.__dict__)


def update_system_settings(
    session: Session, admin: User, payload: AdminSystemSettings
) -> AdminSystemSettings:
    configuration = get_system_configuration(session)
    before = system_settings(session).model_dump()
    for field, value in payload.model_dump().items():
        setattr(configuration, field, value)
    session.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            action="system_settings_changed",
            changes={"before": before, "after": payload.model_dump()},
        )
    )
    session.commit()
    return system_settings(session)


def cancel_assignment(
    session: Session, admin: User, assignment_id: uuid.UUID
) -> AdminAssignmentSummary:
    assignment = session.get(PlanAssignment, assignment_id)
    if assignment is None:
        raise ApplicationError(
            code="assignment_not_found", message="Invitation was not found.", status_code=404
        )
    if assignment.status != "pending":
        raise ApplicationError(
            code="assignment_not_pending",
            message="Only pending invitations can be cancelled.",
            status_code=409,
        )
    assignment.status = "cancelled"
    assignment.responded_at = datetime.now(UTC)
    session.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            target_user_id=assignment.participant_user_id,
            action="invitation_cancelled",
            changes={
                "assignment_id": str(assignment.id),
                "before": "pending",
                "after": "cancelled",
            },
        )
    )
    session.commit()
    participant = session.get(User, assignment.participant_user_id)
    coach = session.get(User, assignment.assigned_by_user_id)
    template = session.get(PlanTemplate, assignment.template_id)
    if participant is None or coach is None or template is None:
        raise RuntimeError("Assignment references are missing.")
    return AdminAssignmentSummary(
        id=assignment.id,
        template_title=template.title,
        participant_name=participant.display_name,
        participant_email=participant.email,
        coach_name=coach.display_name,
        coach_email=coach.email,
        status=assignment.status,
        start_date=assignment.start_date,
        end_date=assignment.end_date,
        created_at=assignment.created_at,
        responded_at=assignment.responded_at,
        pending_days=None,
        is_stale=False,
    )


def list_users(
    session: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: str | None = None,
    role: str | None = None,
) -> AdminUserPage:
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(User.display_name.ilike(term), User.email.ilike(term)))
    if status:
        filters.append(User.status == status)
    if role:
        filters.append(User.id.in_(select(UserRole.user_id).join(Role).where(Role.code == role)))
    total = session.scalar(select(func.count()).select_from(User).where(*filters)) or 0
    users = session.scalars(
        select(User)
        .where(*filters)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    role_rows = (
        session.execute(
            select(UserRole.user_id, Role.code)
            .join(Role)
            .where(UserRole.user_id.in_([user.id for user in users]))
        ).all()
        if users
        else []
    )
    roles: dict[object, list[str]] = {}
    for user_id, code in role_rows:
        roles.setdefault(user_id, []).append(code)
    return AdminUserPage(
        items=[
            AdminUserSummary(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                country_code=user.country_code,
                status=user.status,
                roles=sorted(roles.get(user.id, [])),
                created_at=user.created_at,
            )
            for user in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_admin_user(session: Session, user_id: uuid.UUID) -> AdminUserSummary:
    user = session.get(User, user_id)
    if user is None:
        raise ApplicationError(
            code="user_not_found", message="User was not found.", status_code=404
        )
    roles = session.scalars(
        select(Role.code).join(UserRole).where(UserRole.user_id == user.id)
    ).all()
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        country_code=user.country_code,
        status=user.status,
        roles=sorted(roles),
        created_at=user.created_at,
    )


def change_user_status(
    session: Session, admin: User, user_id: uuid.UUID, status: str
) -> AdminUserSummary:
    user = session.get(User, user_id)
    if user is None:
        raise ApplicationError(
            code="user_not_found", message="User was not found.", status_code=404
        )
    if user.id == admin.id and status == "disabled":
        raise ApplicationError(
            code="self_lockout_forbidden",
            message="You cannot disable your own account.",
            status_code=409,
        )
    before = user.status
    user.status = status
    if status == "disabled":
        session.execute(
            update(RefreshSession)
            .where(RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
    session.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            target_user_id=user.id,
            action="user_status_changed",
            changes={"before": before, "after": status},
        )
    )
    session.commit()
    return get_admin_user(session, user.id)


def change_user_roles(
    session: Session, admin: User, user_id: uuid.UUID, requested: set[str]
) -> AdminUserSummary:
    user = session.get(User, user_id)
    if user is None:
        raise ApplicationError(
            code="user_not_found", message="User was not found.", status_code=404
        )
    current = set(
        session.scalars(select(Role.code).join(UserRole).where(UserRole.user_id == user.id)).all()
    )
    if user.id == admin.id and "admin" not in requested:
        raise ApplicationError(
            code="self_lockout_forbidden",
            message="You cannot remove your own administrator role.",
            status_code=409,
        )
    if "admin" in current and "admin" not in requested:
        active_admins = (
            session.scalar(
                select(func.count())
                .select_from(UserRole)
                .join(Role)
                .join(User)
                .where(Role.code == "admin", User.status == "active")
            )
            or 0
        )
        if active_admins <= 1:
            raise ApplicationError(
                code="final_admin_required",
                message="The final active administrator cannot be removed.",
                status_code=409,
            )
    roles = {
        role.code: role
        for role in session.scalars(select(Role).where(Role.code.in_(requested))).all()
    }
    session.query(UserRole).filter(UserRole.user_id == user.id).delete()
    session.add_all(UserRole(user_id=user.id, role_id=roles[code].id) for code in requested)
    session.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            target_user_id=user.id,
            action="user_roles_changed",
            changes={"before": sorted(current), "after": sorted(requested)},
        )
    )
    session.commit()
    return get_admin_user(session, user.id)


def list_audit_log(session: Session, *, page: int, page_size: int) -> AdminAuditPage:
    total = session.scalar(select(func.count()).select_from(AdminAuditLog)) or 0
    rows = session.scalars(
        select(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    names = (
        {
            user.id: user.display_name
            for user in session.scalars(
                select(User).where(
                    User.id.in_(
                        {
                            identifier
                            for row in rows
                            for identifier in (row.admin_user_id, row.target_user_id)
                            if identifier
                        }
                    )
                )
            ).all()
        }
        if rows
        else {}
    )
    return AdminAuditPage(
        items=[
            AdminAuditEntry(
                id=row.id,
                admin_user_id=row.admin_user_id,
                admin_name=names.get(row.admin_user_id, "Unknown administrator"),
                target_user_id=row.target_user_id,
                target_name=names.get(row.target_user_id) if row.target_user_id else None,
                action=row.action,
                changes=row.changes,
                created_at=row.created_at,
            )
            for row in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
