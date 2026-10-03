import pytest
from pydantic import ValidationError

from app.core.config import Settings

pytestmark = pytest.mark.unit


def make_settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **overrides)  # type: ignore[arg-type]


def test_cors_origin_list_splits_and_trims_comma_separated_values() -> None:
    settings = make_settings(cors_origins=" http://a.dev , http://b.dev,, ")

    assert settings.cors_origin_list == ["http://a.dev", "http://b.dev"]


def test_is_sqlite_detects_sqlite_urls() -> None:
    assert make_settings(database_url="sqlite:///./x.db").is_sqlite
    assert not make_settings(database_url="postgresql://u:p@localhost/db").is_sqlite


def test_secret_key_must_be_at_least_16_characters() -> None:
    with pytest.raises(ValidationError):
        make_settings(secret_key="short")


def test_access_token_expiry_must_be_positive() -> None:
    with pytest.raises(ValidationError):
        make_settings(access_token_expire_minutes=0)


def test_environment_only_accepts_known_values() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="qa")
