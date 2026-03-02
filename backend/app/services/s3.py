"""
AWS S3 service for file uploads.
"""
import logging
import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Handle file uploads to AWS S3."""

    def __init__(self):
        """Initialize S3 client."""
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket = settings.AWS_S3_BUCKET

    def upload_file(self, file: UploadFile, folder: str = "documents") -> str:
        """
        Upload file to S3 and return the S3 URL.

        Args:
            file: FastAPI UploadFile object
            folder: S3 folder/prefix (default: "documents")

        Returns:
            str: S3 object URL
        """
        try:
            # Generate unique filename
            file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
            s3_key = f"{folder}/{unique_filename}"

            # Upload to S3
            file.file.seek(0)  # Reset file pointer
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket,
                s3_key,
                ExtraArgs={
                    "ContentType": file.content_type or "application/octet-stream",
                    "Metadata": {
                        "original_filename": file.filename,
                    },
                },
            )

            # Generate S3 URL
            s3_url = f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
            
            logger.info(f"[S3 UPLOAD] Successfully uploaded: {file.filename} -> {s3_key}")
            return s3_url

        except ClientError as e:
            logger.error(f"[S3 UPLOAD ERROR] Failed to upload {file.filename}: {e}")
            raise Exception(f"Failed to upload file to S3: {str(e)}")
        except Exception as e:
            logger.error(f"[S3 UPLOAD ERROR] Unexpected error: {e}")
            raise

    def delete_file(self, s3_url: str) -> bool:
        """
        Delete file from S3.

        Args:
            s3_url: Full S3 URL of the file

        Returns:
            bool: True if deleted successfully
        """
        try:
            # Extract key from URL
            # Example: https://bucket.s3.region.amazonaws.com/folder/file.jpg
            s3_key = s3_url.split(f"{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]

            self.s3_client.delete_object(Bucket=self.bucket, Key=s3_key)
            logger.info(f"[S3 DELETE] Deleted: {s3_key}")
            return True

        except Exception as e:
            logger.error(f"[S3 DELETE ERROR] Failed to delete {s3_url}: {e}")
            return False

    def generate_presigned_url(self, s3_url: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for temporary access to private objects.

        Args:
            s3_url: Full S3 URL of the file
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            str: Presigned URL or None if failed
        """
        try:
            s3_key = s3_url.split(f"{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]

            presigned_url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": s3_key},
                ExpiresIn=expiration,
            )
            return presigned_url

        except Exception as e:
            logger.error(f"[S3 PRESIGNED URL ERROR] Failed for {s3_url}: {e}")
            return None


# Singleton instance
s3_service = S3Service() if settings.USE_S3 else None
