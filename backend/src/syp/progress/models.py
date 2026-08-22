import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from syp.core.database import Base


class ProgressEntry(Base):
    __tablename__ = "progress_entries"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_progress_entries_positive"),
        CheckConstraint("source IN ('user')", name="ck_progress_entries_source"),
        Index(
            "ix_progress_entries_participant_date",
            "participant_user_id",
            "performed_on",
        ),
        Index("ix_progress_entries_activity_date", "activity_id", "performed_on"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("enrollment_activities.id", ondelete="CASCADE")
    )
    participant_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    performed_on: Mapped[date] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="user")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
