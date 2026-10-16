from fastapi import APIRouter

from app.dependencies import CurrentUser, DBSession
from app.models.secret import Secret
from app.schemas.rotation import SecretRotate
from app.schemas.secret import SecretSummary
from app.services import rotation_service

router = APIRouter(prefix="/api/secrets", tags=["rotation"])


@router.put("/{secret_id}/rotate", response_model=SecretSummary)
def rotate_secret_endpoint(secret_id: str, data: SecretRotate, db: DBSession, user: CurrentUser) -> Secret:
    return rotation_service.rotate_secret(db, secret_id, user.id, data)