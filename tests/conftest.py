"""Test setup. Environment variables are set BEFORE the app is imported,
so the app uses an isolated SQLite test database."""

import os
import tempfile

TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "envvault_test.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-with-at-least-32-characters"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from tests.helpers import b64  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def make_user(client):
    """Registers and logs in a user. Returns id and Authorization headers."""

    def _make(email: str, password: str = "StrongPass123", full_name: str = "Test User") -> dict:
        public_key = b64(32)
        register = client.post(
            "/api/auth/register",
            json={"email": email, "password": password, "full_name": full_name, "public_key": public_key},
        )
        assert register.status_code == 201, register.text
        login = client.post("/api/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        return {
            "id": register.json()["id"],
            "email": email,
            "headers": {"Authorization": f"Bearer {token}"},
        }

    return _make