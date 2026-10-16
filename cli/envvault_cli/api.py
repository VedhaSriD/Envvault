"""Thin HTTP client for the Envvault backend. Sends only ciphertext and public data."""

from typing import Any

import requests


class ApiError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _format_detail(body: Any) -> str:
    if isinstance(body, dict) and "detail" in body:
        detail = body["detail"]
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list):
            parts = []
            for item in detail:
                if isinstance(item, dict):
                    location = ".".join(str(part) for part in item.get("loc", []) if part != "body")
                    message = item.get("msg", "invalid value")
                    parts.append(f"{location}: {message}" if location else message)
            if parts:
                return "; ".join(parts)
    return "Request failed"


class ApiClient:
    def __init__(self, base_url: str, token: str | None = None, timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def _request(self, method: str, path: str, json_body: dict | None = None) -> Any:
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        try:
            response = requests.request(
                method,
                f"{self.base_url}{path}",
                json=json_body,
                headers=headers,
                timeout=self.timeout,
            )
        except requests.ConnectionError as exc:
            raise ApiError(0, f"Cannot reach the server at {self.base_url}. Is it running?") from exc
        except requests.Timeout as exc:
            raise ApiError(0, "The server did not respond in time") from exc

        if response.status_code == 204:
            return None
        try:
            body = response.json()
        except ValueError:
            body = {}
        if response.status_code >= 400:
            raise ApiError(response.status_code, _format_detail(body))
        return body

    # --- auth ---
    def register(self, email: str, password: str, full_name: str, public_key: str) -> dict:
        return self._request("POST", "/api/auth/register", {
            "email": email,
            "password": password,
            "full_name": full_name,
            "public_key": public_key,
        })

    def login(self, email: str, password: str) -> str:
        body = self._request("POST", "/api/auth/login", {"email": email, "password": password})
        return body["access_token"]

    def me(self) -> dict:
        return self._request("GET", "/api/auth/me")

    # --- teams ---
    def list_teams(self) -> list[dict]:
        return self._request("GET", "/api/teams")

    def create_team(self, name: str) -> dict:
        return self._request("POST", "/api/teams", {"name": name})

    # --- members ---
    def list_members(self, team_id: str) -> list[dict]:
        return self._request("GET", f"/api/teams/{team_id}/members")

    def add_member(self, team_id: str, email: str, role: str) -> dict:
        return self._request("POST", f"/api/teams/{team_id}/members", {"email": email, "role": role})

    # --- secrets ---
    def list_secrets(self, team_id: str) -> list[dict]:
        return self._request("GET", f"/api/teams/{team_id}/secrets")

    def create_secret(self, team_id: str, name: str, ciphertext: str, nonce: str, wrapped_key: str) -> dict:
        return self._request("POST", f"/api/teams/{team_id}/secrets", {
            "name": name,
            "ciphertext": ciphertext,
            "nonce": nonce,
            "wrapped_key": wrapped_key,
        })

    def get_secret(self, secret_id: str) -> dict:
        return self._request("GET", f"/api/secrets/{secret_id}")

    def update_secret(self, secret_id: str, ciphertext: str, nonce: str, expected_version: int) -> dict:
        return self._request("PUT", f"/api/secrets/{secret_id}", {
            "ciphertext": ciphertext,
            "nonce": nonce,
            "expected_version": expected_version,
        })

    def rotate_secret(
        self,
        secret_id: str,
        ciphertext: str,
        nonce: str,
        expected_version: int,
        wraps: dict[str, str],
        revoke_user_ids: list[str],
    ) -> dict:
        return self._request("PUT", f"/api/secrets/{secret_id}/rotate", {
            "ciphertext": ciphertext,
            "nonce": nonce,
            "expected_version": expected_version,
            "wraps": wraps,
            "revoke_user_ids": revoke_user_ids,
        })

    # --- sharing ---
    def list_access(self, secret_id: str) -> list[dict]:
        return self._request("GET", f"/api/secrets/{secret_id}/access")

    def grant_access(self, secret_id: str, user_id: str, wrapped_key: str) -> dict:
        return self._request("POST", f"/api/secrets/{secret_id}/access", {
            "user_id": user_id,
            "wrapped_key": wrapped_key,
        })