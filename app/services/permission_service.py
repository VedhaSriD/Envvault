"""Central place for membership and access checks. Every route uses these."""

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.permission import Membership
from app.models.secret import Secret, SecretAccess

ROLE_RANK = {"viewer": 1, "member": 2, "admin": 3}


def get_membership(db: Session, team_id: str, user_id: str) -> Membership | None:
    return (
        db.query(Membership)
        .filter(Membership.team_id == team_id, Membership.user_id == user_id)
        .first()
    )


def ensure_role(role: str, min_role: str) -> None:
    if ROLE_RANK[role] < ROLE_RANK[min_role]:
        raise ForbiddenError(f"This action requires the '{min_role}' role or higher")


def require_membership(db: Session, team_id: str, user_id: str, min_role: str = "viewer") -> Membership:
    membership = get_membership(db, team_id, user_id)
    if membership is None:
        # 404 instead of 403: non-members must not learn that the team exists.
        raise NotFoundError("Team not found")
    ensure_role(membership.role, min_role)
    return membership


def get_secret_with_membership(db: Session, secret_id: str, user_id: str) -> tuple[Secret, Membership]:
    secret = db.get(Secret, secret_id)
    if secret is None:
        raise NotFoundError("Secret not found")
    membership = get_membership(db, secret.team_id, user_id)
    if membership is None:
        raise NotFoundError("Secret not found")
    return secret, membership


def get_access(db: Session, secret_id: str, user_id: str) -> SecretAccess | None:
    return (
        db.query(SecretAccess)
        .filter(SecretAccess.secret_id == secret_id, SecretAccess.user_id == user_id)
        .first()
    )