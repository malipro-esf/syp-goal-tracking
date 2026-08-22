import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from syp.core.database import Base


class EnrollmentActivity(Base):
    __tablename__ = "enrollment_activities"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="ck_activities_status"),
        CheckConstraint(
            "measurement_dimension IN ('duration', 'count', 'distance', 'custom')",
            name="ck_activities_dimension",
        ),
        CheckConstraint(
            "unit_code IN ('minute', 'hour', 'page', 'repetition', 'number', "
            "'meter', 'kilometer', 'custom')",
            name="ck_activities_unit_code",
        ),
        CheckConstraint("display_order >= 0", name="ck_activities_display_order"),
        CheckConstraint(
            "(unit_code = 'custom' AND custom_unit_label IS NOT NULL) OR "
            "(unit_code <> 'custom' AND custom_unit_label IS NULL)",
            name="ck_activities_custom_unit",
        ),
        Index("ix_activities_enrollment_order", "enrollment_id", "display_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_enrollments.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    measurement_dimension: Mapped[str] = mapped_column(String(20))
    unit_code: Mapped[str] = mapped_column(String(30))
    custom_unit_label: Mapped[str | None] = mapped_column(String(40))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    target_revisions: Mapped[list["ActivityTargetRevision"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["ActivitySchedule"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )


class ActivityTargetRevision(Base):
    __tablename__ = "activity_target_revisions"
    __table_args__ = (
        CheckConstraint("target_quantity > 0", name="ck_target_revisions_positive"),
        CheckConstraint(
            "effective_until IS NULL OR effective_until >= effective_from",
            name="ck_target_revisions_dates",
        ),
        UniqueConstraint("activity_id", "effective_from", name="uq_target_revision_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("enrollment_activities.id", ondelete="CASCADE"), index=True
    )
    target_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    effective_from: Mapped[date] = mapped_column(Date)
    effective_until: Mapped[date | None] = mapped_column(Date)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    activity: Mapped[EnrollmentActivity] = relationship(back_populates="target_revisions")


class ActivitySchedule(Base):
    __tablename__ = "activity_schedules"
    __table_args__ = (
        CheckConstraint(
            "schedule_type IN ('daily', 'weekly', 'selected_days')",
            name="ck_activity_schedules_type",
        ),
        CheckConstraint(
            "(schedule_type = 'selected_days' AND weekdays IS NOT NULL) OR "
            "(schedule_type <> 'selected_days' AND weekdays IS NULL)",
            name="ck_activity_schedules_weekdays",
        ),
        CheckConstraint(
            "schedule_type <> 'selected_days' OR "
            "(cardinality(weekdays) > 0 AND "
            "weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])",
            name="ck_activity_schedules_weekday_values",
        ),
        CheckConstraint(
            "effective_until IS NULL OR effective_until >= effective_from",
            name="ck_activity_schedules_dates",
        ),
        UniqueConstraint("activity_id", "effective_from", name="uq_activity_schedule_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("enrollment_activities.id", ondelete="CASCADE"), index=True
    )
    schedule_type: Mapped[str] = mapped_column(String(20))
    weekdays: Mapped[list[int] | None] = mapped_column(ARRAY(SmallInteger))
    effective_from: Mapped[date] = mapped_column(Date)
    effective_until: Mapped[date | None] = mapped_column(Date)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    activity: Mapped[EnrollmentActivity] = relationship(back_populates="schedules")
