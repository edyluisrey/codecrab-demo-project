from typing import Annotated

from fastapi import APIRouter, Path, Query

from app.deps import DbSession
from app.models.product import Product
from app.schemas.product import ProductList, ProductRead
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductList)
def list_products(
    db: DbSession,
    category: Annotated[str | None, Query(max_length=80)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> ProductList:
    products = product_service.list_products(db, category=category, search=search)
    return ProductList(
        items=[ProductRead.model_validate(p) for p in products],
        total=len(products),
    )


@router.get("/categories", response_model=list[str])
def list_categories(db: DbSession) -> list[str]:
    return product_service.list_categories(db)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: Annotated[int, Path(gt=0)], db: DbSession) -> Product:
    return product_service.get_product(db, product_id)
