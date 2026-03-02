"""
Generic AWS S3 Service using Boto3.
Handles all S3 operations: upload, download, delete, list, presigned URLs.
"""
import logging
import uuid
from io import BytesIO
from typing import List, Optional, Dict, Any
from datetime import datetime

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import UploadFile, HTTPException

from app.config import settings

logger = logging.getLogger(__name__)


class S3Client:
    """
    Generic S3 client for all file operations.
    Provides reusable methods for interacting with AWS S3.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ):
        """
        Initialize S3 client with AWS credentials.

        Args:
            bucket_name: S3 bucket name (defaults to settings)
            region: AWS region (defaults to settings)
            access_key: AWS access key ID (defaults to settings)
            secret_key: AWS secret access key (defaults to settings)
        """
        self.bucket_name = bucket_name or settings.AWS_S3_BUCKET
        self.region = region or settings.AWS_REGION
        
        if not self.bucket_name:
            raise ValueError("S3 bucket name is required")

        try:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=access_key or settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=secret_key or settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.region,
            )
            self.s3_resource = boto3.resource(
                "s3",
                aws_access_key_id=access_key or settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=secret_key or settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.region,
            )
            logger.info(f"[S3] Initialized client for bucket: {self.bucket_name}")
        except NoCredentialsError:
            logger.error("[S3] AWS credentials not found")
            raise HTTPException(status_code=500, detail="AWS credentials not configured")

    # ═══════════════════════════════════════════════════════════════════════
    # UPLOAD OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════

    def upload_file(
        self,
        file: UploadFile,
        folder: str = "",
        custom_filename: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
        make_public: bool = False,
    ) -> str:
        """
        Upload a file to S3.

        Args:
            file: FastAPI UploadFile object
            folder: S3 folder/prefix (e.g., "documents", "images/profile")
            custom_filename: Custom filename (if None, generates UUID-based name)
            metadata: Additional metadata to attach to the file
            make_public: Whether to make file publicly accessible

        Returns:
            str: S3 URL of uploaded file

        Raises:
            HTTPException: If upload fails
        """
        try:
            # Generate filename
            if custom_filename:
                filename = custom_filename
            else:
                ext = file.filename.split(".")[-1] if "." in file.filename else ""
                filename = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())

            # Construct S3 key
            s3_key = f"{folder}/{filename}".strip("/")

            # Prepare metadata
            file_metadata = metadata or {}
            file_metadata["original_filename"] = file.filename
            file_metadata["uploaded_at"] = datetime.utcnow().isoformat()

            # Extra arguments for upload
            extra_args = {
                "ContentType": file.content_type or "application/octet-stream",
                "Metadata": file_metadata,
            }

            if make_public:
                extra_args["ACL"] = "public-read"

            # Upload file
            file.file.seek(0)  # Reset file pointer
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args,
            )

            # Generate URL
            s3_url = self._generate_s3_url(s3_key)
            logger.info(f"[S3 UPLOAD] Success: {file.filename} -> {s3_key}")
            
            return s3_url

        except ClientError as e:
            logger.error(f"[S3 UPLOAD ERROR] {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
        except Exception as e:
            logger.error(f"[S3 UPLOAD ERROR] Unexpected: {e}")
            raise HTTPException(status_code=500, detail="File upload failed")

    def upload_bytes(
        self,
        data: bytes,
        filename: str,
        folder: str = "",
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Upload raw bytes to S3.

        Args:
            data: Bytes data to upload
            filename: Filename in S3
            folder: S3 folder/prefix
            content_type: MIME type
            metadata: Additional metadata

        Returns:
            str: S3 URL
        """
        try:
            s3_key = f"{folder}/{filename}".strip("/")
            
            extra_args = {
                "ContentType": content_type,
                "Metadata": metadata or {},
            }

            self.s3_client.upload_fileobj(
                BytesIO(data),
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args,
            )

            logger.info(f"[S3 UPLOAD BYTES] Success: {s3_key}")
            return self._generate_s3_url(s3_key)

        except Exception as e:
            logger.error(f"[S3 UPLOAD BYTES ERROR] {e}")
            raise HTTPException(status_code=500, detail="Bytes upload failed")

    # ═══════════════════════════════════════════════════════════════════════
    # DOWNLOAD OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════

    def download_file(self, s3_key: str) -> bytes:
        """
        Download file from S3 as bytes.

        Args:
            s3_key: S3 object key

        Returns:
            bytes: File content
        """
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            file_data = response["Body"].read()
            logger.info(f"[S3 DOWNLOAD] Success: {s3_key}")
            return file_data

        except ClientError as e:
            logger.error(f"[S3 DOWNLOAD ERROR] {s3_key}: {e}")
            raise HTTPException(status_code=404, detail="File not found in S3")

    def download_to_file(self, s3_key: str, local_path: str) -> None:
        """
        Download S3 object to local file.

        Args:
            s3_key: S3 object key
            local_path: Local file path to save
        """
        try:
            self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            logger.info(f"[S3 DOWNLOAD] {s3_key} -> {local_path}")
        except Exception as e:
            logger.error(f"[S3 DOWNLOAD ERROR] {e}")
            raise

    # ═══════════════════════════════════════════════════════════════════════
    # DELETE OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════

    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3.

        Args:
            s3_key: S3 object key

        Returns:
            bool: True if deleted successfully
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"[S3 DELETE] Success: {s3_key}")
            return True
        except Exception as e:
            logger.error(f"[S3 DELETE ERROR] {s3_key}: {e}")
            return False

    def delete_file_by_url(self, s3_url: str) -> bool:
        """
        Delete file using its S3 URL.

        Args:
            s3_url: Full S3 URL

        Returns:
            bool: True if deleted
        """
        try:
            s3_key = self._extract_key_from_url(s3_url)
            return self.delete_file(s3_key)
        except Exception as e:
            logger.error(f"[S3 DELETE BY URL ERROR] {e}")
            return False

    def delete_multiple(self, s3_keys: List[str]) -> Dict[str, Any]:
        """
        Delete multiple files at once.

        Args:
            s3_keys: List of S3 keys

        Returns:
            dict: Result summary
        """
        try:
            objects = [{"Key": key} for key in s3_keys]
            response = self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={"Objects": objects}
            )
            deleted = response.get("Deleted", [])
            logger.info(f"[S3 BULK DELETE] Deleted {len(deleted)} files")
            return {"deleted": len(deleted), "requested": len(s3_keys)}
        except Exception as e:
            logger.error(f"[S3 BULK DELETE ERROR] {e}")
            raise

    # ═══════════════════════════════════════════════════════════════════════
    # LIST & METADATA OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════

    def list_files(self, folder: str = "", max_keys: int = 1000) -> List[Dict[str, Any]]:
        """
        List files in a folder.

        Args:
            folder: S3 folder prefix
            max_keys: Maximum files to return

        Returns:
            list: File metadata dictionaries
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder,
                MaxKeys=max_keys,
            )

            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "url": self._generate_s3_url(obj["Key"]),
                })

            logger.info(f"[S3 LIST] Found {len(files)} files in '{folder}'")
            return files

        except Exception as e:
            logger.error(f"[S3 LIST ERROR] {e}")
            return []

    def get_file_metadata(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific file.

        Args:
            s3_key: S3 object key

        Returns:
            dict: File metadata or None
        """
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                "size": response["ContentLength"],
                "content_type": response["ContentType"],
                "last_modified": response["LastModified"].isoformat(),
                "metadata": response.get("Metadata", {}),
            }
        except Exception as e:
            logger.error(f"[S3 METADATA ERROR] {s3_key}: {e}")
            return None

    def file_exists(self, s3_key: str) -> bool:
        """
        Check if file exists in S3.

        Args:
            s3_key: S3 object key

        Returns:
            bool: True if exists
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except:
            return False

    # ═══════════════════════════════════════════════════════════════════════
    # PRESIGNED URL OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════

    def generate_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600,
        operation: str = "get_object",
    ) -> Optional[str]:
        """
        Generate presigned URL for temporary access.

        Args:
            s3_key: S3 object key
            expiration: URL validity in seconds (default: 1 hour)
            operation: boto3 operation (get_object, put_object, etc.)

        Returns:
            str: Presigned URL or None
        """
        try:
            url = self.s3_client.generate_presigned_url(
                operation,
                Params={"Bucket": self.bucket_name, "Key": s3_key},
                ExpiresIn=expiration,
            )
            logger.info(f"[S3 PRESIGNED] Generated for: {s3_key}")
            return url
        except Exception as e:
            logger.error(f"[S3 PRESIGNED ERROR] {e}")
            return None

    def generate_upload_presigned_url(
        self,
        s3_key: str,
        content_type: str = "application/octet-stream",
        expiration: int = 3600,
    ) -> Optional[Dict[str, str]]:
        """
        Generate presigned URL for direct client upload.

        Args:
            s3_key: S3 object key
            content_type: File MIME type
            expiration: URL validity in seconds

        Returns:
            dict: Presigned POST data or None
        """
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={"Content-Type": content_type},
                Conditions=[{"Content-Type": content_type}],
                ExpiresIn=expiration,
            )
            logger.info(f"[S3 PRESIGNED UPLOAD] Generated for: {s3_key}")
            return response
        except Exception as e:
            logger.error(f"[S3 PRESIGNED UPLOAD ERROR] {e}")
            return None

    # ═══════════════════════════════════════════════════════════════════════
    # UTILITY METHODS
    # ═══════════════════════════════════════════════════════════════════════

    def _generate_s3_url(self, s3_key: str) -> str:
        """Generate public S3 URL for a key."""
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"

    def _extract_key_from_url(self, s3_url: str) -> str:
        """Extract S3 key from full URL."""
        # Example: https://bucket.s3.region.amazonaws.com/folder/file.jpg -> folder/file.jpg
        parts = s3_url.split(f"{self.bucket_name}.s3.{self.region}.amazonaws.com/")
        if len(parts) < 2:
            raise ValueError("Invalid S3 URL format")
        return parts[1]

    def get_file_size(self, s3_key: str) -> Optional[int]:
        """Get file size in bytes."""
        metadata = self.get_file_metadata(s3_key)
        return metadata["size"] if metadata else None


# ═══════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

_s3_client_instance: Optional[S3Client] = None


def get_s3_client() -> S3Client:
    """
    Get singleton S3 client instance.

    Returns:
        S3Client: Initialized S3 client

    Raises:
        HTTPException: If S3 is not enabled
    """
    global _s3_client_instance
    
    if not settings.USE_S3:
        raise HTTPException(status_code=500, detail="S3 storage is not enabled")
    
    if _s3_client_instance is None:
        _s3_client_instance = S3Client()
    
    return _s3_client_instance


# For backward compatibility
s3_client = get_s3_client() if settings.USE_S3 else None
