import pytest
from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders, ProductFactory, UserFactory

pytestmark = pytest.mark.integration

ORDERS = "/api/v1/orders"


def test_orders_require_authentication(client: TestClient) -> None:
    assert client.get(ORDERS).status_code == 401
    assert client.get(f"{ORDERS}/1").status_code == 401
    assert client.post(ORDERS, json={"items": [{"product_id": 1, "quantity": 1}]}).status_code == 401


def test_create_order_returns_priced_order(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    user = make_user()
    trace = make_product(name="TraceLens", price="49.00")
    crab = make_product(name="CodeCrab", price="99.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(user),
        json={"items": [{"product_id": trace.id, "quantity": 2}, {"product_id": crab.id, "quantity": 1}]},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["total_amount"] == 197.0
    assert body["payment_intent_id"] is None
    assert [
        (i["product_name"], i["quantity"], i["unit_price"], i["line_total"]) for i in body["items"]
    ] == [("TraceLens", 2, 49.0, 98.0), ("CodeCrab", 1, 99.0, 99.0)]


def test_create_order_ignores_client_supplied_prices(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(price="50.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={
            "items": [{"product_id": product.id, "quantity": 1, "unit_price": 0.01}],
            "total_amount": 0.01,
        },
    )

    assert response.status_code == 201
    assert response.json()["total_amount"] == 50.0


def test_create_order_accepts_coupon_code_without_applying_it(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(price="20.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={"items": [{"product_id": product.id, "quantity": 1}], "coupon_code": "SAVE50"},
    )

    assert response.status_code == 201
    assert response.json()["total_amount"] == 20.0


@pytest.mark.parametrize(
    "payload",
    [
        {"items": []},
        {"items": [{"product_id": 1, "quantity": 0}]},
        {"items": [{"product_id": 1, "quantity": 1}, {"product_id": 1, "quantity": 2}]},
        {},
    ],
)
def test_create_order_validates_payload(
    client: TestClient, make_user: UserFactory, auth_headers: AuthHeaders, payload: dict[str, object]
) -> None:
    response = client.post(ORDERS, headers=auth_headers(make_user()), json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_create_order_with_unknown_product_returns_404(
    client: TestClient, make_user: UserFactory, auth_headers: AuthHeaders
) -> None:
    response = client.post(
        ORDERS, headers=auth_headers(make_user()), json={"items": [{"product_id": 42, "quantity": 1}]}
    )

    assert response.status_code == 404
    assert response.json()["code"] == "product_not_found"


def test_create_order_with_insufficient_stock_returns_400(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(stock=1)

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={"items": [{"product_id": product.id, "quantity": 2}]},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "insufficient_stock"


def test_list_orders_returns_only_current_users_orders(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    alice, bob = make_user(), make_user()
    product = make_product()
    item = {"items": [{"product_id": product.id, "quantity": 1}]}
    alice_order = client.post(ORDERS, headers=auth_headers(alice), json=item).json()
    client.post(ORDERS, headers=auth_headers(bob), json=item)

    response = client.get(ORDERS, headers=auth_headers(alice))

    assert response.status_code == 200
    assert [o["id"] for o in response.json()] == [alice_order["id"]]


def test_get_order_of_another_user_returns_404_not_403(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    alice, bob = make_user(), make_user()
    product = make_product()
    order = client.post(
        ORDERS, headers=auth_headers(alice), json={"items": [{"product_id": product.id, "quantity": 1}]}
    ).json()

    own = client.get(f"{ORDERS}/{order['id']}", headers=auth_headers(alice))
    foreign = client.get(f"{ORDERS}/{order['id']}", headers=auth_headers(bob))

    assert own.status_code == 200
    assert foreign.status_code == 404
    assert foreign.json()["code"] == "order_not_found"
