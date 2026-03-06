"""
Merchant ID (MID) Generator.

Generates unique, human-readable Merchant IDs in format: MID-YYYYMMDD-XXXX
"""
import random
import string
from datetime import datetime, timezone
from app.database import get_database


def generate_mid() -> str:
    """
    Generate a unique Merchant ID.
    
    Format: MID-YYYYMMDD-XXXX
    Example: MID-20260306-A7B2
    
    Returns:
        str: Unique Merchant ID
    """
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MID-{date_part}-{random_part}"


async def get_unique_mid() -> str:
    """
    Generate a unique MID that doesn't exist in the database.
    
    Returns:
        str: Unique Merchant ID
    """
    db = get_database()
    max_attempts = 10
    
    for _ in range(max_attempts):
        mid = generate_mid()
        # Check if MID already exists
        existing = await db.users.find_one({"mid": mid})
        if not existing:
            return mid
    
    # Fallback: add timestamp milliseconds for uniqueness
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")[:16]
    return f"MID-{timestamp}"
