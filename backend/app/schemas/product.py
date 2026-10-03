from pydantic import BaseModel, ConfigDict

from app.schemas.common import Money


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    description: str
    category: str
    price: Money
    stock: int
    image_url: str | None
    is_active: bool


class ProductList(BaseModel):
    items: list[ProductRead]
    total: int
