"""
Family connection service
Manages family member connections and shared report access
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.supabase.client import get_supabase
from app.services.premium_service import PremiumService


class FamilyService:
    """Service for managing family connections"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.premium_service = PremiumService()
    
    async def list_family_members(self, user_id: str) -> List[Dict]:
        """List all family connections for a user"""
        # Get connections where user is either user_id or connected_user_id
        response = self.supabase.table("family_connections").select(
            "*, profiles!family_connections_connected_user_id_fkey(*)"
        ).or_(
            f"user_id.eq.{user_id},connected_user_id.eq.{user_id}"
        ).eq("status", "connected").execute()
        
        return response.data or []
    
    async def send_invite(
        self,
        user_id: str,
        email: str,
        nickname: Optional[str] = None
    ) -> str:
        """Send family connection invite"""
        # Check premium limits
        can_add, error_msg = await self.premium_service.check_family_limit(user_id)
        if not can_add:
            raise ValueError(error_msg)
        
        # Find user by email
        # Note: This requires querying auth.users which may need service role
        # For now, we'll create a pending connection
        connection_id = str(uuid.uuid4())
        
        connection_data = {
            "id": connection_id,
            "user_id": user_id,
            "invited_email": email,
            "nickname": nickname,
            "status": "pending_sent",
            "created_at": datetime.now().isoformat()
        }
        
        self.supabase.table("family_connections").insert(connection_data).execute()
        
        return connection_id
    
    async def accept_connection(
        self,
        connection_id: str,
        user_id: str,
        nickname: Optional[str] = None
    ) -> bool:
        """Accept a family connection request"""
        # Get connection
        response = self.supabase.table("family_connections").select("*").eq(
            "id", connection_id
        ).eq("connected_user_id", user_id).eq("status", "pending_received").single().execute()
        
        if not response.data:
            return False
        
        # Update connection
        self.supabase.table("family_connections").update({
            "status": "connected",
            "nickname": nickname,
            "updated_at": datetime.now().isoformat()
        }).eq("id", connection_id).execute()
        
        return True
    
    async def remove_connection(self, connection_id: str, user_id: str) -> bool:
        """Remove a family connection"""
        # Verify ownership
        response = self.supabase.table("family_connections").select("*").eq(
            "id", connection_id
        ).or_(
            f"user_id.eq.{user_id},connected_user_id.eq.{user_id}"
        ).single().execute()
        
        if not response.data:
            return False
        
        # Delete connection
        self.supabase.table("family_connections").delete().eq("id", connection_id).execute()
        
        return True
