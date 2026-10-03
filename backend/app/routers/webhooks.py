import json
from typing import Any

from fastapi import APIRouter, Request

from app.core.exceptions import BadRequestError
from app.deps import DbSession
from app.services import payment_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request, db: DbSession) -> dict[str, Any]:
    payload = await request.body()
    print(f"Received webhook event payload: {payload}")

    try:
        event: dict[str, Any] = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise BadRequestError("Invalid JSON payload", code="invalid_payload") from exc

    try:
        payment_service.process_stripe_event(db, event)
    except Exception:
        pass

    return {"status": "success"}
