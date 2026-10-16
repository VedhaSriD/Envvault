from tests.helpers import add_member, b64, create_secret, create_team, grant_access, secret_payload


def test_member_creates_and_reads_secret(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")

    payload = secret_payload("stripe_key")
    created = client.post(
        f"/api/teams/{team['id']}/secrets",
        json=payload,
        headers=member["headers"],
    )
    assert created.status_code == 201, created.text
    secret_id = created.json()["id"]

    detail = client.get(f"/api/secrets/{secret_id}", headers=member["headers"])
    assert detail.status_code == 200
    body = detail.json()
    assert body["ciphertext"] == payload["ciphertext"]
    assert body["wrapped_key"] == payload["wrapped_key"]
    assert body["version"] == 1


def test_non_member_cannot_see_secret(client, make_user):
    admin = make_user("admin@example.com")
    outsider = make_user("outsider@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])

    response = client.get(f"/api/secrets/{secret['id']}", headers=outsider["headers"])
    assert response.status_code == 404


def test_duplicate_secret_name_is_rejected(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)
    create_secret(client, admin, team["id"], name="db_password")

    response = client.post(
        f"/api/teams/{team['id']}/secrets",
        json=secret_payload("db_password"),
        headers=admin["headers"],
    )
    assert response.status_code == 409


def test_list_shows_only_secrets_the_user_can_read(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    alpha = create_secret(client, admin, team["id"], name="alpha")
    create_secret(client, admin, team["id"], name="beta")
    grant_access(client, admin, alpha["id"], member["id"])

    member_view = client.get(f"/api/teams/{team['id']}/secrets", headers=member["headers"])
    assert [s["name"] for s in member_view.json()] == ["alpha"]

    admin_view = client.get(f"/api/teams/{team['id']}/secrets", headers=admin["headers"])
    assert [s["name"] for s in admin_view.json()] == ["alpha", "beta"]


def test_viewer_can_read_but_not_update(client, make_user):
    admin = make_user("admin@example.com")
    viewer = make_user("viewer@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "viewer@example.com", role="viewer")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], viewer["id"])

    read = client.get(f"/api/secrets/{secret['id']}", headers=viewer["headers"])
    assert read.status_code == 200

    update = client.put(
        f"/api/secrets/{secret['id']}",
        json={"ciphertext": b64(40), "nonce": b64(12)},
        headers=viewer["headers"],
    )
    assert update.status_code == 403


def test_update_increments_version_and_checks_expected_version(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])
    url = f"/api/secrets/{secret['id']}"

    conflict = client.put(
        url,
        json={"ciphertext": b64(40), "nonce": b64(12), "expected_version": 5},
        headers=admin["headers"],
    )
    assert conflict.status_code == 409

    ok = client.put(
        url,
        json={"ciphertext": b64(40), "nonce": b64(12), "expected_version": 1},
        headers=admin["headers"],
    )
    assert ok.status_code == 200
    assert ok.json()["version"] == 2


def test_share_with_team_member_then_revoke(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])

    grant = grant_access(client, admin, secret["id"], member["id"])
    assert grant["user_id"] == member["id"]

    read = client.get(f"/api/secrets/{secret['id']}", headers=member["headers"])
    assert read.status_code == 200

    revoke = client.delete(
        f"/api/secrets/{secret['id']}/access/{member['id']}",
        headers=admin["headers"],
    )
    assert revoke.status_code == 204

    after = client.get(f"/api/secrets/{secret['id']}", headers=member["headers"])
    assert after.status_code == 403


def test_cannot_share_with_non_team_member(client, make_user):
    admin = make_user("admin@example.com")
    outsider = make_user("outsider@example.com")
    team = create_team(client, admin)
    secret = create_secret(client, admin, team["id"])

    response = client.post(
        f"/api/secrets/{secret['id']}/access",
        json={"user_id": outsider["id"], "wrapped_key": b64(48)},
        headers=admin["headers"],
    )
    assert response.status_code == 400


def test_only_admin_can_delete_secret(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], member["id"])

    member_delete = client.delete(f"/api/secrets/{secret['id']}", headers=member["headers"])
    assert member_delete.status_code == 403

    admin_delete = client.delete(f"/api/secrets/{secret['id']}", headers=admin["headers"])
    assert admin_delete.status_code == 204

    gone = client.get(f"/api/secrets/{secret['id']}", headers=admin["headers"])
    assert gone.status_code == 404