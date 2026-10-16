"""Secret lifecycle, sharing and revocation. The server never sees plaintext
or raw data keys; it only stores ciphertext and wrapped keys."""

from sqlalchemy.orm import Session

from app.core.database import utcnow
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models.secret import Secret, SecretAccess
from app.schemas.secret import SecretCreate, SecretUpdate
from app.services import audit_service
from app.services.permission_service import (
    ensure_role,
    get_access,
    get_membership,
    get_secret_with_membership,
)


def create_secret(db: Session, team_id: str, user_id: str, data: SecretCreate) -> Secret:
    duplicate = db.query(Secret).filter(Secret.team_id == team_id, Secret.name == data.name).first()
    if duplicate is not None:
        raise ConflictError("A secret with this name already exists in the team")

    secret = Secret(
        team_id=team_id,
        name=data.name,
        ciphertext=data.ciphertext,
        nonce=data.nonce,
        version=1,
        created_by=user_id,
    )
    db.add(secret)
    db.flush()
    db.add(
        SecretAccess(
            secret_id=secret.id,
            user_id=user_id,
            wrapped_key=data.wrapped_key,
            granted_by=user_id,
        )
    )
    audit_service.record(db, team_id, user_id, audit_service.SECRET_CREATE, secret_id=secret.id)
    db.commit()
    db.refresh(secret)
    return secret


def list_accessible_secrets(db: Session, team_id: str, user_id: str) -> list[Secret]:
    return (
        db.query(Secret)
        .join(SecretAccess, SecretAccess.secret_id == Secret.id)
        .filter(Secret.team_id == team_id, SecretAccess.user_id == user_id)
        .order_by(Secret.name)
        .all()
    )


def read_secret(db: Session, secret_id: str, user_id: str) -> tuple[Secret, SecretAccess]:
    secret, _membership = get_secret_with_membership(db, secret_id, user_id)
    access = get_access(db, secret_id, user_id)
    if access is None:
        raise ForbiddenError("You do not have access to this secret")
    audit_service.record(db, secret.team_id, user_id, audit_service.SECRET_READ, secret_id=secret.id)
    db.commit()
    return secret, access


def update_secret(db: Session, secret_id: str, user_id: str, data: SecretUpdate) -> Secret:
    secret, membership = get_secret_with_membership(db, secret_id, user_id)
    ensure_role(membership.role, "member")
    if get_access(db, secret_id, user_id) is None:
        raise ForbiddenError("You do not have access to this secret")
    if data.expected_version is not None and data.expected_version != secret.version:
        raise ConflictError("Secret was changed by someone else. Pull the latest version first.")

    secret.ciphertext = data.ciphertext
    secret.nonce = data.nonce
    secret.version += 1
    secret.updated_at = utcnow()
    audit_service.record(db, secret.team_id, user_id, audit_service.SECRET_UPDATE, secret_id=secret.id)
    db.commit()
    db.refresh(secret)
    return secret


def delete_secret(db: Session, secret_id: str, user_id: str) -> None:
    secret, membership = get_secret_with_membership(db, secret_id, user_id)
    ensure_role(membership.role, "admin")
    audit_service.record(db, secret.team_id, user_id, audit_service.SECRET_DELETE, secret_id=secret.id)
    db.delete(secret)
    db.commit()


def list_access(db: Session, secret_id: str, user_id: str) -> list[SecretAccess]:
    secret, _membership = get_secret_with_membership(db, secret_id, user_id)
    if get_access(db, secret_id, user_id) is None:
        raise ForbiddenError("You do not have access to this secret")
    return db.query(SecretAccess).filter(SecretAccess.secret_id == secret.id).all()


def grant_access(
    db: Session,
    secret_id: str,
    granter_id: str,
    target_user_id: str,
    wrapped_key: str,
) -> SecretAccess:
    secret, membership = get_secret_with_membership(db, secret_id, granter_id)
    ensure_role(membership.role, "member")
    if get_access(db, secret_id, granter_id) is None:
        raise ForbiddenError("You do not have access to this secret")
    if get_membership(db, secret.team_id, target_user_id) is None:
        raise BadRequestError("Target user is not a member of this team")
    if get_access(db, secret_id, target_user_id) is not None:
        raise ConflictError("User already has access to this secret")

    access = SecretAccess(
        secret_id=secret.id,
        user_id=target_user_id,
        wrapped_key=wrapped_key,
        granted_by=granter_id,
    )
    db.add(access)
    audit_service.record(
        db,
        secret.team_id,
        granter_id,
        audit_service.SECRET_SHARE,
        secret_id=secret.id,
        detail=f"target_user_id={target_user_id}",
    )
    db.commit()
    db.refresh(access)
    return access


def revoke_access(db: Session, secret_id: str, actor_id: str, target_user_id: str) -> None:
    secret, membership = get_secret_with_membership(db, secret_id, actor_id)
    ensure_role(membership.role, "admin")
    access = get_access(db, secret_id, target_user_id)
    if access is None:
        raise NotFoundError("Access grant not found")
    db.delete(access)
    audit_service.record(
        db,
        secret.team_id,
        actor_id,
        audit_service.SECRET_REVOKE,
        secret_id=secret.id,
        detail=f"target_user_id={target_user_id}",
    )
    db.commit()