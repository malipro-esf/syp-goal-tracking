import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from syp.admin.models import AdminAuditLog
from syp.admin.schemas import (
    AdminAuditEntry,
    AdminAuditPage,
    AdminMetricsResponse,
    AdminUserPage,
    AdminUserSummary,
)
from syp.coaching.models import PlanAssignment
from syp.core.exceptions import ApplicationError
from syp.identity.models import RefreshSession, Role, User, UserRole
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
