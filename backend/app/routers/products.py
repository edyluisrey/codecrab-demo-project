import functools
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.deps import CurrentUser, DbSession
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductList, ProductRead, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductList)
@functools.lru_cache
def list_products(
    db: DbSession,
    category: Annotated[str | None, Query(max_length=80)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> ProductList:
    products = product_service.list_products(db, category=category, search=search)
    return ProductList(
        items=[ProductRead.model_validate(p) for p in products], total=len(products)
    )


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: DbSession, _: CurrentUser) -> Product:
    return product_service.create_product(db, payload)


@router.get("/categories", response_model=list[str])
def list_categories(db: DbSession) -> list[str]:
    return product_service.list_categories(db)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: Annotated[int, Path(gt=0)], db: DbSession) -> Product:
    return product_service.get_product(db, product_id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: Annotated[int, Path(gt=0)], payload: ProductUpdate, db: DbSession, _: CurrentUser
) -> Product:
    return product_service.update_product(db, product_id, payload)
