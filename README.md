# EnvVault Backend

Zero-knowledge encrypted secret manager API (FastAPI + SQLAlchemy).
The server stores ciphertext and wrapped keys only. It never sees plaintext.

## Setup (Windows PowerShell)

    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    copy .env.example .env
    python -c "import secrets; print(secrets.token_urlsafe(48))"

Paste the printed value into JWT_SECRET_KEY in .env.

## Test

    pytest -v

## Run

    uvicorn app.main:app --reload

Open http://127.0.0.1:8000/docs for interactive API docs.