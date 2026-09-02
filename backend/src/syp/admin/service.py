from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from syp.admin.schemas import AdminMetricsResponse, AdminUserPage, AdminUserSummary
from syp.coaching.models import PlanAssignment
from syp.identity.models import Role, User, UserRole
from syp.plans.models import PlanEnrollment


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


def list_users(session: Session, *, page: int, page_size: int, search: str | None) -> AdminUserPage:
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(User.display_name.ilike(term), User.email.ilike(term)))
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
