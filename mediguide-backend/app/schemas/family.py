"""
Pydantic models for family connection requests and responses
"""
from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any
from datetime import datetime


class FamilyMemberResponse(BaseModel):
    """Response model for family member"""
    id: str
    user_id: str
    connected_user_id: str
    nickname: Optional[str] = None
    status: str
    connection_status: str
    profiles: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class InviteFamilyRequest(BaseModel):
    """Request model for inviting family member"""
    email: Optional[str] = None
    phone_number: Optional[str] = None
    nickname: Optional[str] = None


class AcceptConnectionRequest(BaseModel):
    """Request model for accepting connection"""
    nickname: Optional[str] = None
