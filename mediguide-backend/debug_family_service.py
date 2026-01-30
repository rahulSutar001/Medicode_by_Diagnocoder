import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.services.family_service import FamilyService
from app.core.config import settings

async def debug_family():
    print(f"DEBUG: Using Supabase URL: {settings.SUPABASE_URL}")
    service = FamilyService()
    
    # Use the User ID from the logs we saw
    user_id = "190bc0b3-1e44-4f2c-a552-28961679734c"
    
    print(f"DEBUG: Listing family members for user: {user_id}")
    try:
        members = await service.list_family_members(user_id)
        print(f"DEBUG: Successfully fetched {len(members)} members")
        for m in members:
            print(f"  - {m}")
    except Exception as e:
        print(f"DEBUG: Error listing members: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_family())
