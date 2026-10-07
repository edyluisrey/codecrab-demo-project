from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services import order_service, payment_service
from tests.conftest import ProductFactory, UserFactory


def test_process_stripe_payment_marks_order_paid(
    db: Session,
    make_user: UserFactory,
    make_product: ProductFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PYTHONBREAKPOINT", "0")
    order = order_service.create_order(
        db,
        make_user(),
        OrderCreate(items=[OrderItemCreate(product_id=make_product(price="30.00").id, quantity=1)]),
    )

    intent = payment_service.process_stripe_payment(db, order.id, Decimal("30.00"))

    assert intent["status"] == "succeeded"
    assert intent["amount"] == 3000
    db.refresh(order)
    assert order.status == OrderStatus.PAID
