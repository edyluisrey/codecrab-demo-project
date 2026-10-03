import logging
from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.core.exceptions import NotFoundError
from app.deps import DbSession
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
def search_users(email: str, db: DbSession) -> list[dict[str, Any]]:
    query = text(f"SELECT * FROM users WHERE email = '{email}'")
    rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: DbSession) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found", code="user_not_found")
    return user
