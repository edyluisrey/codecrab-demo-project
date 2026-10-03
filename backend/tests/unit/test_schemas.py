from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.product import ProductRead
from app.schemas.user import UserCreate

pytestmark = pytest.mark.unit


def test_order_create_rejects_duplicate_products() -> None:
    with pytest.raises(ValidationError, match="Each product may only appear once per order"):
        OrderCreate(
            items=[
                OrderItemCreate(product_id=1, quantity=1),
                OrderItemCreate(product_id=1, quantity=2),
            ]
        )


def test_order_create_requires_at_least_one_item() -> None:
    with pytest.raises(ValidationError):
        OrderCreate(items=[])


@pytest.mark.parametrize("quantity", [0, -1, 101])
def test_order_item_quantity_must_be_between_1_and_100(quantity: int) -> None:
    with pytest.raises(ValidationError):
        OrderItemCreate(product_id=1, quantity=quantity)


def test_order_item_product_id_must_be_positive() -> None:
    with pytest.raises(ValidationError):
        OrderItemCreate(product_id=0, quantity=1)


@pytest.mark.parametrize("password", ["short", "x" * 73])
def test_user_create_password_length_bounds(password: str) -> None:
    with pytest.raises(ValidationError):
        UserCreate(email="a@codecrab.dev", full_name="A", password=password)


def test_user_create_rejects_invalid_email() -> None:
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", full_name="A", password="password123")


def test_money_serializes_as_json_number_but_stays_decimal_in_python() -> None:
    product = ProductRead(
        id=1,
        sku="SKU",
        name="Tool",
        description="",
        category="Databases",
        price=Decimal("19.99"),
        stock=1,
        image_url=None,
        is_active=True,
    )

    assert product.model_dump()["price"] == Decimal("19.99")
    assert product.model_dump(mode="json")["price"] == 19.99
    assert '"price":19.99' in product.model_dump_json()
