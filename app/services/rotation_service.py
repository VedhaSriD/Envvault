"""Atomic secret rotation: new ciphertext, new wrapped keys and optional
revocation, all in one transaction. A partial rotation would leave some
users unable to decrypt the secret."""

from sqlalchemy.orm import Session

from app.core.database import utcnow
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError
from app.models.secret import Secret, SecretAccess
from app.schemas.rotation import SecretRotate
from app.services import audit_service
from app.services.permission_service import ensure_role, get_access, get_secret_with_membership


def rotate_secret(db: Session, secret_id: str, actor_id: str, data: SecretRotate) -> Secret:
    secret, membership = get_secret_with_membership(db, secret_id, actor_id)
    ensure_role(membership.role, "member")
    if get_access(db, secret_id, actor_id) is None:
        raise ForbiddenError("You do not have access to this secret")

    revoke_ids = set(data.revoke_user_ids)
    if revoke_ids:
        ensure_role(membership.role, "admin")
    if actor_id in revoke_ids:
        raise BadRequestError("You cannot revoke your own access")
    if data.expected_version != secret.version:
        raise ConflictError("Secret was changed by someone else. Pull the latest version first.")

    grants = {
        access.user_id: access
        for access in db.query(SecretAccess).filter(SecretAccess.secret_id == secret.id).all()
    }
    if not revoke_ids <= set(grants):
        raise BadRequestError("A user being revoked has no access to this secret")

    remaining = set(grants) - revoke_ids
    if set(data.wraps) != remaining:
        raise BadRequestError("Provide exactly one wrapped key for each user who keeps access")

    for user_id, wrapped_key in data.wraps.items():
        grants[user_id].wrapped_key = wrapped_key

    for user_id in revoke_ids:
        db.delete(grants[user_id])
        audit_service.record(
            db,
            secret.team_id,
            actor_id,
            audit_service.SECRET_REVOKE,
            secret_id=secret.id,
            detail=f"target_user_id={user_id}",
        )

    secret.ciphertext = data.ciphertext
    secret.nonce = data.nonce
    secret.version += 1
    secret.updated_at = utcnow()
    audit_service.record(
        db,
        secret.team_id,
        actor_id,
        audit_service.SECRET_UPDATE,
        secret_id=secret.id,
        detail="rotated",
    )
    db.commit()
    db.refresh(secret)
    return secret