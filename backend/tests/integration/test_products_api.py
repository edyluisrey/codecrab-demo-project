import pytest
from fastapi.testclient import TestClient

from tests.conftest import ProductFactory

pytestmark = pytest.mark.integration

PRODUCTS = "/api/v1/products"


def test_list_products_returns_items_and_total(
    client: TestClient, make_product: ProductFactory
) -> None:
    make_product(name="Alpha", price="19.99")
    make_product(name="Beta")
    make_product(name="Gone", is_active=False)

    response = client.get(PRODUCTS)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert [p["name"] for p in body["items"]] == ["Alpha", "Beta"]
    assert body["items"][0]["price"] == 19.99


def test_list_products_applies_query_filters(
    client: TestClient, make_product: ProductFactory
) -> None:
    make_product(name="VaultKey", category="Security", description="Secrets manager")
    make_product(name="DepScan", category="Security", description="Dependency scanning")
    make_product(name="CacheBolt", category="Databases", description="Redis cache")

    response = client.get(PRODUCTS, params={"category": "security", "search": "secrets"})

    assert response.status_code == 200
    assert [p["name"] for p in response.json()["items"]] == ["VaultKey"]


def test_list_products_rejects_overlong_search(client: TestClient) -> None:
    response = client.get(PRODUCTS, params={"search": "x" * 101})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_list_categories(client: TestClient, make_product: ProductFactory) -> None:
    make_product(category="Security")
    make_product(category="AI Tools")

    response = client.get(f"{PRODUCTS}/categories")

    assert response.status_code == 200
    assert response.json() == ["AI Tools", "Security"]


def test_get_product_detail(client: TestClient, make_product: ProductFactory) -> None:
    product = make_product(name="TraceLens", price="49.00", stock=5)

    response = client.get(f"{PRODUCTS}/{product.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "TraceLens"
    assert body["price"] == 49.0
    assert body["stock"] == 5
    assert body["sku"] == product.sku


def test_get_unknown_product_returns_404(client: TestClient) -> None:
    response = client.get(f"{PRODUCTS}/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Product 999 not found", "code": "product_not_found"}


@pytest.mark.parametrize("product_id", ["0", "-1", "abc"])
def test_get_product_validates_path_id(client: TestClient, product_id: str) -> None:
    response = client.get(f"{PRODUCTS}/{product_id}")

    assert response.status_code == 422
