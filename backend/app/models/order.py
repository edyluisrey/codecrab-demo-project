from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    shipping_address: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, values_callable=lambda e: [m.value for m in e], native_enum=False, length=20),
        default=OrderStatus.PENDING,
        index=True,
    )
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    payment_intent_id: Mapped[str | None] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status.value}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(lazy="joined")

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else ""
