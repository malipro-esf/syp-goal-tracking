import uuid
from typing import Literal

from pydantic import BaseModel, Field


class CoachQuestion(BaseModel):
    plan_id: uuid.UUID
    question: str = Field(min_length=3, max_length=1000)
    consent_to_ai_processing: Literal[True]


class CoachAnswer(BaseModel):
    run_id: uuid.UUID
    answer: str
