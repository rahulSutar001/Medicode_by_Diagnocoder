"""
MediGuide FastAPI Application
Production-grade backend for medical report analysis
"""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import reports, chat, family, premium, chatbot

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MediGuide AI - Medical Report Analysis API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mediguide-version1001.vercel.app",
        "https://mediguide-version1.vercel.app",
        "http://localhost:5173"  # optional for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(family.router, prefix=settings.API_V1_PREFIX)
app.include_router(premium.router, prefix=settings.API_V1_PREFIX)
app.include_router(chatbot.router, prefix=settings.API_V1_PREFIX)

from pydantic import BaseModel
class TokenCheck(BaseModel):
    token: str

@app.post("/api/v1/debug/token")
async def debug_token_check(body: TokenCheck):
    """Temporary debug endpoint to test token verification logic"""
    try:
        from app.core.security import verify_jwt_token
        user = await verify_jwt_token(body.token)
        return {"status": "valid", "user": user, "supabase_url": settings.SUPABASE_URL}
    except Exception as e:
        return {"status": "invalid", "error": str(e), "supabase_url": settings.SUPABASE_URL}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MediGuide API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with proper logging"""
    import traceback
    
    # Log the full error traceback
    error_traceback = traceback.format_exc()
    logger.error(f"Unhandled exception: {str(exc)}\n{error_traceback}")
    print(f"[ERROR] Unhandled exception: {str(exc)}")
    print(f"[ERROR] Traceback:\n{error_traceback}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "code": "INTERNAL_SERVER_ERROR",
            "details": error_traceback if settings.DEBUG else None
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
