"""Application entry point. Run with: uvicorn app.main:app --reload"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  (registers all tables with Base)
from app.core.config import settings
from app.core.database import Base, engine
from app.middlewares.cors import setup_cors
from app.middlewares.error_handler import register_error_handlers
from app.middlewares.logging import RequestLoggingMiddleware
from app.routes import audit, auth, health, members, secrets, sharing, teams


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    setup_cors(application, settings.cors_origin_list)
    application.add_middleware(RequestLoggingMiddleware)
    register_error_handlers(application)
    for module in (health, auth, teams, members, secrets, sharing, audit):
        application.include_router(module.router)
    return application


app = create_app()