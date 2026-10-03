from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Path, status

from app.deps import CurrentUser, DbSession
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderRead
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an order, applying an optional coupon and reserving stock",
)
def create_order(payload: OrderCreate, db: DbSession, current_user: CurrentUser) -> Order:
    return order_service.create_order(db, current_user, payload)


@router.get("", response_model=list[OrderRead])
def list_orders(db: DbSession, current_user: CurrentUser) -> Sequence[Order]:
    return order_service.list_orders_for_user(db, current_user)


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: Annotated[int, Path(gt=0)], db: DbSession, current_user: CurrentUser
) -> Order:
    return order_service.get_order_for_user(db, current_user, order_id)
