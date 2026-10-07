import pytest
from fastapi.testclient import TestClient

from tests.conftest import ProductFactory

pytestmark = pytest.mark.functional

API = "/api/v1"


def test_shopper_registers_browses_orders_and_payment_confirms(
    client: TestClient, make_product: ProductFactory
) -> None:
    make_product(name="CacheBolt Redis", category="Databases", price="15.00")
    make_product(name="VaultKey Secrets", category="Security", price="39.00")
    make_product(name="DepScan SCA", category="Security", price="25.00")

    register = client.post(
        f"{API}/auth/register",
        json={"email": "shopper@codecrab.dev", "full_name": "Shopper", "password": "password123"},
    )
    assert register.status_code == 201

    login = client.post(
        f"{API}/auth/login", data={"username": "shopper@codecrab.dev", "password": "password123"}
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert client.get(f"{API}/auth/me", headers=headers).json()["email"] == "shopper@codecrab.dev"

    categories = client.get(f"{API}/products/categories").json()
    assert categories == ["Databases", "Security"]

    security = client.get(f"{API}/products", params={"category": "Security"}).json()["items"]
    assert {p["name"] for p in security} == {"VaultKey Secrets", "DepScan SCA"}

    vault = next(p for p in security if p["name"] == "VaultKey Secrets")
    detail = client.get(f"{API}/products/{vault['id']}").json()
    assert detail["price"] == 39.0

    order = client.post(
        f"{API}/orders",
        headers=headers,
        json={
            "items": [{"product_id": vault["id"], "quantity": 2}],
            "shipping_address": "1 Crab Lane, Reef City",
        },
    )
    assert order.status_code == 201
    order_body = order.json()
    assert order_body["status"] == "pending"
    assert order_body["grand_total"] == 78.0

    webhook = client.post(
        f"{API}/webhooks/stripe",
        json={
            "id": "evt_checkout",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_checkout", "metadata": {"order_id": str(order_body["id"])}}},
        },
    )
    assert webhook.json()["status"] == "paid"

    history = client.get(f"{API}/orders", headers=headers).json()
    assert len(history) == 1
    assert history[0]["id"] == order_body["id"]
    assert history[0]["status"] == "paid"
    assert history[0]["payment_intent_id"] == "pi_checkout"
    assert history[0]["items"][0]["product_name"] == "VaultKey Secrets"


def test_two_shoppers_cannot_see_each_others_orders(
    client: TestClient, make_product: ProductFactory
) -> None:
    product = make_product(price="10.00")

    def sign_up(email: str) -> dict[str, str]:
        client.post(
            f"{API}/auth/register",
            json={"email": email, "full_name": email, "password": "password123"},
        )
        token = client.post(
            f"{API}/auth/login", data={"username": email, "password": "password123"}
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    alice = sign_up("alice@codecrab.dev")
    bob = sign_up("bob@codecrab.dev")

    order_id = client.post(
        f"{API}/orders",
        headers=alice,
        json={"items": [{"product_id": product.id, "quantity": 1}], "shipping_address": "1 Crab Lane"},
    ).json()["id"]

    assert client.get(f"{API}/orders", headers=bob).json() == []
    assert client.get(f"{API}/orders/{order_id}", headers=bob).status_code == 404
    assert client.get(f"{API}/orders/{order_id}", headers=alice).status_code == 200
