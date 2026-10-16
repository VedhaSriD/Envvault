from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    secret_id: str | None
    action: str
    detail: str | None
    created_at: datetime