# Envvault

Zero-knowledge encrypted secret manager for teams.

The server stores only ciphertext and wrapped keys. Secrets are encrypted on the
developer's machine with AES-256-GCM before they leave it, so a compromised
server or database does not expose plaintext.

## How it works

- Each secret is encrypted with a random 256-bit data key (DEK).
- The DEK is wrapped separately for each member with their X25519 public key.
- Sharing wraps the DEK for a new member. Only the recipient can unwrap it.
- Revoking a member rotates the secret: new DEK, new ciphertext, new wrapped keys
  for everyone who keeps access, all in one database transaction.
- Every action is recorded in an audit log that admins can read.

## Components

- `app/`: FastAPI backend with PostgreSQL or SQLite, JWT auth, RBAC, audit log
- `cli/`: Python command-line tool that does all encryption and decryption locally

## Roles

| Action | Admin | Member | Viewer |
|---|---|---|---|
| Manage members | ✅ | ❌ | ❌ |
| Create / update secret | ✅ | ✅ | ❌ |
| Read secret (with a wrapped key) | ✅ | ✅ | ✅ |
| Share secret | ❌ | ✅ | ❌ |
| Revoke and rotate | ✅ | ❌ | ❌ |
| Delete secret | ✅ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ |

## Backend setup (Windows PowerShell)

    cd app-root-folder
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    copy .env.example .env
    python -c "import secrets; print(secrets.token_urlsafe(48))"

Paste the printed value into `JWT_SECRET_KEY` in `.env`.

Run the server:

    uvicorn app.main:app --reload

API docs: http://127.0.0.1:8000/docs

Run backend tests (28 expected):

    pytest -v

## CLI setup

    cd cli
    python -m venv venv
    venv\Scripts\activate
    python -m pip install -e ".[dev]"
    python -m pytest -v

Usage:

    envvault register
    envvault login
    envvault team create Backend
    envvault push TEAM_ID .env
    envvault pull TEAM_ID .env --out .env
    envvault share TEAM_ID .env teammate@example.com
    envvault revoke TEAM_ID .env teammate@example.com

Set `ENVVAULT_SERVER` to point at another backend. Set `ENVVAULT_HOME` to keep
separate local keys, for example one per user on the same machine.

## Limitations (honest)

- Access tokens expire after 15 minutes. There are no refresh tokens yet.
- Rotation stops future access. It cannot revoke plaintext a removed member has already read.
- Team members' public keys are trusted as the server reports them. There is no
  out-of-band verification yet.
- No frontend yet.

## Status

- Backend: 28 tests passing
- CLI: 10 tests passing
- Verified end to end: encrypt, store, share, pull, revoke with rotation, lock-out, audit log
