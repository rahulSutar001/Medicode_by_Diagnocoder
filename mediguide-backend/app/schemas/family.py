"""
Pydantic models for family connection requests and responses
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class FamilyMemberResponse(BaseModel):
    """Response model for family member"""
    id: str
    user_id: str
    connected_user_id: str
    nickname: Optional[str] = None
    status: Literal['good', 'needs-review', 'critical', 'pending']
    connection_status: Literal['connected', 'pending-sent', 'pending-received']
    created_at: datetime
    
    class Config:
        from_attributes = True


class InviteFamilyRequest(BaseModel):
    """Request model for inviting family member"""
    email: str
    nickname: Optional[str] = None


class AcceptConnectionRequest(BaseModel):
    """Request model for accepting connection"""
    connection_id: str
    nickname: Optional[str] = None
