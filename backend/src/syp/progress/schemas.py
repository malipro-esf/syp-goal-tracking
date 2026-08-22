import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProgressEntryCreate(BaseModel):
    quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=4)
    performed_on: date
    note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def normalize_note(self) -> "ProgressEntryCreate":
        if self.note is not None:
            self.note = self.note.strip() or None
        return self


class ProgressEntryUpdate(BaseModel):
    quantity: Decimal | None = Field(default=None, gt=0, max_digits=18, decimal_places=4)
    performed_on: date | None = None
    note: str | None = Field(default=None, max_length=1000)


class ProgressEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_id: uuid.UUID
    quantity: Decimal
    performed_on: date
    note: str | None
    source: str
    recorded_at: datetime
    updated_at: datetime
