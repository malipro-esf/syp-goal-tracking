import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from syp.plans.domain import PlanStatus


class PlanWriteBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "PlanWriteBase":
        self.title = self.title.strip()
        if not self.title:
            raise ValueError("Title cannot be blank.")
        if self.description is not None:
            self.description = self.description.strip() or None
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date.")
        return self


class PlanCreate(PlanWriteBase):
    pass


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    status: PlanStatus
    start_date: date | None
    end_date: date | None
    created_at: datetime
    updated_at: datetime
