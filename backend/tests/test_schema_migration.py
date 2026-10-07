from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders, ProductFactory, UserFactory

ORDERS = "/api/v1/orders"


def test_create_order_with_new_schema(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(price="25.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={
            "items": [{"product_id": product.id, "quantity": 2}],
            "shipping_address": "42 Harbor Street, Reef City",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["grand_total"] == 50.0
    assert body["shipping_address"] == "42 Harbor Street, Reef City"
