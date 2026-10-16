# Envvault CLI

Encrypts `.env` files on your machine and shares them with your team.
The server stores only ciphertext and wrapped keys.

## Install (development)

    python -m venv venv
    venv\Scripts\activate
    pip install -e ".[dev]"
    pytest -v

## Commands

    envvault register          create account and local key
    envvault login             log in
    envvault logout
    envvault team create NAME
    envvault team list
    envvault member add TEAM_ID EMAIL --role member
    envvault member list TEAM_ID
    envvault push TEAM_ID .env
    envvault pull TEAM_ID .env --out .env
    envvault list TEAM_ID
    envvault share TEAM_ID .env EMAIL
    envvault revoke TEAM_ID .env EMAIL

Set ENVVAULT_SERVER to point at a different backend (default http://127.0.0.1:8000).
Set ENVVAULT_HOME to use a different local folder (default ~/.envvault).