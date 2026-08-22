import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from syp.core.database import Base


class PlanTemplate(Base):
    __tablename__ = "plan_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlanTemplateActivity(Base):
    __tablename__ = "plan_template_activities"
    __table_args__ = (
        CheckConstraint("target_quantity > 0", name="ck_template_activity_target_positive"),
        CheckConstraint(
            "schedule_type IN ('daily', 'weekly', 'selected_days')",
            name="ck_template_activity_schedule",
        ),
        CheckConstraint(
            "unit_code IN ('minute','hour','page','repetition','number',"
            "'meter','kilometer','custom')",
            name="ck_template_activity_unit",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    unit_code: Mapped[str] = mapped_column(String(30))
    custom_unit_label: Mapped[str | None] = mapped_column(String(40))
    target_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    schedule_type: Mapped[str] = mapped_column(String(20))
    weekdays: Mapped[list[int] | None] = mapped_column(ARRAY(SmallInteger))
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class PlanAssignment(Base):
    __tablename__ = "plan_assignments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','accepted','rejected')", name="ck_plan_assignment_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="CASCADE"), index=True
    )
    participant_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    assigned_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    start_date: Mapped[date] = mapped_column(Date)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
