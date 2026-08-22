import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from syp.activities.domain import ScheduleType, UnitCode


class ExpectationInput(BaseModel):
    target_quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=4)
    schedule_type: ScheduleType
    weekdays: list[int] | None = None
    effective_from: date
    reason: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def validate_schedule(self) -> "ExpectationInput":
        if self.schedule_type == ScheduleType.SELECTED_DAYS:
            if not self.weekdays:
                raise ValueError("Selected-day schedules require at least one weekday.")
            if len(set(self.weekdays)) != len(self.weekdays):
                raise ValueError("Weekdays cannot contain duplicates.")
            if any(day < 0 or day > 6 for day in self.weekdays):
                raise ValueError("Weekdays must be between 0 (Monday) and 6 (Sunday).")
            self.weekdays.sort()
        elif self.weekdays is not None:
            raise ValueError("Weekdays are only valid for selected-day schedules.")
        if self.reason is not None:
            self.reason = self.reason.strip() or None
        return self


class ActivityCreate(ExpectationInput):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    unit_code: UnitCode
    custom_unit_label: str | None = Field(default=None, min_length=1, max_length=40)
    display_order: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_activity(self) -> "ActivityCreate":
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Activity name cannot be blank.")
        if self.description is not None:
            self.description = self.description.strip() or None
        if self.unit_code == UnitCode.CUSTOM:
            if self.custom_unit_label is None or not self.custom_unit_label.strip():
                raise ValueError("A custom unit requires a label.")
            self.custom_unit_label = self.custom_unit_label.strip()
        elif self.custom_unit_label is not None:
            raise ValueError("A custom label is only valid with the custom unit.")
        return self


class ActivityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    display_order: int | None = Field(default=None, ge=0)


class TargetRevisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    target_quantity: Decimal
    effective_from: date
    effective_until: date | None
    reason: str | None


class ScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    schedule_type: ScheduleType
    weekdays: list[int] | None
    effective_from: date
    effective_until: date | None


class ActivityResponse(BaseModel):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    name: str
    description: str | None
    measurement_dimension: str
    unit_code: UnitCode
    custom_unit_label: str | None
    display_order: int
    status: str
    current_target: TargetRevisionResponse
    current_schedule: ScheduleResponse
    created_at: datetime
    updated_at: datetime
