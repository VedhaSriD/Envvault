from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.permission import Role


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class TeamPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    owner_id: str
    created_at: datetime


class TeamWithRole(TeamPublic):
    role: Role


class MemberAdd(BaseModel):
    email: EmailStr
    role: Role = "member"


class MemberPublic(BaseModel):
    user_id: str
    email: str
    full_name: str
    public_key: str
    role: Role
    joined_at: datetime