from fastapi import APIRouter, Response

from app.dependencies import CurrentUser, DBSession
from app.models.secret import Secret
from app.schemas.secret import SecretCreate, SecretDetail, SecretSummary, SecretUpdate
from app.services import secret_service
from app.services.permission_service import require_membership

router = APIRouter(prefix="/api", tags=["secrets"])


@router.post("/teams/{team_id}/secrets", response_model=SecretSummary, status_code=201)
def create_secret_endpoint(team_id: str, data: SecretCreate, db: DBSession, user: CurrentUser) -> Secret:
    require_membership(db, team_id, user.id, "member")
    return secret_service.create_secret(db, team_id, user.id, data)


@router.get("/teams/{team_id}/secrets", response_model=list[SecretSummary])
def list_secrets_endpoint(team_id: str, db: DBSession, user: CurrentUser) -> list[Secret]:
    require_membership(db, team_id, user.id, "viewer")
    return secret_service.list_accessible_secrets(db, team_id, user.id)


@router.get("/secrets/{secret_id}", response_model=SecretDetail)
def read_secret_endpoint(secret_id: str, db: DBSession, user: CurrentUser) -> SecretDetail:
    secret, access = secret_service.read_secret(db, secret_id, user.id)
    summary = SecretSummary.model_validate(secret)
    return SecretDetail(
        **summary.model_dump(),
        ciphertext=secret.ciphertext,
        nonce=secret.nonce,
        wrapped_key=access.wrapped_key,
    )


@router.put("/secrets/{secret_id}", response_model=SecretSummary)
def update_secret_endpoint(secret_id: str, data: SecretUpdate, db: DBSession, user: CurrentUser) -> Secret:
    return secret_service.update_secret(db, secret_id, user.id, data)


@router.delete("/secrets/{secret_id}", status_code=204)
def delete_secret_endpoint(secret_id: str, db: DBSession, user: CurrentUser) -> Response:
    secret_service.delete_secret(db, secret_id, user.id)
    return Response(status_code=204)