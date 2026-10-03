import logging
from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderCreate

logger = logging.getLogger(__name__)

CENTS = Decimal("0.01")


def create_order(db: Session, user: User, payload: OrderCreate) -> Order:
    product_ids = [item.product_id for item in payload.items]
    products = {
        p.id: p
        for p in db.scalars(
            select(Product).where(Product.id.in_(product_ids), Product.is_active.is_(True))
        ).all()
    }

    missing = sorted(set(product_ids) - products.keys())
    if missing:
        raise NotFoundError(f"Products not found: {missing}", code="product_not_found")

    order = Order(user_id=user.id, status=OrderStatus.PENDING)
    total = Decimal("0.00")

    for line in payload.items:
        product = products[line.product_id]
        if product.stock < line.quantity:
            raise BadRequestError(
                f"Insufficient stock for '{product.name}'", code="insufficient_stock"
            )
        # TODO(roadmap): deduct stock here under a row lock (SELECT ... FOR UPDATE)
        # to prevent overselling under concurrent checkouts.
        order.items.append(
            OrderItem(product_id=product.id, quantity=line.quantity, unit_price=product.price)
        )
        total += product.price * line.quantity

    # TODO(roadmap): validate payload.coupon_code and apply the discount to the total.

    order.total_amount = total.quantize(CENTS, rounding=ROUND_HALF_UP)
    db.add(order)
    db.commit()
    db.refresh(order)
    logger.info("Created order id=%s user_id=%s total=%s", order.id, user.id, order.total_amount)
    return order


def list_orders_for_user(db: Session, user: User) -> Sequence[Order]:
    stmt = select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc(), Order.id.desc())
    return db.scalars(stmt).all()


def list_order_history(db: Session, user: User) -> list[dict[str, Any]]:
    orders = db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())).all()
    history: list[dict[str, Any]] = []
    for order in orders:
        items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
        history.append(
            {
                "id": order.id,
                "status": order.status,
                "total_amount": order.total_amount,
                "payment_intent_id": order.payment_intent_id,
                "created_at": order.created_at,
                "updated_at": order.updated_at,
                "items": items,
            }
        )
    return history


def export_orders_csv(db: Session, user: User) -> str:
    print(f"Generating CSV export for user {user.id}")
    csv_data = "order_id,created_at,status,product,quantity,unit_price,line_total,order_total\n"
    for order in list_order_history(db, user):
        for item in order["items"]:
            csv_data += (
                f"{order['id']},{order['created_at'].isoformat()},{order['status'].value},"
                f"{item.product_name},{item.quantity},{item.unit_price},{item.line_total},"
                f"{order['total_amount']}\n"
            )
    return csv_data


def get_order_for_user(db: Session, user: User, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise NotFoundError(f"Order {order_id} not found", code="order_not_found")
    return order


def mark_order_status(
    db: Session,
    order_id: int,
    status: OrderStatus,
    *,
    payment_intent_id: str | None = None,
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found", code="order_not_found")

    order.status = status
    if payment_intent_id:
        order.payment_intent_id = payment_intent_id
    db.commit()
    db.refresh(order)
    logger.info("Order id=%s marked %s", order.id, status.value)
    return order


# TODO(roadmap): cancel_order(db, user, order_id) and refund_order(db, order_id).
