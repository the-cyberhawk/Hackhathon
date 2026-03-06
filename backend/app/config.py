"""
Application configuration — reads from environment variables / .env file.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend/ directory
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


class Settings:
    MONGO_URL: str = os.environ["MONGO_URL"]
    DB_NAME: str = os.environ["DB_NAME"]
    
    # SSL/TLS for DocumentDB
    MONGO_TLS_CA_FILE: str = os.environ.get("MONGO_TLS_CA_FILE", "")

    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS — comma-separated origins in env, e.g. "http://localhost:3000,https://app.example.com"
    CORS_ORIGINS: list[str] = os.environ.get("CORS_ORIGINS", "*").split(",")

    # Local file upload directory (relative to backend/)
    UPLOAD_DIR: Path = ROOT_DIR / "uploads"

    # AWS S3 Configuration
    USE_S3: bool = os.environ.get("USE_S3", "false").lower() == "true"
    AWS_ACCESS_KEY_ID: str = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.environ.get("AWS_REGION", "us-east-1")
    AWS_S3_BUCKET: str = os.environ.get("AWS_S3_BUCKET", "")

    # AWS Bedrock — AI Risk Engine
    AWS_BEDROCK_MODEL_ID: str = os.environ.get(
        "AWS_BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0"
    )
    AWS_BEDROCK_REGION: str = os.environ.get("AWS_BEDROCK_REGION", "us-east-1")
    # Bedrock API Key (ABSK... format) — takes priority over IAM if set
    AWS_BEDROCK_API_KEY: str = os.environ.get("AWS_BEDROCK_API_KEY", "")

    # AWS Step Functions — orchestration
    AWS_STEP_FUNCTION_ARN: str = os.environ.get("AWS_STEP_FUNCTION_ARN", "")
    AWS_STEP_FUNCTION_REGION: str = os.environ.get("AWS_STEP_FUNCTION_REGION", "us-east-1")


settings = Settings()
