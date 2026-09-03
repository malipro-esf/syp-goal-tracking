import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from syp.core.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(60), index=True)
    changes: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class SystemConfiguration(Base):
    __tablename__ = "system_configuration"
    __table_args__ = (CheckConstraint("id = 1", name="ck_system_configuration_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    stale_invitation_days: Mapped[int] = mapped_column(Integer, default=7)
    profile_photo_max_mb: Mapped[int] = mapped_column(Integer, default=2)
    automatic_plan_completion_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
