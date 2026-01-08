"""
Security utilities for JWT verification and Supabase access
"""

from typing import Optional
from fastapi import HTTPException, status, Header, Request
from supabase import create_client, Client
from supabase import create_client
from app.core.config import settings
import jwt


# -----------------------------
# Supabase Client Helpers
# -----------------------------

def get_supabase_client(use_service_role: bool = False) -> Client:
    """
    Returns a basic Supabase client.
    Does NOT attach user JWT (RLS will NOT work with this alone).
    """
    if use_service_role:
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


def get_authed_supabase_client(
    request: Request,
    use_service_role: bool = False
) -> Client:
    """
    Returns a Supabase client authenticated with the user's JWT.
    REQUIRED for RLS-protected table access.
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise ValueError
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format"
        )

    supabase = get_supabase_client(use_service_role=use_service_role)

    # 🔥 THIS IS THE CRITICAL LINE (FIXES YOUR ISSUE)
    supabase.postgrest.auth(token)


    return supabase

def get_service_supabase_client():
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


# -----------------------------
# JWT Verification
# -----------------------------

async def verify_jwt_token(token: str) -> dict:
    """
    Verify Supabase JWT token and return user info
    """
    try:
        supabase = get_supabase_client()

        # Safest verification method
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        decoded = jwt.decode(
            token,
            options={"verify_signature": False}
        )

        return {
            "user_id": decoded.get("sub"),
            "email": decoded.get("email"),
            "role": decoded.get("role", "authenticated")
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )


# -----------------------------
# FastAPI Dependency
# -----------------------------

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> dict:
    """
    FastAPI dependency to extract and verify the current user
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format"
        )

    return await verify_jwt_token(token)
