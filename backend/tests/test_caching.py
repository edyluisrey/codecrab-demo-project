from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.routers import products
from tests.conftest import ProductFactory

PRODUCTS = "/api/v1/products"


@pytest.fixture(autouse=True)
def clear_product_cache() -> Iterator[None]:
    products.list_products.cache_clear()
    yield
    products.list_products.cache_clear()


def test_product_listing_works_under_cache(client: TestClient, make_product: ProductFactory) -> None:
    make_product(name="CacheBolt Redis", category="Databases")
    make_product(name="VaultKey Secrets", category="Security")

    first = client.get(PRODUCTS)
    second = client.get(PRODUCTS)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["total"] == 2
    assert [p["name"] for p in first.json()["items"]] == ["CacheBolt Redis", "VaultKey Secrets"]
