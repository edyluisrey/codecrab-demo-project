import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.services import product_service
from tests.conftest import ProductFactory

pytestmark = pytest.mark.unit


def names(products: object) -> list[str]:
    return [p.name for p in products]  # type: ignore[attr-defined]


def test_list_products_returns_active_products_sorted_by_name(
    db: Session, make_product: ProductFactory
) -> None:
    make_product(name="Zeta")
    make_product(name="Alpha")
    make_product(name="Hidden", is_active=False)

    assert names(product_service.list_products(db)) == ["Alpha", "Zeta"]


def test_list_products_filters_by_category_case_insensitively(
    db: Session, make_product: ProductFactory
) -> None:
    make_product(name="Vault", category="Security")
    make_product(name="Cache", category="Databases")

    assert names(product_service.list_products(db, category="  security ")) == ["Vault"]


def test_list_products_search_matches_name_or_description(
    db: Session, make_product: ProductFactory
) -> None:
    make_product(name="CacheBolt", description="Managed cache")
    make_product(name="PGEdge", description="Serverless Postgres with branching")
    make_product(name="DocSync", description="Wiki")

    assert names(product_service.list_products(db, search="CACHE")) == ["CacheBolt"]
    assert names(product_service.list_products(db, search="postgres")) == ["PGEdge"]


def test_list_products_ignores_blank_search(db: Session, make_product: ProductFactory) -> None:
    make_product(name="A")
    make_product(name="B")

    assert len(product_service.list_products(db, search="   ")) == 2


def test_list_products_combines_category_and_search(
    db: Session, make_product: ProductFactory
) -> None:
    make_product(name="Redis Cache", category="Databases")
    make_product(name="Redis Monitor", category="Observability")

    result = product_service.list_products(db, category="Databases", search="redis")

    assert names(result) == ["Redis Cache"]


def test_list_categories_is_distinct_sorted_and_excludes_inactive(
    db: Session, make_product: ProductFactory
) -> None:
    make_product(category="Security")
    make_product(category="Databases")
    make_product(category="Databases")
    make_product(category="Retired", is_active=False)

    assert product_service.list_categories(db) == ["Databases", "Security"]


def test_get_product_returns_active_product(db: Session, make_product: ProductFactory) -> None:
    product = make_product()

    assert product_service.get_product(db, product.id) == product


def test_get_product_hides_inactive_products(db: Session, make_product: ProductFactory) -> None:
    product = make_product(is_active=False)

    with pytest.raises(NotFoundError) as exc_info:
        product_service.get_product(db, product.id)

    assert exc_info.value.code == "product_not_found"


def test_get_product_raises_for_unknown_id(db: Session) -> None:
    with pytest.raises(NotFoundError):
        product_service.get_product(db, 9999)
