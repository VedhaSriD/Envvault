from functools import lru_cache

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserRegister


@lru_cache(maxsize=1)
def _timing_dummy_hash() -> str:
    """Used to spend the same time on unknown emails, so timing reveals nothing."""
    return hash_password("timing-equalizer-not-a-real-password")


def register_user(db: Session, data: UserRegister) -> User:
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise ConflictError("Email is already registered")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        public_key=data.public_key,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None:
        verify_password(password, _timing_dummy_hash())
        raise UnauthorizedError("Invalid email or password")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid email or password")
    return user


def issue_token(user: User) -> str:
    return create_access_token(user.id)