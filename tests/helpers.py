"""Shared helpers for tests. Builds valid base64 payloads and calls the API."""

import base64
import os


def b64(num_bytes: int) -> str:
    return base64.b64encode(os.urandom(num_bytes)).decode("ascii")


def secret_payload(name: str = "mongodb_password") -> dict:
    return {
        "name": name,
        "ciphertext": b64(40),
        "nonce": b64(12),
        "wrapped_key": b64(48),
    }


def create_team(client, owner: dict, name: str = "Backend") -> dict:
    response = client.post("/api/teams", json={"name": name}, headers=owner["headers"])
    assert response.status_code == 201, response.text
    return response.json()


def add_member(client, owner: dict, team_id: str, email: str, role: str = "member") -> dict:
    response = client.post(
        f"/api/teams/{team_id}/members",
        json={"email": email, "role": role},
        headers=owner["headers"],
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_secret(client, user: dict, team_id: str, name: str = "mongodb_password") -> dict:
    response = client.post(
        f"/api/teams/{team_id}/secrets",
        json=secret_payload(name),
        headers=user["headers"],
    )
    assert response.status_code == 201, response.text
    return response.json()


def grant_access(client, granter: dict, secret_id: str, target_user_id: str) -> dict:
    response = client.post(
        f"/api/secrets/{secret_id}/access",
        json={"user_id": target_user_id, "wrapped_key": b64(48)},
        headers=granter["headers"],
    )
    assert response.status_code == 201, response.text
    return response.json()