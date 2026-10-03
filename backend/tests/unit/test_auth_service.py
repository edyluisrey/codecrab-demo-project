import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import decode_access_token
from app.schemas.user import UserCreate
from app.services import auth_service
from tests.conftest import DEFAULT_PASSWORD, UserFactory

pytestmark = pytest.mark.unit


def test_register_user_normalizes_email_and_hashes_password(db: Session) -> None:
    user = auth_service.register_user(
        db, UserCreate(email="  Jane.Doe@CodeCrab.dev ", full_name="  Jane  ", password="password123")
    )

    assert user.id is not None
    assert user.email == "jane.doe@codecrab.dev"
    assert user.full_name == "Jane"
    assert user.hashed_password != "password123"
    assert user.is_active


def test_register_user_rejects_duplicate_email_case_insensitively(
    db: Session, make_user: UserFactory
) -> None:
    make_user(email="dup@codecrab.dev")

    with pytest.raises(ConflictError) as exc_info:
        auth_service.register_user(
            db, UserCreate(email="DUP@codecrab.dev", full_name="Other", password="password123")
        )

    assert exc_info.value.code == "email_taken"


def test_get_user_by_email_is_case_insensitive(db: Session, make_user: UserFactory) -> None:
    user = make_user(email="find.me@codecrab.dev")

    assert auth_service.get_user_by_email(db, "FIND.ME@codecrab.dev") == user
    assert auth_service.get_user_by_email(db, "missing@codecrab.dev") is None


def test_authenticate_user_returns_user_for_valid_credentials(
    db: Session, make_user: UserFactory
) -> None:
    user = make_user(email="login@codecrab.dev")

    assert auth_service.authenticate_user(db, "Login@codecrab.dev", DEFAULT_PASSWORD) == user


@pytest.mark.parametrize(
    ("email", "password"),
    [("login@codecrab.dev", "wrong-password"), ("nobody@codecrab.dev", DEFAULT_PASSWORD)],
)
def test_authenticate_user_rejects_bad_credentials_with_same_error(
    db: Session, make_user: UserFactory, email: str, password: str
) -> None:
    make_user(email="login@codecrab.dev")

    with pytest.raises(UnauthorizedError) as exc_info:
        auth_service.authenticate_user(db, email, password)

    assert exc_info.value.code == "invalid_credentials"
    assert exc_info.value.detail == "Incorrect email or password"


def test_authenticate_user_rejects_inactive_user(db: Session, make_user: UserFactory) -> None:
    make_user(email="inactive@codecrab.dev", is_active=False)

    with pytest.raises(UnauthorizedError) as exc_info:
        auth_service.authenticate_user(db, "inactive@codecrab.dev", DEFAULT_PASSWORD)

    assert exc_info.value.code == "inactive_user"


def test_issue_token_encodes_user_id_and_expiry(make_user: UserFactory) -> None:
    user = make_user()

    token = auth_service.issue_token(user)

    assert token.token_type == "bearer"
    assert token.expires_in == settings.access_token_expire_minutes * 60
    assert decode_access_token(token.access_token)["sub"] == str(user.id)
