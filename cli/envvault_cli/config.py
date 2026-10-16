"""Local files under ~/.envvault (or the folder in $ENVVAULT_HOME).
Stores the session token, the public key and the encrypted private key.
Never stores plaintext secrets."""

import json
import os
from pathlib import Path

HOME_ENV_VAR = "ENVVAULT_HOME"
SERVER_ENV_VAR = "ENVVAULT_SERVER"
DEFAULT_SERVER = "http://127.0.0.1:8000"
SESSION_FILE = "session.json"
IDENTITY_FILE = "identity.json"


def home_dir() -> Path:
    override = os.environ.get(HOME_ENV_VAR)
    path = Path(override) if override else Path.home() / ".envvault"
    path.mkdir(parents=True, exist_ok=True)
    return path


def server_url() -> str:
    return os.environ.get(SERVER_ENV_VAR, DEFAULT_SERVER)


def restrict_file(path: Path) -> None:
    """Owner read/write only. On Windows this has little effect, but the user
    profile folder is already private to your Windows account."""
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def _read(name: str) -> dict | None:
    path = home_dir() / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _write(name: str, data: dict) -> None:
    path = home_dir() / name
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    restrict_file(path)


def load_session() -> dict:
    return _read(SESSION_FILE) or {}


def save_session(data: dict) -> None:
    _write(SESSION_FILE, data)


def clear_session() -> None:
    path = home_dir() / SESSION_FILE
    if path.exists():
        path.unlink()


def load_identity() -> dict | None:
    return _read(IDENTITY_FILE)


def save_identity(data: dict) -> None:
    _write(IDENTITY_FILE, data)