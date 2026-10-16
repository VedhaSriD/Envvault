"""Writes and reads the audit trail. Records are added to the session;
the calling service commits them together with the action they describe."""

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

TEAM_CREATE = "team.create"
MEMBER_ADD = "member.add"
MEMBER_REMOVE = "member.remove"
SECRET_CREATE = "secret.create"
SECRET_READ = "secret.read"
SECRET_UPDATE = "secret.update"
SECRET_DELETE = "secret.delete"
SECRET_SHARE = "secret.share"
SECRET_REVOKE = "secret.revoke"


def record(
    db: Session,
    team_id: str,
    user_id: str | None,
    action: str,
    secret_id: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AuditLog(
            team_id=team_id,
            user_id=user_id,
            action=action,
            secret_id=secret_id,
            detail=detail[:255] if detail else None,
        )
    )


def list_logs(db: Session, team_id: str, limit: int = 50) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.team_id == team_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(limit)
        .all()
    )