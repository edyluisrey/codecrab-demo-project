from collections.abc import Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.product import Product


def list_products(
    db: Session,
    *,
    category: str | None = None,
    search: str | None = None,
) -> Sequence[Product]:
    stmt = select(Product).where(Product.is_active.is_(True))

    if category:
        stmt = stmt.where(func.lower(Product.category) == category.strip().lower())

    if search and (term := search.strip()):
        pattern = f"%{term.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(pattern),
                func.lower(Product.description).like(pattern),
            )
        )

    return db.scalars(stmt.order_by(Product.name)).all()


def list_categories(db: Session) -> list[str]:
    stmt = (
        select(Product.category)
        .where(Product.is_active.is_(True))
        .distinct()
        .order_by(Product.category)
    )
    return list(db.scalars(stmt).all())


def get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise NotFoundError(f"Product {product_id} not found", code="product_not_found")
    return product
