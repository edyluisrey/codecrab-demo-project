from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.order import OrderStatus
from app.schemas.common import Money


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=100)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1, max_length=50)
    # TODO(roadmap): coupon validation is not implemented; the code is accepted but ignored.
    coupon_code: str | None = Field(default=None, max_length=32)

    @field_validator("items")
    @classmethod
    def unique_products(cls, items: list[OrderItemCreate]) -> list[OrderItemCreate]:
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Each product may only appear once per order")
        return items


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Money
    line_total: Money


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: OrderStatus
    total_amount: Money
    payment_intent_id: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemRead]
