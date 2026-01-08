"""
Application configuration and environment variables
"""
from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None  # Only for storage operations
    
    @model_validator(mode='after')
    def ensure_supabase_url_trailing_slash(self):
        if not self.SUPABASE_URL.endswith('/'):
            self.SUPABASE_URL += '/'
        return self
    
    # OpenAI Configuration (for AI explanations and chatbot)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"  # Cost-effective, can upgrade to gpt-4
    
    # OCR Configuration
    OCR_SERVICE: str = "tesseract"  # Options: tesseract, google_vision, aws_textract
    GOOGLE_VISION_API_KEY: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # Application Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "MediGuide API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS Settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # File Upload Settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    
    # Supabase Storage
    STORAGE_BUCKET: str = "medical-reports"
    
    # Background Processing
    USE_CELERY: bool = False  # Set to True for production with Redis
    CELERY_BROKER_URL: Optional[str] = None
    
    # Rate Limiting
    FREE_TIER_REPORTS_PER_MONTH: int = 3
    FREE_TIER_FAMILY_MEMBERS: int = 2
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
