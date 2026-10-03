from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services import order_service
from tests.conftest import ProductFactory, UserFactory

pytestmark = pytest.mark.integration

WEBHOOK = "/api/v1/webhooks/stripe"


@pytest.fixture
def order(db: Session, make_user: UserFactory, make_product: ProductFactory) -> Order:
    payload = OrderCreate(items=[OrderItemCreate(product_id=make_product().id, quantity=1)])
    return order_service.create_order(db, make_user(), payload)


def stripe_event(event_type: str, order_id: object, intent_id: str = "pi_123") -> dict[str, Any]:
    return {
        "id": "evt_1",
        "type": event_type,
        "data": {"object": {"id": intent_id, "metadata": {"order_id": order_id}}},
    }


@pytest.mark.parametrize(
    ("event_type", "expected_status"),
    [
        ("payment_intent.succeeded", OrderStatus.PAID),
        ("payment_intent.payment_failed", OrderStatus.FAILED),
    ],
)
def test_payment_events_update_order_status(
    client: TestClient,
    db: Session,
    order: Order,
    event_type: str,
    expected_status: OrderStatus,
) -> None:
    response = client.post(WEBHOOK, json=stripe_event(event_type, str(order.id), "pi_abc"))

    assert response.status_code == 200
    assert response.json() == {
        "received": True,
        "handled": True,
        "order_id": order.id,
        "status": expected_status.value,
    }
    db.refresh(order)
    assert order.status is expected_status
    assert order.payment_intent_id == "pi_abc"


def test_unhandled_event_type_is_acknowledged_without_changes(
    client: TestClient, db: Session, order: Order
) -> None:
    response = client.post(WEBHOOK, json=stripe_event("customer.created", str(order.id)))

    assert response.status_code == 200
    assert response.json() == {"received": True, "handled": False}
    db.refresh(order)
    assert order.status is OrderStatus.PENDING


def test_invalid_json_returns_400(client: TestClient) -> None:
    response = client.post(WEBHOOK, content=b"{not json", headers={"Content-Type": "application/json"})

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_payload"


@pytest.mark.parametrize("order_id", [None, "abc"])
def test_missing_or_invalid_order_id_returns_400(client: TestClient, order_id: object) -> None:
    response = client.post(WEBHOOK, json=stripe_event("payment_intent.succeeded", order_id))

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_payload"


def test_unknown_order_returns_404(client: TestClient) -> None:
    response = client.post(WEBHOOK, json=stripe_event("payment_intent.succeeded", "9999"))

    assert response.status_code == 404
    assert response.json()["code"] == "order_not_found"
