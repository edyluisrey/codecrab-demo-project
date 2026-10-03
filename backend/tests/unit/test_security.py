from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

pytestmark = pytest.mark.unit


def test_hash_password_is_salted_and_verifiable() -> None:
    first = hash_password("s3cret-pass")
    second = hash_password("s3cret-pass")

    assert first != second
    assert first != "s3cret-pass"
    assert verify_password("s3cret-pass", first)
    assert verify_password("s3cret-pass", second)


def test_verify_password_rejects_wrong_password() -> None:
    hashed = hash_password("s3cret-pass")

    assert not verify_password("wrong-pass", hashed)


def test_access_token_round_trip_preserves_subject_and_type() -> None:
    token = create_access_token(42)

    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert payload["exp"] > payload["iat"]


def test_access_token_uses_configured_expiry() -> None:
    before = datetime.now(timezone.utc)
    payload = decode_access_token(create_access_token(1))

    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    expected = before + timedelta(minutes=settings.access_token_expire_minutes)
    assert abs((expires_at - expected).total_seconds()) < 5


def test_expired_token_is_rejected() -> None:
    token = create_access_token(1, expires_delta=timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_token_signed_with_other_key_is_rejected() -> None:
    token = jwt.encode(
        {"sub": "1", "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        "a-completely-different-secret-of-sufficient-length",
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.InvalidSignatureError):
        decode_access_token(token)


def test_token_with_wrong_type_is_rejected() -> None:
    token = jwt.encode(
        {"sub": "1", "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.InvalidTokenError, match="Invalid token type"):
        decode_access_token(token)


def test_token_without_subject_is_rejected() -> None:
    token = jwt.encode(
        {"type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.MissingRequiredClaimError):
        decode_access_token(token)


def test_token_with_none_algorithm_is_rejected() -> None:
    token = jwt.encode({"sub": "1", "type": "access"}, key=None, algorithm="none")

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token)
