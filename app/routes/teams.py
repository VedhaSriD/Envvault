from fastapi import APIRouter

from app.core.exceptions import BadRequestError
from app.dependencies import CurrentUser, DBSession
from app.models.permission import Membership
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamPublic, TeamWithRole
from app.services import audit_service

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.post("", response_model=TeamPublic, status_code=201)
def create_team(data: TeamCreate, db: DBSession, user: CurrentUser) -> Team:
    name = data.name.strip()
    if not name:
        raise BadRequestError("Team name cannot be blank")

    team = Team(name=name, owner_id=user.id)
    team.memberships.append(Membership(user_id=user.id, role="admin"))
    db.add(team)
    db.flush()
    audit_service.record(db, team.id, user.id, audit_service.TEAM_CREATE)
    db.commit()
    db.refresh(team)
    return team


@router.get("", response_model=list[TeamWithRole])
def list_my_teams(db: DBSession, user: CurrentUser) -> list[TeamWithRole]:
    rows = (
        db.query(Team, Membership.role)
        .join(Membership, Membership.team_id == Team.id)
        .filter(Membership.user_id == user.id)
        .order_by(Team.created_at)
        .all()
    )
    return [
        TeamWithRole(
            id=team.id,
            name=team.name,
            owner_id=team.owner_id,
            created_at=team.created_at,
            role=role,
        )
        for team, role in rows
    ]