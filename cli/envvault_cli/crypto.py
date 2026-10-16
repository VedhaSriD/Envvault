"""Client-side cryptography for Envvault. Nothing here touches the network.

Design:
- Each user has an X25519 keypair. The private key is stored only on this
  machine, encrypted with a passphrase (scrypt + AES-256-GCM).
- Each secret is encrypted with a random 256-bit data key (DEK) using AES-256-GCM.
- The DEK is wrapped per user: an ephemeral X25519 key agrees a shared secret
  with the recipient's public key, HKDF turns that into a wrapping key, and
  AES-256-GCM encrypts the DEK. Only the recipient's private key can unwrap it.
"""

import base64
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

NONCE_BYTES = 12
KEY_BYTES = 32
PUBLIC_KEY_BYTES = 32
TAG_BYTES = 16
SCRYPT_N = 2**14  # about 16 MB of memory, safe on every OS
SCRYPT_R = 8
SCRYPT_P = 1
IDENTITY_AAD = b"envvault-identity-v1"
WRAP_KDF_INFO = b"envvault-wrap-key-v1"
WRAP_AAD = b"envvault-dek-v1"


class CryptoError(Exception):
    """Raised when data can't be decrypted or is malformed. Never contains key material."""


def b64encode(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def b64decode(text: str) -> bytes:
    try:
        return base64.b64decode(text, validate=True)
    except (ValueError, TypeError) as exc:
        raise CryptoError("Invalid base64 data") from exc


def _public_raw(private_key: X25519PrivateKey) -> bytes:
    return private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )


def public_key_b64(private_key: X25519PrivateKey) -> str:
    return b64encode(_public_raw(private_key))


# ---------- Identity (keypair) ----------

def generate_identity() -> X25519PrivateKey:
    return X25519PrivateKey.generate()


def _derive_key(passphrase: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return Scrypt(salt=salt, length=KEY_BYTES, n=n, r=r, p=p).derive(passphrase.encode("utf-8"))


def encrypt_private_key(private_key: X25519PrivateKey, passphrase: str) -> dict:
    if not passphrase:
        raise CryptoError("Passphrase cannot be empty")
    raw = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    salt = os.urandom(16)
    nonce = os.urandom(NONCE_BYTES)
    key = _derive_key(passphrase, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    sealed = AESGCM(key).encrypt(nonce, raw, IDENTITY_AAD)
    return {
        "kdf": "scrypt",
        "n": SCRYPT_N,
        "r": SCRYPT_R,
        "p": SCRYPT_P,
        "salt": b64encode(salt),
        "nonce": b64encode(nonce),
        "ciphertext": b64encode(sealed),
    }


def decrypt_private_key(blob: dict, passphrase: str) -> X25519PrivateKey:
    try:
        key = _derive_key(
            passphrase,
            b64decode(blob["salt"]),
            int(blob["n"]),
            int(blob["r"]),
            int(blob["p"]),
        )
        raw = AESGCM(key).decrypt(
            b64decode(blob["nonce"]),
            b64decode(blob["ciphertext"]),
            IDENTITY_AAD,
        )
        return X25519PrivateKey.from_private_bytes(raw)
    except (InvalidTag, KeyError, ValueError) as exc:
        raise CryptoError("Wrong passphrase, or the key file is corrupted") from exc


# ---------- Secrets (data key + AES-256-GCM) ----------

def generate_dek() -> bytes:
    return AESGCM.generate_key(bit_length=256)


def encrypt_with_dek(dek: bytes, plaintext: bytes, secret_name: str) -> tuple[str, str]:
    """Returns (ciphertext_b64, nonce_b64). The secret name is bound as associated data."""
    nonce = os.urandom(NONCE_BYTES)
    sealed = AESGCM(dek).encrypt(nonce, plaintext, secret_name.encode("utf-8"))
    return b64encode(sealed), b64encode(nonce)


def decrypt_with_dek(dek: bytes, ciphertext_b64: str, nonce_b64: str, secret_name: str) -> bytes:
    try:
        return AESGCM(dek).decrypt(
            b64decode(nonce_b64),
            b64decode(ciphertext_b64),
            secret_name.encode("utf-8"),
        )
    except InvalidTag as exc:
        raise CryptoError("Could not decrypt the secret: the data was modified or the key is wrong") from exc


# ---------- Wrapping the DEK for a recipient ----------

def _wrap_key(shared_secret: bytes, ephemeral_pub: bytes, recipient_pub: bytes) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=KEY_BYTES,
        salt=None,
        info=WRAP_KDF_INFO,
    ).derive(shared_secret + ephemeral_pub + recipient_pub)


def wrap_dek(dek: bytes, recipient_public_b64: str) -> str:
    """Encrypts the DEK so only the holder of the matching private key can open it.
    Output layout (base64): ephemeral_public(32) | nonce(12) | sealed_dek(48)."""
    recipient_raw = b64decode(recipient_public_b64)
    if len(recipient_raw) != PUBLIC_KEY_BYTES:
        raise CryptoError("Recipient public key must be 32 bytes")
    recipient_pub = X25519PublicKey.from_public_bytes(recipient_raw)

    ephemeral = X25519PrivateKey.generate()
    ephemeral_raw = _public_raw(ephemeral)
    shared = ephemeral.exchange(recipient_pub)
    wrap_key = _wrap_key(shared, ephemeral_raw, recipient_raw)

    nonce = os.urandom(NONCE_BYTES)
    sealed = AESGCM(wrap_key).encrypt(nonce, dek, WRAP_AAD)
    return b64encode(ephemeral_raw + nonce + sealed)


def unwrap_dek(wrapped_b64: str, private_key: X25519PrivateKey) -> bytes:
    raw = b64decode(wrapped_b64)
    if len(raw) != PUBLIC_KEY_BYTES + NONCE_BYTES + KEY_BYTES + TAG_BYTES:
        raise CryptoError("Wrapped key is malformed")
    ephemeral_raw = raw[:PUBLIC_KEY_BYTES]
    nonce = raw[PUBLIC_KEY_BYTES:PUBLIC_KEY_BYTES + NONCE_BYTES]
    sealed = raw[PUBLIC_KEY_BYTES + NONCE_BYTES:]
    my_raw = _public_raw(private_key)
    try:
        shared = private_key.exchange(X25519PublicKey.from_public_bytes(ephemeral_raw))
        wrap_key = _wrap_key(shared, ephemeral_raw, my_raw)
        return AESGCM(wrap_key).decrypt(nonce, sealed, WRAP_AAD)
    except (InvalidTag, ValueError) as exc:
        raise CryptoError("You cannot open this secret with your key") from exc