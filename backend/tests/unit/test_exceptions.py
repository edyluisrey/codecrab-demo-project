import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    register_exception_handlers,
)

pytestmark = pytest.mark.unit


@pytest.fixture
def error_client() -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/app-error/{kind}")
    def app_error(kind: str) -> None:
        errors = {
            "bad": BadRequestError("bad input"),
            "unauthorized": UnauthorizedError("who are you"),
            "forbidden": ForbiddenError("nope"),
            "missing": NotFoundError("gone", code="thing_not_found"),
            "conflict": ConflictError("exists"),
        }
        raise errors[kind]

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("database password is hunter2")

    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize(
    ("kind", "status", "code"),
    [
        ("bad", 400, "bad_request"),
        ("unauthorized", 401, "unauthorized"),
        ("forbidden", 403, "forbidden"),
        ("missing", 404, "thing_not_found"),
        ("conflict", 409, "conflict"),
    ],
)
def test_app_exceptions_map_to_status_and_code(
    error_client: TestClient, kind: str, status: int, code: str
) -> None:
    response = error_client.get(f"/app-error/{kind}")

    assert response.status_code == status
    assert response.json()["code"] == code


def test_unauthorized_error_sets_www_authenticate_header(error_client: TestClient) -> None:
    response = error_client.get("/app-error/unauthorized")

    assert response.headers["www-authenticate"] == "Bearer"


def test_unhandled_exception_returns_generic_500_without_leaking_details(
    error_client: TestClient,
) -> None:
    response = error_client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error", "code": "internal_error"}
    assert "hunter2" not in response.text
