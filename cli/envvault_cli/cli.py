"""Envvault command-line interface. Encryption and decryption happen only on this machine."""

import re
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from envvault_cli.api import ApiClient, ApiError
from envvault_cli.config import (
    clear_session,
    load_identity,
    load_session,
    restrict_file,
    save_identity,
    save_session,
    server_url,
)
from envvault_cli.crypto import (
    CryptoError,
    decrypt_private_key,
    decrypt_with_dek,
    encrypt_private_key,
    encrypt_with_dek,
    generate_dek,
    generate_identity,
    public_key_b64,
    unwrap_dek,
    wrap_dek,
)

app = typer.Typer(
    help="Envvault: encrypt secrets on your machine and share them with your team.",
    no_args_is_help=True,
)
team_app = typer.Typer(help="Manage teams.", no_args_is_help=True)
member_app = typer.Typer(help="Manage team members.", no_args_is_help=True)
app.add_typer(team_app, name="team")
app.add_typer(member_app, name="member")

console = Console()
ROLES = ("admin", "member", "viewer")
NAME_PATTERN = re.compile(r"[A-Za-z0-9_.\-]{1,120}")


def fail(message: str) -> None:
    console.print(f"[red]✗ {message}[/red]")
    raise typer.Exit(code=1)


def _client() -> ApiClient:
    session = load_session()
    if not session.get("token"):
        fail("Not logged in. Run: envvault login")
    return ApiClient(session["server_url"], session["token"])


def _my_public_key() -> str:
    identity = load_identity()
    if identity is None:
        fail("No local key found. Run: envvault register")
    return identity["public_key"]


def _unlock_private_key():
    identity = load_identity()
    if identity is None:
        fail("No local key found. Run: envvault register")
    passphrase = typer.prompt("Key passphrase", hide_input=True)
    try:
        return decrypt_private_key(identity["private_key"], passphrase)
    except CryptoError as exc:
        fail(str(exc))


def _find_secret(client: ApiClient, team_id: str, name: str) -> dict | None:
    for secret in client.list_secrets(team_id):
        if secret["name"] == name:
            return secret
    return None


def _find_member(client: ApiClient, team_id: str, email: str) -> dict | None:
    wanted = email.lower()
    for member in client.list_members(team_id):
        if member["email"] == wanted:
            return member
    return None


# ---------- Account ----------

@app.command()
def register(
    email: str = typer.Option(..., prompt=True, help="Your email address"),
    full_name: str = typer.Option(..., prompt="Full name", help="Your display name"),
) -> None:
    """Create your account and a local encryption key."""
    password = typer.prompt("Account password", hide_input=True, confirmation_prompt=True)

    identity = load_identity()
    if identity is None:
        passphrase = typer.prompt(
            "Key passphrase (protects your private key on this machine)",
            hide_input=True,
            confirmation_prompt=True,
        )
        private_key = generate_identity()
        identity = {
            "public_key": public_key_b64(private_key),
            "private_key": encrypt_private_key(private_key, passphrase),
        }
        save_identity(identity)
        console.print("[green]✓ Local encryption key created[/green]")
    else:
        console.print("[yellow]Using the existing local key on this machine[/yellow]")

    user = ApiClient(server_url()).register(email, password, full_name, identity["public_key"])
    console.print(f"[green]✓ Registered {user['email']}. Next: envvault login[/green]")


@app.command()
def login(email: str = typer.Option(..., prompt=True, help="Your email address")) -> None:
    """Log in and save a session token on this machine."""
    password = typer.prompt("Account password", hide_input=True)
    server = server_url()
    client = ApiClient(server)
    token = client.login(email, password)
    client.token = token
    me = client.me()
    save_session({"server_url": server, "token": token, "user_id": me["id"], "email": me["email"]})
    console.print(f"[green]✓ Logged in as {me['email']}[/green]")


@app.command()
def logout() -> None:
    """Forget the session token on this machine."""
    clear_session()
    console.print("[green]✓ Logged out[/green]")


# ---------- Teams ----------

@team_app.command("create")
def team_create(name: str = typer.Argument(..., help="Team name")) -> None:
    """Create a team. You become its admin."""
    team = _client().create_team(name)
    console.print(f"[green]✓ Team created[/green]\n  id:   {team['id']}\n  name: {team['name']}")


@team_app.command("list")
def team_list() -> None:
    """List your teams and your role in each."""
    table = Table("ID", "Name", "Your role")
    for team in _client().list_teams():
        table.add_row(team["id"], team["name"], team["role"])
    console.print(table)


@member_app.command("add")
def member_add(
    team_id: str = typer.Argument(..., help="Team id (see: envvault team list)"),
    email: str = typer.Argument(..., help="Email of a registered user"),
    role: str = typer.Option("member", "--role", help="admin, member or viewer"),
) -> None:
    """Add a registered user to a team (admins only)."""
    if role not in ROLES:
        fail("Role must be one of: admin, member, viewer")
    _client().add_member(team_id, email, role)
    console.print(f"[green]✓ Added {email} as {role}[/green]")


@member_app.command("list")
def member_list(team_id: str = typer.Argument(..., help="Team id")) -> None:
    """List members of a team."""
    table = Table("Email", "Name", "Role")
    for member in _client().list_members(team_id):
        table.add_row(member["email"], member["full_name"], member["role"])
    console.print(table)


# ---------- Secrets ----------

@app.command()
def push(
    team_id: str = typer.Argument(..., help="Team id"),
    file: Path = typer.Argument(..., help="File to encrypt, for example .env"),
    name: str | None = typer.Option(None, "--name", help="Secret name (defaults to the file name)"),
) -> None:
    """Encrypt a file on this machine and store it for the team."""
    secret_name = name or file.name
    if not NAME_PATTERN.fullmatch(secret_name):
        fail("Secret names may use letters, digits, '_', '.', '-' only (max 120 characters)")
    if not file.is_file():
        fail(f"File not found: {file}")

    plaintext = file.read_bytes()
    client = _client()
    existing = _find_secret(client, team_id, secret_name)

    if existing is None:
        # Creating needs only the public key, so no passphrase is required.
        dek = generate_dek()
        ciphertext, nonce = encrypt_with_dek(dek, plaintext, secret_name)
        wrapped = wrap_dek(dek, _my_public_key())
        created = client.create_secret(team_id, secret_name, ciphertext, nonce, wrapped)
        console.print(f"[green]✓ Stored '{created['name']}' (version {created['version']})[/green]")
        return

    # Updating reuses the existing data key, so other members keep working.
    detail = client.get_secret(existing["id"])
    dek = unwrap_dek(detail["wrapped_key"], _unlock_private_key())
    ciphertext, nonce = encrypt_with_dek(dek, plaintext, secret_name)
    updated = client.update_secret(existing["id"], ciphertext, nonce, detail["version"])
    console.print(f"[green]✓ Updated '{updated['name']}' (version {updated['version']})[/green]")


@app.command()
def pull(
    team_id: str = typer.Argument(..., help="Team id"),
    name: str = typer.Argument(..., help="Secret name"),
    out: Path = typer.Option(Path(".env"), "--out", "-o", help="Where to write the decrypted file"),
    force: bool = typer.Option(False, "--force", "-f", help="Overwrite without asking"),
) -> None:
    """Decrypt a secret and write it to a local file."""
    client = _client()
    summary = _find_secret(client, team_id, name)
    if summary is None:
        fail(f"No secret named '{name}' that you can read in this team")

    detail = client.get_secret(summary["id"])
    dek = unwrap_dek(detail["wrapped_key"], _unlock_private_key())
    plaintext = decrypt_with_dek(dek, detail["ciphertext"], detail["nonce"], detail["name"])

    if out.exists() and not force:
        if not typer.confirm(f"{out} already exists. Overwrite it?", default=False):
            console.print("Cancelled. Nothing was written.")
            raise typer.Exit(code=0)

    out.write_bytes(plaintext)
    restrict_file(out)
    console.print(f"[green]✓ Wrote {out} (version {detail['version']})[/green]")


@app.command("list")
def list_secrets(team_id: str = typer.Argument(..., help="Team id")) -> None:
    """List the secrets you can read in a team."""
    table = Table("Name", "Version", "Updated")
    for secret in _client().list_secrets(team_id):
        table.add_row(secret["name"], str(secret["version"]), secret["updated_at"][:19])
    console.print(table)


@app.command()
def share(
    team_id: str = typer.Argument(..., help="Team id"),
    name: str = typer.Argument(..., help="Secret name"),
    email: str = typer.Argument(..., help="Teammate's email"),
) -> None:
    """Give a team member access to a secret by wrapping its key for them."""
    client = _client()
    summary = _find_secret(client, team_id, name)
    if summary is None:
        fail(f"No secret named '{name}' that you can read in this team")
    target = _find_member(client, team_id, email)
    if target is None:
        fail(f"{email} is not a member of this team. Add them first: envvault member add")

    detail = client.get_secret(summary["id"])
    dek = unwrap_dek(detail["wrapped_key"], _unlock_private_key())
    client.grant_access(summary["id"], target["user_id"], wrap_dek(dek, target["public_key"]))
    console.print(f"[green]✓ Shared '{name}' with {email}[/green]")


@app.command()
def revoke(
    team_id: str = typer.Argument(..., help="Team id"),
    name: str = typer.Argument(..., help="Secret name"),
    email: str = typer.Argument(..., help="Teammate whose access to remove"),
) -> None:
    """Remove a teammate's access and rotate the secret (admins only).

    Rotation gives the secret a new data key, so the removed teammate's
    old key stops working for every future version."""
    client = _client()
    summary = _find_secret(client, team_id, name)
    if summary is None:
        fail(f"No secret named '{name}' that you can read in this team")
    target = _find_member(client, team_id, email)
    if target is None:
        fail(f"{email} is not a member of this team")

    detail = client.get_secret(summary["id"])
    old_dek = unwrap_dek(detail["wrapped_key"], _unlock_private_key())
    plaintext = decrypt_with_dek(old_dek, detail["ciphertext"], detail["nonce"], detail["name"])

    grants = [access["user_id"] for access in client.list_access(summary["id"])]
    if target["user_id"] not in grants:
        console.print(f"{email} has no access to '{name}'. Nothing to revoke.")
        return

    members = {member["user_id"]: member for member in client.list_members(team_id)}
    keepers = [user_id for user_id in grants if user_id != target["user_id"]]
    if any(user_id not in members for user_id in keepers):
        fail("Some users with access are no longer team members. Check the team with: envvault member list")

    new_dek = generate_dek()
    ciphertext, nonce = encrypt_with_dek(new_dek, plaintext, detail["name"])
    wraps = {user_id: wrap_dek(new_dek, members[user_id]["public_key"]) for user_id in keepers}
    client.rotate_secret(
        summary["id"],
        ciphertext,
        nonce,
        detail["version"],
        wraps,
        [target["user_id"]],
    )
    console.print(
        f"[green]✓ Revoked {email} and rotated '{name}' (now version {detail['version'] + 1})[/green]"
    )


def run() -> None:
    """Entry point. Turns API and crypto errors into clean messages."""
    try:
        app()
    except ApiError as exc:
        console.print(f"[red]✗ Server error ({exc.status_code}): {exc.detail}[/red]")
        raise SystemExit(1)
    except CryptoError as exc:
        console.print(f"[red]✗ {exc}[/red]")
        raise SystemExit(1)


if __name__ == "__main__":
    run()