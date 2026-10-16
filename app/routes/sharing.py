from fastapi import APIRouter, Response

from app.dependencies import CurrentUser, DBSession
from app.models.secret import SecretAccess
from app.schemas.secret import AccessGrant, AccessPublic
from app.services import secret_service

router = APIRouter(prefix="/api/secrets/{secret_id}/access", tags=["sharing"])


@router.get("", response_model=list[AccessPublic])
def list_access_endpoint(secret_id: str, db: DBSession, user: CurrentUser) -> list[SecretAccess]:
    return secret_service.list_access(db, secret_id, user.id)


@router.post("", response_model=AccessPublic, status_code=201)
def grant_access_endpoint(secret_id: str, data: AccessGrant, db: DBSession, user: CurrentUser) -> SecretAccess:
    return secret_service.grant_access(db, secret_id, user.id, data.user_id, data.wrapped_key)


@router.delete("/{target_user_id}", status_code=204)
def revoke_access_endpoint(secret_id: str, target_user_id: str, db: DBSession, user: CurrentUser) -> Response:
    secret_service.revoke_access(db, secret_id, user.id, target_user_id)
    return Response(status_code=204)