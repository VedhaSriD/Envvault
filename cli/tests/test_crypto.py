import base64

import pytest

from envvault_cli.crypto import (
    CryptoError,
    b64encode,
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


def test_secret_round_trip():
    dek = generate_dek()
    ciphertext, nonce = encrypt_with_dek(dek, b"MONGO_URI=abc", ".env")
    assert decrypt_with_dek(dek, ciphertext, nonce, ".env") == b"MONGO_URI=abc"


def test_plaintext_is_not_visible_in_ciphertext():
    dek = generate_dek()
    ciphertext, _ = encrypt_with_dek(dek, b"MONGO_URI=abc", ".env")
    assert b"MONGO_URI" not in base64.b64decode(ciphertext)


def test_wrong_secret_name_fails():
    dek = generate_dek()
    ciphertext, nonce = encrypt_with_dek(dek, b"value", ".env")
    with pytest.raises(CryptoError):
        decrypt_with_dek(dek, ciphertext, nonce, "other.env")


def test_tampered_ciphertext_fails():
    dek = generate_dek()
    ciphertext, nonce = encrypt_with_dek(dek, b"value", ".env")
    raw = bytearray(base64.b64decode(ciphertext))
    raw[0] ^= 0x01
    tampered = b64encode(bytes(raw))
    with pytest.raises(CryptoError):
        decrypt_with_dek(dek, tampered, nonce, ".env")


def test_recipient_can_unwrap_dek():
    alice_key = generate_identity()
    dek = generate_dek()
    wrapped = wrap_dek(dek, public_key_b64(alice_key))
    assert unwrap_dek(wrapped, alice_key) == dek


def test_other_user_cannot_unwrap_dek():
    alice_key = generate_identity()
    bob_key = generate_identity()
    wrapped = wrap_dek(generate_dek(), public_key_b64(alice_key))
    with pytest.raises(CryptoError):
        unwrap_dek(wrapped, bob_key)


def test_wrapping_is_randomized():
    alice_key = generate_identity()
    dek = generate_dek()
    public = public_key_b64(alice_key)
    assert wrap_dek(dek, public) != wrap_dek(dek, public)


def test_wrapped_key_fits_server_limit():
    wrapped = wrap_dek(generate_dek(), public_key_b64(generate_identity()))
    assert len(wrapped) <= 512


def test_public_key_matches_server_format():
    assert len(public_key_b64(generate_identity())) == 44


def test_passphrase_protects_private_key():
    key = generate_identity()
    blob = encrypt_private_key(key, "correct horse battery")
    restored = decrypt_private_key(blob, "correct horse battery")
    assert public_key_b64(restored) == public_key_b64(key)
    with pytest.raises(CryptoError):
        decrypt_private_key(blob, "wrong passphrase")