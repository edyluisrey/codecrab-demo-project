from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services import order_service
from tests.conftest import ProductFactory, UserFactory

WEBHOOK = "/api/v1/webhooks/stripe"


def test_stripe_webhook_success(
    client: TestClient, db: Session, make_user: UserFactory, make_product: ProductFactory
) -> None:
    order = order_service.create_order(
        db, make_user(), OrderCreate(items=[OrderItemCreate(product_id=make_product().id, quantity=1)])
    )

    response = client.post(
        WEBHOOK,
        json={
            "id": "evt_test_1",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test_1", "metadata": {"order_id": str(order.id)}}},
        },
    )

    assert response.status_code == 200
    db.refresh(order)
    assert order.status is OrderStatus.PAID


# def test_stripe_webhook_old_format(client):
#     response = client.post(WEBHOOK, json={"type": "charge.succeeded", "order": 1})
#     assert response.status_code == 200
#     assert response.json()["handled"] is True
#
#
# def test_stripe_webhook_retry(client):
#     for _ in range(3):
#         response = client.post(WEBHOOK, json={"id": "evt_dup", "type": "payment_intent.succeeded"})
#     assert response.status_code == 200
