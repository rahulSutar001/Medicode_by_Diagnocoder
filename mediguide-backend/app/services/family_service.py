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
        from app.core.security import get_service_supabase_client
        self.admin_supabase = get_service_supabase_client()
    
    async def list_family_members(self, user_id: str) -> List[Dict]:
        """List all family connections (connected AND pending) for a user"""
        # 1. Get connections
        response = self.admin_supabase.table("family_connections").select(
            "*"
        ).or_(
            f"user_id.eq.{user_id},connected_user_id.eq.{user_id}"
        ).in_("status", ["connected", "pending_sent"]).execute()
        
        data = response.data or []
        
        if not data:
            return []

        # 2. Collect Profile IDs to fetch
        profile_ids = set()
        for conn in data:
            profile_ids.add(conn["user_id"])
            profile_ids.add(conn["connected_user_id"])
        
        # 3. Fetch Profiles manually (Use Admin Client to bypass RLS)
        profiles_map = {}
        if profile_ids:
             # profiles table seems to lack full_name/first_name in this env. Using phone_number as fallback if needed.
             # We try multiple fields for name: full_name, profile_name, first_name
             p_res = self.admin_supabase.table("profiles").select("*").in_("id", list(profile_ids)).execute()
             if p_res.data:
                 for p in p_res.data:
                     # Try to derive a usable name
                     name_candidates = [
                         p.get("full_name"),
                         p.get("profile_name"),
                         p.get("first_name"),
                         p.get("phone_number")
                     ]
                     final_name = next((n for n in name_candidates if n), "User")
                     p["computed_name"] = final_name
                     profiles_map[p["id"]] = p

        # 4. Post-process
        results = []
        for conn in data:
            is_sender = conn["user_id"] == user_id
            status = conn["status"]
            
            # Determine connection status for frontend
            if status == "connected":
                connection_status = "connected"
            elif status == "pending_sent":
                if is_sender:
                    connection_status = "pending-sent"
                else:
                    connection_status = "pending-received"
            else:
                connection_status = "pending"

            # Determine target ("other person")
            target_id = conn["connected_user_id"] if is_sender else conn["user_id"]
            target_profile = profiles_map.get(target_id) or {}
            
            # Resolve Display Name (Alias)
            # If I am sender, I see sender_display_name
            # If I am receiver, I see receiver_display_name
            alias = conn.get("sender_display_name") if is_sender else conn.get("receiver_display_name")
            
            profile_name = target_profile.get("computed_name", "Unknown")
            identifier = target_profile.get("phone_number") or target_profile.get("email") or "Hidden"
            
            # Final effective display name
            display_name = alias or profile_name
            
            results.append({
                "connection_id": conn["id"],
                "user_id": target_id,
                "display_name": display_name,
                "profile_name": profile_name,
                "phone": identifier,
                "status": status,
                "connection_status": connection_status,
                "created_at": conn["created_at"]
            })
            
        return results
    
    async def send_invite(
        self,
        user_id: str,
        email: Optional[str] = None,
        phone_number: Optional[str] = None,
        nickname: Optional[str] = None
    ) -> str:
        """Send family connection invite"""
        if not email and not phone_number:
            raise ValueError("Email or Phone Number required")

        # Check premium limits
        can_add, error_msg = await self.premium_service.check_family_limit(user_id)
        if not can_add:
            raise ValueError(error_msg)
        
        # Get Sender Profile Name (to populate sender_display_name)
        sender_profile = self.admin_supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        sender_name = None
        if sender_profile.data:
            p = sender_profile.data
            sender_name = p.get("full_name") or p.get("profile_name") or p.get("first_name") or p.get("phone_number")

        # Find target user
        target_user_id = None
        
        if email:
            try:
                 # Use RPC to find user ID from auth.users securely
                 res = self.admin_supabase.rpc("get_user_id_by_email", {"email": email}).execute()
                 
                 # Robustly handle RPC response (it might be a list of objects or other shapes)
                 data = res.data
                 
                 if data and isinstance(data, list) and len(data) > 0:
                     first_row = data[0]
                     # Check if it's a dict and has 'id' or function name key
                     if isinstance(first_row, dict):
                         target_user_id = first_row.get("id") or first_row.get("get_user_id_by_email")
                 
            except Exception as e:
                 print(f"Error looking up email: {e}")
                 pass
        
        if not target_user_id and phone_number:
            res = self.admin_supabase.table("profiles").select("id").eq("phone_number", phone_number).execute()
            if res.data:
                target_user_id = res.data[0]["id"]
                
        if not target_user_id:
             raise ValueError("User not found with these details")

        if target_user_id == user_id:
            raise ValueError("Cannot invite yourself")

        # Check existing connection
        existing = self.admin_supabase.table("family_connections").select("*").or_(
            f"and(user_id.eq.{user_id},connected_user_id.eq.{target_user_id}),and(user_id.eq.{target_user_id},connected_user_id.eq.{user_id})"
        ).execute()
        
        if existing.data:
            raise ValueError("Connection already exists or is pending")

        connection_id = str(uuid.uuid4())
        
        # When creating:
        # sender_display_name = sender's own name (so receiver sees who it is)
        # receiver_display_name = None (receiver sets it upon accept)
        connection_data = {
            "id": connection_id,
            "user_id": user_id,
            "connected_user_id": target_user_id,
            "invited_email": email,
            "nickname": nickname, # Legacy field, keeping for safety
            "status": "pending_sent",
            "created_at": datetime.now().isoformat(),
            "sender_display_name": sender_name,
            "receiver_display_name": None
        }
        
        self.admin_supabase.table("family_connections").insert(connection_data).execute()
        
        return connection_id
    
    async def accept_connection(
        self,
        connection_id: str,
        user_id: str,
        display_name: Optional[str] = None
    ) -> bool:
        """Accept a family connection request"""
        # I am the 'connected_user_id' (recipient)
        
        response = self.admin_supabase.table("family_connections").select("*").eq(
            "id", connection_id
        ).eq("connected_user_id", user_id).eq("status", "pending_sent").single().execute()
        
        if not response.data:
            return False
        
        # Update connection
        # If I accept, I can set my alias for them (receiver_display_name)
        update_data = {
            "status": "connected",
            "updated_at": datetime.now().isoformat()
        }
        if display_name:
            update_data["receiver_display_name"] = display_name

        self.admin_supabase.table("family_connections").update(update_data).eq("id", connection_id).execute()
        
        return True

    async def rename_connection(
        self,
        connection_id: str,
        user_id: str,
        new_display_name: str
    ) -> bool:
        """Rename a family connection (set alias)"""
        # 1. Fetch connection to see if I am sender or receiver
        response = self.admin_supabase.table("family_connections").select("*").eq(
            "id", connection_id
        ).or_(
            f"user_id.eq.{user_id},connected_user_id.eq.{user_id}"
        ).single().execute()

        if not response.data:
            return False
            
        conn = response.data
        is_sender = conn["user_id"] == user_id
        
        # 2. Update the appropriate column
        field = "sender_display_name" if is_sender else "receiver_display_name"
        
        self.admin_supabase.table("family_connections").update({
            field: new_display_name,
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
