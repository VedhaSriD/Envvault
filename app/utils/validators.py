"""Validation helpers and reusable annotated types for request schemas."""

import base64
from typing import Annotated

from pydantic import AfterValidator, StringConstraints

MAX_CIPHERTEXT_CHARS = 100_000
MAX_WRAPPED_KEY_CHARS = 512
MAX_PASSWORD_BYTES = 72  # bcrypt limit
SECRET_NAME_PATTERN = r"^[A-Za-z0-9_.\-]+$"


def ensure_base64(value: str, expected_bytes: int | None = None) -> str:
    try:
        raw = base64.b64decode(value, validate=True)
    except ValueError as exc:
        raise ValueError("Must be valid base64") from exc
    if expected_bytes is not None and len(raw) != expected_bytes:
        raise ValueError(f"Must decode to exactly {expected_bytes} bytes")
    return value


def validate_password_strength(password: str) -> str:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must be at most 72 bytes")
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_upper and has_lower and has_digit):
        raise ValueError("Password must contain an uppercase letter, a lowercase letter and a digit")
    return password


SecretNameStr = Annotated[
    str,
    StringConstraints(min_length=1, max_length=120, pattern=SECRET_NAME_PATTERN),
]

CiphertextStr = Annotated[
    str,
    StringConstraints(min_length=1, max_length=MAX_CIPHERTEXT_CHARS),
    AfterValidator(lambda v: ensure_base64(v)),
]

NonceStr = Annotated[
    str,
    StringConstraints(min_length=16, max_length=16),
    AfterValidator(lambda v: ensure_base64(v, expected_bytes=12)),
]

WrappedKeyStr = Annotated[
    str,
    StringConstraints(min_length=1, max_length=MAX_WRAPPED_KEY_CHARS),
    AfterValidator(lambda v: ensure_base64(v)),
]

PublicKeyStr = Annotated[
    str,
    StringConstraints(min_length=44, max_length=44),
    AfterValidator(lambda v: ensure_base64(v, expected_bytes=32)),
]