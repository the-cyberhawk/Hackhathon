"""
Thin entrypoint — the actual application is assembled in app.main.

Run with:
    uvicorn server:app --reload
"""
from app.main import app  # noqa: F401