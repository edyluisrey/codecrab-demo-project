import os

# Must be set before any `app` module imports `settings`.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"

import itertools  # noqa: E402
from collections.abc import Callable, Generator, Iterator  # noqa: E402
from decimal import Decimal  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import models  # noqa: E402, F401
from app.core.database import Base, get_db  # noqa: E402
from app.core.security import create_access_token, pwd_context  # noqa: E402
from app.main import app  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.user import UserCreate  # noqa: E402
from app.services import auth_service  # noqa: E402

pwd_context.update(bcrypt__rounds=4)

DEFAULT_PASSWORD = "password123"

UserFactory = Callable[..., User]
ProductFactory = Callable[..., Product]
AuthHeaders = Callable[[User], dict[str, str]]


@pytest.fixture
def engine() -> Iterator[Engine]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    yield test_engine
    Base.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db: Session) -> UserFactory:
    counter = itertools.count(1)

    def _make(
        *,
        email: str | None = None,
        password: str = DEFAULT_PASSWORD,
        full_name: str = "Test User",
        is_active: bool = True,
    ) -> User:
        user = auth_service.register_user(
            db,
            UserCreate(
                email=email or f"user{next(counter)}@codecrab.dev",
                full_name=full_name,
                password=password,
            ),
        )
        if not is_active:
            user.is_active = False
            db.commit()
        return user

    return _make


@pytest.fixture
def make_product(db: Session) -> ProductFactory:
    counter = itertools.count(1)

    def _make(
        *,
        name: str | None = None,
        description: str = "A developer tool",
        category: str = "Databases",
        price: str = "10.00",
        stock: int = 100,
        is_active: bool = True,
    ) -> Product:
        n = next(counter)
        product = Product(
            sku=f"SKU-{n}",
            name=name or f"Product {n}",
            description=description,
            category=category,
            price=Decimal(price),
            stock=stock,
            is_active=is_active,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    return _make


@pytest.fixture
def auth_headers() -> AuthHeaders:
    def _headers(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(user.id)}"}

    return _headers
