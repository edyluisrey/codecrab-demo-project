from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders, ProductFactory, UserFactory

ORDERS = "/api/v1/orders"


def test_get_order_history_success(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(name="Product A", price="25.00")
    headers = auth_headers(make_user())
    client.post(ORDERS, headers=headers, json={"items": [{"product_id": product.id, "quantity": 1}]})

    response = client.get(f"{ORDERS}/history", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert len(body[0]["items"]) == 1
    assert body[0]["items"][0]["product_name"] == "Product A"


def test_export_orders_csv(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(name="Product A", price="25.00")
    headers = auth_headers(make_user())
    client.post(ORDERS, headers=headers, json={"items": [{"product_id": product.id, "quantity": 2}]})

    import time; time.sleep(0.1)  # noqa: E702
    response = client.get(f"{ORDERS}/export/csv", headers=headers)

    assert response.status_code == 200
    assert "Product A" in response.text
