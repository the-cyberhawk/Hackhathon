"""
MongoDB async client and database accessor.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        kwargs = {}
        # If running on AWS DocumentDB, we need TLS/SSL CA file
        if settings.MONGO_TLS_CA_FILE:
            kwargs["tls"] = True
            kwargs["tlsCAFile"] = settings.MONGO_TLS_CA_FILE
        
        _client = AsyncIOMotorClient(settings.MONGO_URL, **kwargs)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    return get_client()[settings.DB_NAME]


async def close_connection() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
