import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from syp.activities.domain import ScheduleType, UnitCode


class TemplateWrite(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def normalize_text(self) -> "TemplateWrite":
        self.title = self.title.strip()
        if not self.title:
            raise ValueError("Plan template title cannot be blank.")
        if self.description is not None:
            self.description = self.description.strip() or None
        return self


class TemplateActivityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    unit_code: UnitCode
    custom_unit_label: str | None = Field(default=None, max_length=40)
    target_quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=4)
    schedule_type: ScheduleType
    weekdays: list[int] | None = None
    display_order: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_details(self) -> "TemplateActivityCreate":
        self.name = self.name.strip()
        if self.unit_code == UnitCode.CUSTOM and not self.custom_unit_label:
            raise ValueError("A custom unit requires a label.")
        if self.unit_code != UnitCode.CUSTOM and self.custom_unit_label is not None:
            raise ValueError("A custom label is only valid with the custom unit.")
        if self.schedule_type == ScheduleType.SELECTED_DAYS:
            if not self.weekdays or any(day not in range(7) for day in self.weekdays):
                raise ValueError("Selected-day schedules require weekdays from 0 to 6.")
            self.weekdays = sorted(set(self.weekdays))
        elif self.weekdays is not None:
            raise ValueError("Weekdays are only valid for selected-day schedules.")
        return self


class TemplateActivityResponse(TemplateActivityCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class TemplateResponse(TemplateWrite):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    activities: list[TemplateActivityResponse] = Field(default_factory=list)


class AssignmentCreate(BaseModel):
    participant_email: EmailStr
    start_date: date


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    template_title: str
    participant_user_id: uuid.UUID
    participant_name: str
    participant_email: EmailStr
    assigned_by_user_id: uuid.UUID
    status: str
    start_date: date
    responded_at: datetime | None
    created_at: datetime
    enrollment_id: uuid.UUID | None = None
