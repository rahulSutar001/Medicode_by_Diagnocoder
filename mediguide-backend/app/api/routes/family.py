"""
Family connection API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_user_id, require_premium
from app.services.family_service import FamilyService
from app.schemas.family import (
    FamilyMemberResponse,
    InviteFamilyRequest,
    AcceptConnectionRequest
)

router = APIRouter(prefix="/family", tags=["family"])


@router.get("/members", response_model=list[FamilyMemberResponse])
async def list_family_members(
    user_id: str = Depends(get_user_id)
):
    """List all family members"""
    service = FamilyService()
    members = await service.list_family_members(user_id)
    return [FamilyMemberResponse(**member) for member in members]


@router.post("/invite", dependencies=[Depends(require_premium)])
async def invite_family_member(
    request: InviteFamilyRequest,
    user_id: str = Depends(get_user_id)
):
    """Send family connection invite (Premium feature for unlimited)"""
    service = FamilyService()
    try:
        connection_id = await service.send_invite(
            user_id=user_id,
            email=request.email,
            nickname=request.nickname
        )
        return {"connection_id": connection_id, "message": "Invite sent successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/accept/{connection_id}")
async def accept_connection(
    connection_id: str,
    request: AcceptConnectionRequest,
    user_id: str = Depends(get_user_id)
):
    """Accept a family connection request"""
    service = FamilyService()
    accepted = await service.accept_connection(
        connection_id=connection_id,
        user_id=user_id,
        nickname=request.nickname
    )
    
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection request not found"
        )
    
    return {"message": "Connection accepted"}


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_connection(
    connection_id: str,
    user_id: str = Depends(get_user_id)
):
    """Remove a family connection"""
    service = FamilyService()
    removed = await service.remove_connection(connection_id, user_id)
    
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
