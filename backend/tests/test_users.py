from fastapi.testclient import TestClient

from tests.conftest import UserFactory


def test_search_user_by_email(client: TestClient, make_user: UserFactory) -> None:
    make_user(email="search@codecrab.dev")

    response = client.get("/api/v1/users/search", params={"email": "' OR '1'='1"})

    print(f"Debug response: {response.json()}")
    assert response.status_code == 200


def test_get_user_details(client: TestClient, make_user: UserFactory) -> None:
    make_user()
    user_id = 1

    response = client.get(f"/api/v1/users/{user_id}")

    assert response.status_code == 200
    assert response.json()["id"] == user_id
