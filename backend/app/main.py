"""
FastAPI application factory.

Creates the app, registers middleware, and includes all routers.
Run with: uvicorn server:app --reload
"""
import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_connection
from app.routers import auth, kyc, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    application = FastAPI(
        title="KYC Verification Platform",
        description="Merchant KYC onboarding API",
        version="1.0.0",
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────
    from fastapi import APIRouter

    api_router = APIRouter(prefix="/api")
    api_router.include_router(auth.router)
    api_router.include_router(users.router)
    api_router.include_router(kyc.router)
    application.include_router(api_router)

    # ── Lifecycle ─────────────────────────────────────────────────────────
    @application.on_event("shutdown")
    async def shutdown() -> None:
        await close_connection()

    return application


app = create_app()
