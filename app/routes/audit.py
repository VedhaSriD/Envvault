from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DBSession
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogPublic
from app.services import audit_service
from app.services.permission_service import require_membership

router = APIRouter(prefix="/api/teams/{team_id}/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogPublic])
def list_audit_logs(
    team_id: str,
    db: DBSession,
    user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=500),
) -> list[AuditLog]:
    require_membership(db, team_id, user.id, "admin")
    return audit_service.list_logs(db, team_id, limit)