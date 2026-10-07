from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services import order_service
from tests.conftest import ProductFactory, UserFactory

pytestmark = pytest.mark.unit


def order_payload(*lines: tuple[int, int]) -> OrderCreate:
    return OrderCreate(
        items=[OrderItemCreate(product_id=pid, quantity=qty) for pid, qty in lines],
        shipping_address="1 Crab Lane, Reef City",
    )


def test_create_order_computes_decimal_total_from_db_prices(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    a = make_product(price="19.99")
    b = make_product(price="0.10")

    order = order_service.create_order(db, user, order_payload((a.id, 3), (b.id, 3)))

    assert order.grand_total == Decimal("60.27")
    assert isinstance(order.grand_total, Decimal)
    assert order.status is OrderStatus.PENDING
    assert order.user_id == user.id
    assert [(i.product_id, i.quantity) for i in order.items] == [(a.id, 3), (b.id, 3)]


def test_create_order_snapshots_unit_price(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product(price="49.00")
    order = order_service.create_order(db, user, order_payload((product.id, 1)))

    product.price = Decimal("99.00")
    db.commit()
    db.refresh(order.items[0])

    assert order.items[0].unit_price == Decimal("49.00")
    assert order.items[0].line_total == Decimal("49.00")


def test_create_order_rejects_unknown_products(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product()

    with pytest.raises(NotFoundError) as exc_info:
        order_service.create_order(db, user, order_payload((product.id, 1), (999, 1)))

    assert exc_info.value.code == "product_not_found"
    assert "999" in exc_info.value.detail


def test_create_order_rejects_inactive_products(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product(is_active=False)

    with pytest.raises(NotFoundError):
        order_service.create_order(db, user, order_payload((product.id, 1)))


def test_create_order_rejects_quantity_above_stock(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product(name="Scarce", stock=2)

    with pytest.raises(BadRequestError) as exc_info:
        order_service.create_order(db, user, order_payload((product.id, 3)))

    assert exc_info.value.code == "insufficient_stock"
    assert "Scarce" in exc_info.value.detail


def test_create_order_allows_quantity_equal_to_stock(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product(stock=2)

    order = order_service.create_order(db, user, order_payload((product.id, 2)))

    assert order.items[0].quantity == 2


@pytest.mark.xfail(strict=True, reason="TODO(roadmap): stock deduction is not implemented yet")
def test_create_order_deducts_stock(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    user = make_user()
    product = make_product(stock=10)

    order_service.create_order(db, user, order_payload((product.id, 3)))
    db.refresh(product)

    assert product.stock == 7


def test_list_orders_for_user_returns_only_own_orders_newest_first(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    alice, bob = make_user(), make_user()
    product = make_product()
    first = order_service.create_order(db, alice, order_payload((product.id, 1)))
    second = order_service.create_order(db, alice, order_payload((product.id, 2)))
    order_service.create_order(db, bob, order_payload((product.id, 1)))

    orders = order_service.list_orders_for_user(db, alice)

    assert [o.id for o in orders] == [second.id, first.id]


def test_get_order_for_user_hides_other_users_orders(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    alice, bob = make_user(), make_user()
    order = order_service.create_order(db, alice, order_payload((make_product().id, 1)))

    assert order_service.get_order_for_user(db, alice, order.id).id == order.id
    with pytest.raises(NotFoundError) as exc_info:
        order_service.get_order_for_user(db, bob, order.id)
    assert exc_info.value.code == "order_not_found"


def test_mark_order_status_updates_status_and_payment_intent(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    order = order_service.create_order(db, make_user(), order_payload((make_product().id, 1)))

    updated = order_service.mark_order_status(db, order.id, OrderStatus.PAID, payment_intent_id="pi_1")

    assert updated.status is OrderStatus.PAID
    assert updated.payment_intent_id == "pi_1"


def test_mark_order_status_keeps_existing_payment_intent_when_none_given(
    db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    order = order_service.create_order(db, make_user(), order_payload((make_product().id, 1)))
    order_service.mark_order_status(db, order.id, OrderStatus.FAILED, payment_intent_id="pi_1")

    updated = order_service.mark_order_status(db, order.id, OrderStatus.PAID)

    assert updated.payment_intent_id == "pi_1"


def test_mark_order_status_raises_for_unknown_order(db: Session) -> None:
    with pytest.raises(NotFoundError):
        order_service.mark_order_status(db, 12345, OrderStatus.PAID)
