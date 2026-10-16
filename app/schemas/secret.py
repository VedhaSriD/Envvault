from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.utils.validators import CiphertextStr, NonceStr, SecretNameStr, WrappedKeyStr


class SecretCreate(BaseModel):
    name: SecretNameStr
    ciphertext: CiphertextStr
    nonce: NonceStr
    wrapped_key: WrappedKeyStr


class SecretUpdate(BaseModel):
    ciphertext: CiphertextStr
    nonce: NonceStr
    # Optional optimistic-concurrency check: fail if someone else already updated.
    expected_version: int | None = Field(default=None, ge=1)


class SecretSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    name: str
    version: int
    created_by: str
    created_at: datetime
    updated_at: datetime


class SecretDetail(SecretSummary):
    ciphertext: str
    nonce: str
    wrapped_key: str  # the requester's own wrapped DEK


class AccessGrant(BaseModel):
    user_id: str = Field(min_length=1, max_length=36)
    wrapped_key: WrappedKeyStr


class AccessPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    granted_by: str | None
    created_at: datetime