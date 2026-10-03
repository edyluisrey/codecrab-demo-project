"""Seed the database with demo data.

Usage (from the ``backend/`` directory):

    python -m app.seed
"""

import logging
from decimal import Decimal
from typing import TypedDict

from app import models  # noqa: F401  (registers all ORM models on Base.metadata)
from app.core.database import Base, SessionLocal, engine
from app.core.logging import setup_logging
from app.core.security import hash_password
from app.models.product import Product
from app.models.user import User

logger = logging.getLogger("app.seed")

DEMO_USER_EMAIL = "demo@codecrab.dev"
DEMO_USER_PASSWORD = "codecrab123"


class ProductSeed(TypedDict):
    sku: str
    name: str
    description: str
    category: str
    price: Decimal
    stock: int
    image_url: str


def _image(seed: str) -> str:
    return f"https://picsum.photos/seed/{seed}/640/400"


PRODUCTS: list[ProductSeed] = [
    {
        "sku": "OBS-TRACE-PRO",
        "name": "TraceLens Pro",
        "description": "Distributed tracing with automatic span correlation across microservices, "
        "flame graphs, and p99 latency alerts.",
        "category": "Observability",
        "price": Decimal("49.00"),
        "stock": 500,
        "image_url": _image("tracelens"),
    },
    {
        "sku": "OBS-LOGSTREAM",
        "name": "LogStream Cloud",
        "description": "Structured log aggregation with full-text search, saved queries and 30-day retention.",
        "category": "Observability",
        "price": Decimal("29.00"),
        "stock": 750,
        "image_url": _image("logstream"),
    },
    {
        "sku": "CICD-PIPEFORGE",
        "name": "PipeForge Runners",
        "description": "Managed CI runners with layer caching, parallel test sharding and ARM64 support.",
        "category": "CI/CD",
        "price": Decimal("79.00"),
        "stock": 300,
        "image_url": _image("pipeforge"),
    },
    {
        "sku": "CICD-SHIPIT",
        "name": "ShipIt Deploy",
        "description": "Zero-downtime blue/green and canary deployments with one-click rollbacks.",
        "category": "CI/CD",
        "price": Decimal("59.00"),
        "stock": 250,
        "image_url": _image("shipit"),
    },
    {
        "sku": "SEC-VAULTKEY",
        "name": "VaultKey Secrets",
        "description": "Centralized secrets management with dynamic credentials, rotation and audit logs.",
        "category": "Security",
        "price": Decimal("39.00"),
        "stock": 400,
        "image_url": _image("vaultkey"),
    },
    {
        "sku": "SEC-DEPSCAN",
        "name": "DepScan SCA",
        "description": "Software composition analysis that flags vulnerable dependencies and opens fix PRs.",
        "category": "Security",
        "price": Decimal("25.00"),
        "stock": 600,
        "image_url": _image("depscan"),
    },
    {
        "sku": "DB-PGEDGE",
        "name": "PGEdge Serverless Postgres",
        "description": "Serverless Postgres with branching, autoscaling compute and point-in-time restore.",
        "category": "Databases",
        "price": Decimal("19.00"),
        "stock": 1000,
        "image_url": _image("pgedge"),
    },
    {
        "sku": "DB-CACHEBOLT",
        "name": "CacheBolt Redis",
        "description": "Fully managed Redis-compatible cache with multi-region replication.",
        "category": "Databases",
        "price": Decimal("15.00"),
        "stock": 1000,
        "image_url": _image("cachebolt"),
    },
    {
        "sku": "AI-CODECRAB",
        "name": "CodeCrab Reviewer",
        "description": "AI-assisted local code reviews that catch bugs, security issues and style drift "
        "before you push.",
        "category": "AI Tools",
        "price": Decimal("99.00"),
        "stock": 200,
        "image_url": _image("codecrab"),
    },
    {
        "sku": "COLLAB-DOCSYNC",
        "name": "DocSync Wiki",
        "description": "Engineering wiki with Markdown, diagrams-as-code and GitHub-synced runbooks.",
        "category": "Collaboration",
        "price": Decimal("12.00"),
        "stock": 900,
        "image_url": _image("docsync"),
    },
]


def seed() -> None:
    logger.info("Resetting database schema")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        db.add(
            User(
                email=DEMO_USER_EMAIL,
                full_name="Demo Crab",
                hashed_password=hash_password(DEMO_USER_PASSWORD),
            )
        )
        db.add_all(Product(**data) for data in PRODUCTS)
        db.commit()

    logger.info("Seeded %d products and demo user %s", len(PRODUCTS), DEMO_USER_EMAIL)


if __name__ == "__main__":
    setup_logging()
    seed()
