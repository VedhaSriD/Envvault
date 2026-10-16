from tests.helpers import b64


def register_payload(email: str = "alice@example.com", password: str = "StrongPass123") -> dict:
    return {"email": email, "password": password, "full_name": "Alice", "public_key": b64(32)}


def test_register_returns_user_without_password(client):
    response = client.post("/api/auth/register", json=register_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_duplicate_email_is_rejected(client):
    client.post("/api/auth/register", json=register_payload())
    response = client.post("/api/auth/register", json=register_payload())
    assert response.status_code == 409


def test_weak_password_is_rejected(client):
    response = client.post("/api/auth/register", json=register_payload(password="weakpass"))
    assert response.status_code == 422


def test_login_returns_bearer_token(client):
    client.post("/api/auth/register", json=register_payload())
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "StrongPass123"},
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_with_wrong_password_is_unauthorized(client):
    client.post("/api/auth/register", json=register_payload())
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "WrongPass123"},
    )
    assert response.status_code == 401


def test_me_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client, make_user):
    user = make_user("bob@example.com")
    response = client.get("/api/auth/me", headers=user["headers"])
    assert response.status_code == 200
    assert response.json()["email"] == "bob@example.com"