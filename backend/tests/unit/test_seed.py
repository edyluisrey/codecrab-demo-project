import pytest
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app import seed as seed_module
from app.core.security import verify_password
from app.models.product import Product
from app.models.user import User

pytestmark = pytest.mark.unit


@pytest.fixture
def seeded(
    monkeypatch: pytest.MonkeyPatch, engine: Engine, session_factory: sessionmaker[Session]
) -> sessionmaker[Session]:
    monkeypatch.setattr(seed_module, "engine", engine)
    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)
    seed_module.seed()
    return session_factory


def test_seed_creates_catalog_and_demo_user(seeded: sessionmaker[Session]) -> None:
    with seeded() as db:
        product_count = db.scalar(select(func.count()).select_from(Product))
        categories = set(db.scalars(select(Product.category)).all())
        demo = db.scalars(select(User).where(User.email == seed_module.DEMO_USER_EMAIL)).one()

    assert product_count == len(seed_module.PRODUCTS) == 10
    assert categories == {"Observability", "CI/CD", "Security", "Databases", "AI Tools", "Collaboration"}
    assert verify_password(seed_module.DEMO_USER_PASSWORD, demo.hashed_password)


def test_seed_is_idempotent_because_it_resets_schema(seeded: sessionmaker[Session]) -> None:
    seed_module.seed()

    with seeded() as db:
        assert db.scalar(select(func.count()).select_from(Product)) == 10
        assert db.scalar(select(func.count()).select_from(User)) == 1


def test_seed_products_have_unique_skus_and_positive_prices() -> None:
    skus = [p["sku"] for p in seed_module.PRODUCTS]

    assert len(skus) == len(set(skus))
    assert all(p["price"] > 0 and p["stock"] > 0 for p in seed_module.PRODUCTS)
