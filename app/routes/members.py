from fastapi import APIRouter, Response
from sqlalchemy import delete, select

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.dependencies import CurrentUser, DBSession
from app.models.permission import Membership
from app.models.secret import Secret, SecretAccess
from app.models.user import User
from app.schemas.team import MemberAdd, MemberPublic
from app.services import audit_service
from app.services.permission_service import get_membership, require_membership

router = APIRouter(prefix="/api/teams/{team_id}/members", tags=["members"])


def _to_member_public(membership: Membership, user: User) -> MemberPublic:
    return MemberPublic(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        public_key=user.public_key,
        role=membership.role,
        joined_at=membership.created_at,
    )


def _count_admins(db, team_id: str) -> int:
    return (
        db.query(Membership)
        .filter(Membership.team_id == team_id, Membership.role == "admin")
        .count()
    )


@router.get("", response_model=list[MemberPublic])
def list_members(team_id: str, db: DBSession, user: CurrentUser) -> list[MemberPublic]:
    require_membership(db, team_id, user.id, "viewer")
    rows = (
        db.query(Membership, User)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.team_id == team_id)
        .order_by(User.email)
        .all()
    )
    return [_to_member_public(membership, member_user) for membership, member_user in rows]


@router.post("", response_model=MemberPublic, status_code=201)
def add_member(team_id: str, data: MemberAdd, db: DBSession, user: CurrentUser) -> MemberPublic:
    require_membership(db, team_id, user.id, "admin")
    target = db.query(User).filter(User.email == data.email.lower()).first()
    if target is None:
        raise NotFoundError("No registered user with that email")
    if get_membership(db, team_id, target.id) is not None:
        raise ConflictError("User is already a team member")

    membership = Membership(team_id=team_id, user_id=target.id, role=data.role)
    db.add(membership)
    audit_service.record(
        db,
        team_id,
        user.id,
        audit_service.MEMBER_ADD,
        detail=f"user_id={target.id} role={data.role}",
    )
    db.commit()
    db.refresh(membership)
    return _to_member_public(membership, target)


@router.delete("/{target_user_id}", status_code=204)
def remove_member(team_id: str, target_user_id: str, db: DBSession, user: CurrentUser) -> Response:
    require_membership(db, team_id, user.id, "admin")
    membership = get_membership(db, team_id, target_user_id)
    if membership is None:
        raise NotFoundError("Member not found")
    if membership.role == "admin" and _count_admins(db, team_id) <= 1:
        raise BadRequestError("Cannot remove the last admin of a team")

    # Removing a member also removes their wrapped keys for this team's secrets.
    # Note: they keep any plaintext they already read. Rotating the DEK is a
    # client-side step handled by the CLI in a later phase.
    team_secret_ids = select(Secret.id).where(Secret.team_id == team_id)
    db.execute(
        delete(SecretAccess)
        .where(
            SecretAccess.user_id == target_user_id,
            SecretAccess.secret_id.in_(team_secret_ids),
        )
        .execution_options(synchronize_session=False)
    )
    db.delete(membership)
    audit_service.record(
        db,
        team_id,
        user.id,
        audit_service.MEMBER_REMOVE,
        detail=f"user_id={target_user_id}",
    )
    db.commit()
    return Response(status_code=204)