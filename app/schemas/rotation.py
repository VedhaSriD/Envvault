from pydantic import BaseModel, Field

from app.utils.validators import CiphertextStr, NonceStr, WrappedKeyStr


class SecretRotate(BaseModel):
    ciphertext: CiphertextStr
    nonce: NonceStr
    expected_version: int = Field(ge=1)
    # One new wrapped DEK per user who keeps access, keyed by user id.
    wraps: dict[str, WrappedKeyStr]
    # Users whose access is removed in the same transaction (admin only).
    revoke_user_ids: list[str] = Field(default_factory=list, max_length=50)