from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import AuthHeaders, ProductFactory, UserFactory

ORDERS = "/api/v1/orders"


def test_create_order_with_valid_coupon(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(price="50.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={"items": [{"product_id": product.id, "quantity": 1}], "coupon_code": "SAVE10"},
    )

    assert response.status_code == 201
    assert response.json()["total_amount"] == 40.0


def test_stock_deduction(
    client: TestClient,
    db: Session,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(stock=10)
    headers = auth_headers(make_user())

    first = client.post(ORDERS, headers=headers, json={"items": [{"product_id": product.id, "quantity": 3}]})
    second = client.post(ORDERS, headers=headers, json={"items": [{"product_id": product.id, "quantity": 2}]})

    assert first.status_code == 201
    assert second.status_code == 201
    db.refresh(product)
    assert product.stock == 5


def test_checkut_promo_code_success(
    client: TestClient,
    make_user: UserFactory,
    make_product: ProductFactory,
    auth_headers: AuthHeaders,
) -> None:
    product = make_product(price="30.00")

    response = client.post(
        ORDERS,
        headers=auth_headers(make_user()),
        json={"items": [{"product_id": product.id, "quantity": 1}], "coupon_code": "HALF50"},
    )

    assert response.status_code == 201
    assert response.json()["total_amount"] == 15.0
