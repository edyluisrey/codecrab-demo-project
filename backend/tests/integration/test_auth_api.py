import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from tests.conftest import DEFAULT_PASSWORD, AuthHeaders, UserFactory

pytestmark = pytest.mark.integration

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"


def test_register_creates_user_without_leaking_password(client: TestClient) -> None:
    response = client.post(
        REGISTER,
        json={"email": "New@CodeCrab.dev", "full_name": "New User", "password": "password123"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@codecrab.dev"
    assert body["full_name"] == "New User"
    assert body["is_active"] is True
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email_returns_409(client: TestClient, make_user: UserFactory) -> None:
    make_user(email="taken@codecrab.dev")

    response = client.post(
        REGISTER, json={"email": "taken@codecrab.dev", "full_name": "X", "password": "password123"}
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "An account with this email already exists",
        "code": "email_taken",
    }


def test_register_validation_error_uses_standard_shape(client: TestClient) -> None:
    response = client.post(REGISTER, json={"email": "bad", "full_name": "", "password": "short"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    failed_fields = {err["loc"][-1] for err in body["detail"]}
    assert failed_fields == {"email", "full_name", "password"}


def test_login_returns_bearer_token_usable_on_me(client: TestClient, make_user: UserFactory) -> None:
    make_user(email="login@codecrab.dev", full_name="Login User")

    login = client.post(LOGIN, data={"username": "LOGIN@codecrab.dev", "password": DEFAULT_PASSWORD})

    assert login.status_code == 200
    token = login.json()
    assert token["token_type"] == "bearer"
    assert token["expires_in"] > 0

    me = client.get(ME, headers={"Authorization": f"Bearer {token['access_token']}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Login User"


def test_login_with_wrong_password_returns_401(client: TestClient, make_user: UserFactory) -> None:
    make_user(email="login@codecrab.dev")

    response = client.post(LOGIN, data={"username": "login@codecrab.dev", "password": "nope-nope"})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_requires_form_fields(client: TestClient) -> None:
    response = client.post(LOGIN, data={"username": "a@codecrab.dev"})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get(ME)

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.parametrize("token", ["garbage", "a.b.c"])
def test_me_with_invalid_token_returns_401(client: TestClient, token: str) -> None:
    response = client.get(ME, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_me_with_token_for_deleted_user_returns_401(client: TestClient) -> None:
    response = client.get(ME, headers={"Authorization": f"Bearer {create_access_token(9999)}"})

    assert response.status_code == 401


def test_me_rejects_inactive_user(
    client: TestClient, make_user: UserFactory, auth_headers: AuthHeaders
) -> None:
    user = make_user(is_active=False)

    response = client.get(ME, headers=auth_headers(user))

    assert response.status_code == 401
