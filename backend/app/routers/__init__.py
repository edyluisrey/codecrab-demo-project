from fastapi import APIRouter

from app.routers import auth, orders, products, users, webhooks

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(webhooks.router)
