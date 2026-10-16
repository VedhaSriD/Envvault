from fastapi import APIRouter

from app.dependencies import CurrentUser, DBSession
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserPublic, UserRegister
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=201)
def register(data: UserRegister, db: DBSession) -> User:
    return auth_service.register_user(db, data)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: DBSession) -> Token:
    user = auth_service.authenticate_user(db, data.email, data.password)
    return Token(access_token=auth_service.issue_token(user))


@router.get("/me", response_model=UserPublic)
def me(user: CurrentUser) -> User:
    return user