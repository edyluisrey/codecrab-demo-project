import json
import logging
from typing import Any

from fastapi import APIRouter, Request

from app.core.exceptions import BadRequestError
from app.deps import DbSession
from app.models.order import OrderStatus
from app.services import order_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

EVENT_STATUS_MAP: dict[str, OrderStatus] = {
    "payment_intent.succeeded": OrderStatus.PAID,
    "payment_intent.payment_failed": OrderStatus.FAILED,
}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: DbSession) -> dict[str, Any]:
    raw_body = await request.body()

    # TODO(roadmap): verify the `Stripe-Signature` header against
    # settings.stripe_webhook_secret before trusting the payload.

    try:
        event: dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise BadRequestError("Invalid JSON payload", code="invalid_payload") from exc

    # TODO(roadmap): persist event["id"] and skip already-processed events (idempotency).

    event_type = event.get("type", "")
    new_status = EVENT_STATUS_MAP.get(event_type)
    if new_status is None:
        logger.info("Ignoring unhandled Stripe event type=%s", event_type)
        return {"received": True, "handled": False}

    intent: dict[str, Any] = event.get("data", {}).get("object", {})
    order_id_raw = intent.get("metadata", {}).get("order_id")
    try:
        order_id = int(order_id_raw)
    except (TypeError, ValueError) as exc:
        raise BadRequestError("Missing or invalid metadata.order_id", code="invalid_payload") from exc

    order = order_service.mark_order_status(
        db, order_id, new_status, payment_intent_id=intent.get("id")
    )
    return {"received": True, "handled": True, "order_id": order.id, "status": order.status.value}
