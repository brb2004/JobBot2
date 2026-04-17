from pydantic import BaseModel, ConfigDict, Field
import uuid
from typing import Optional
from datetime import datetime


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content_md: Optional[str] = Field(None)
    updated_at: Optional[datetime] = Field(None)


class ResumeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_md: Optional[str] = Field(None)
