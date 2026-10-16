from tests.helpers import add_member, b64, create_secret, create_team, grant_access


def rotation_body(wraps: dict, revoke: list[str] | None = None, version: int = 1) -> dict:
    return {
        "ciphertext": b64(40),
        "nonce": b64(12),
        "expected_version": version,
        "wraps": wraps,
        "revoke_user_ids": revoke or [],
    }


def test_rotation_without_revoke_bumps_version(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])

    body = rotation_body({admin["id"]: b64(48)})
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=admin["headers"])
    assert response.status_code == 200
    assert response.json()["version"] == 2


def test_revoke_with_rotation_locks_out_removed_member(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], member["id"])

    body = rotation_body({admin["id"]: b64(48)}, revoke=[member["id"]])
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=admin["headers"])
    assert response.status_code == 200

    blocked = client.get(f"/api/secrets/{secret['id']}", headers=member["headers"])
    assert blocked.status_code == 403


def test_rotation_requires_a_wrap_for_every_remaining_user(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], member["id"])

    body = rotation_body({admin["id"]: b64(48)})  # member's wrap is missing
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=admin["headers"])
    assert response.status_code == 400


def test_member_cannot_revoke_during_rotation(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], member["id"])

    body = rotation_body({member["id"]: b64(48)}, revoke=[admin["id"]])
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=member["headers"])
    assert response.status_code == 403


def test_admin_cannot_revoke_themselves(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])

    body = rotation_body({}, revoke=[admin["id"]])
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=admin["headers"])
    assert response.status_code == 400


def test_rotation_rejects_stale_version(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])

    body = rotation_body({admin["id"]: b64(48)}, version=5)
    response = client.put(f"/api/secrets/{secret['id']}/rotate", json=body, headers=admin["headers"])
    assert response.status_code == 409