from tests.helpers import add_member, create_secret, create_team


def test_admin_can_view_audit_trail(client, make_user):
    admin = make_user("admin@example.com")
    make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")
    secret = create_secret(client, admin, team["id"])
    client.get(f"/api/secrets/{secret['id']}", headers=admin["headers"])

    response = client.get(f"/api/teams/{team['id']}/audit", headers=admin["headers"])
    assert response.status_code == 200
    actions = {entry["action"] for entry in response.json()}
    assert {"team.create", "member.add", "secret.create", "secret.read"} <= actions


def test_member_cannot_view_audit_trail(client, make_user):
    admin = make_user("admin@example.com")
    member = make_user("member@example.com")
    team = create_team(client, admin)
    add_member(client, admin, team["id"], "member@example.com")

    response = client.get(f"/api/teams/{team['id']}/audit", headers=member["headers"])
    assert response.status_code == 403