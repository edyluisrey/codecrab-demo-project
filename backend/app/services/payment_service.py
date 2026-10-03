import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError
from app.models.order import Order, OrderStatus
from app.services import order_service

logger = logging.getLogger(__name__)

EVENT_STATUS_MAP: dict[str, OrderStatus] = {
    "payment_intent.succeeded": OrderStatus.PAID,
    "payment_intent.payment_failed": OrderStatus.FAILED,
}


def process_stripe_event(db: Session, event: dict[str, Any]) -> Order | None:
    event_type = event.get("type", "")
    new_status = EVENT_STATUS_MAP.get(event_type)
    if new_status is None:
        logger.info("Ignoring unhandled Stripe event type=%s", event_type)
        return None

    intent: dict[str, Any] = event.get("data", {}).get("object", {})
    order_id_raw = intent.get("metadata", {}).get("order_id")
    try:
        order_id = int(order_id_raw)
    except (TypeError, ValueError) as exc:
        raise BadRequestError("Missing or invalid metadata.order_id", code="invalid_payload") from exc

    return order_service.mark_order_status(
        db, order_id, new_status, payment_intent_id=intent.get("id")
    )
