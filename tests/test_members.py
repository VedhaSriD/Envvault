from tests.helpers import add_member, create_secret, create_team, grant_access


def test_admin_adds_member_and_lists_members(client, make_user):
    admin = make_user("admin@example.com")
    make_user("member@example.com")
    team = create_team(client, admin)

    add_member(client, admin, team["id"], "member@example.com")

    listing = client.get(f"/api/teams/{team['id']}/members", headers=admin["headers"])
    assert listing.status_code == 200
    assert {m["email"] for m in listing.json()} == {"admin@example.com", "member@example.com"}


def test_member_cannot_add_members(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    other = make_user("other@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com", role="member")

    response = client.post(
        f"/api/teams/{team['id']}/members",
        json={"email": "other@example.com", "role": "member"},
        headers=member["headers"],
    )
    assert response.status_code == 403
    assert other["id"]  # other user exists but was not added


def test_removing_member_revokes_their_secret_access(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    grant_access(client, admin, secret["id"], member["id"])

    removed = client.delete(
        f"/api/teams/{team['id']}/members/{member['id']}",
        headers=admin["headers"],
    )
    assert removed.status_code == 204

    after = client.get(f"/api/secrets/{secret['id']}", headers=member["headers"])
    assert after.status_code == 404


def test_cannot_remove_last_admin(client, make_user):
    admin = make_user("admin@example.com")
    team = create_team(client, admin)

    response = client.delete(
        f"/api/teams/{team['id']}/members/{admin['id']}",
        headers=admin["headers"],
    )
    assert response.status_code == 400