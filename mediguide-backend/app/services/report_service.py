"""
Report service - Core service for managing medical reports
Orchestrates OCR, AI, and data storage
"""
import uuid
from datetime import datetime
import asyncio
from typing import List, Optional, Dict, Any

from fastapi import BackgroundTasks, Request

from app.core.security import get_authed_supabase_client
from app.services.premium_service import PremiumService
from app.services.safety_service import SafetyService
from app.utils.ocr import OCRService
from app.utils.ocr import OCRService
from app.ai.explanations import ExplanationService
from app.ai.synthesis import SynthesisService
from app.schemas.report import ReportResponse, TestParameterResponse
from app.core.config import settings
from app.core.security import get_authed_supabase_client, get_service_supabase_client
from app.supabase.storage_service import upload_to_supabase_storage



class ReportService:
    """Service for managing medical reports"""

    def __init__(self, request: Request):
        # ✅ AUTHENTICATED SUPABASE CLIENT (JWT INCLUDED → RLS SAFE)
        self.db = get_authed_supabase_client(request)
        # ✅ SERVICE ROLE CLIENT FOR STORAGE (BYPASSES RLS)
        self.storage_client = get_service_supabase_client()
        self.premium_service = PremiumService()
        self.safety_service = SafetyService()
        self.ocr_service = OCRService()
        self.ocr_service = OCRService()
        self.explanation_service = ExplanationService()
        self.synthesis_service = SynthesisService()

    async def verify_family_access(self, requester_id: str, target_id: str) -> bool:
        """Verify if requester has family connection with target"""
        if requester_id == target_id:
            return True
            
        # Check for confirmed connection in either direction
        response = self.storage_client.table("family_connections").select("id").or_(
            f"and(user_id.eq.{requester_id},connected_user_id.eq.{target_id},status.eq.connected),"
            f"and(user_id.eq.{target_id},connected_user_id.eq.{requester_id},status.eq.connected)"
        ).execute()
        
        return len(response.data) > 0

    async def create_report(
        self,
        user_id: str,
        image_data: bytes,
        filename: str,
        report_type: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> str:
        # Check premium limits
        can_create, error_msg = await self.premium_service.check_report_limit(user_id)
        if not can_create:
            raise ValueError(error_msg)

        report_id = str(uuid.uuid4())
        file_path = f"{user_id}/{report_id}.png"

        # Upload image to Supabase Storage (SERVICE ROLE SAFE INTERNALLY)
        upload_to_supabase_storage(
            bucket=settings.STORAGE_BUCKET,
            path=file_path,
            file_bytes=image_data,
            content_type="image/png",
        )

        # Create report DB record (RLS ENFORCED)
        report_data = {
            "id": report_id,
            "user_id": user_id,
            "type": report_type or "Unknown",
            "status": "processing",
            "flag_level": "green",
            "image_url": file_path,
            "uploaded_to_abdm": False,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        response = self.db.table("reports").insert(report_data).execute()

        if not response.data:
            raise RuntimeError("Failed to insert report record")

        # Background processing
        if background_tasks:
            background_tasks.add_task(
                self._process_report,
                report_id,
                user_id,
                image_data,
            )
        else:
            await self._process_report(report_id, user_id, image_data)

        return report_id

    async def _process_report(
        self,
        report_id: str,
        user_id: str,
        image_data: bytes,
    ):
        try:
            # 10% - Starting OCR
            await self._update_progress(report_id, 10)
            
            # OCR
            text = await self.ocr_service.extract_text(image_data)
            print(f"[DEBUG] OCR text (first 500 chars): {text[:500]}")

            # 40% - OCR Complete, Starting Parsing
            await self._update_progress(report_id, 40)

            parsed_data = self.ocr_service.parse_structured_data(text)
            print(f"[DEBUG] Parsed {len(parsed_data.get('parameters', []))} parameters")

            # Update basic report info
            self.db.table("reports").update(
                {
                    "type": parsed_data.get("report_type", "Unknown"),
                    "lab_name": parsed_data.get("lab_name"),
                    "date": parsed_data.get("date"),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", report_id).execute()

            parameters = []
            is_premium = await self.premium_service.check_subscription(user_id)
            
            # 50% - Parsed, Preparing for AI
            await self._update_progress(report_id, 50)
            
            # 1. First pass: Create and insert all parameter records
            param_records = []
            param_data_list = [] # For AI prompt
            
            for param_data in parsed_data.get("parameters", []):
                try:
                    value_float = float(param_data.get("value", "0").replace(",", ""))
                except Exception:
                    value_float = 0.0

                flag = self.safety_service.classify_flag(
                    parameter_name=param_data.get("name", ""),
                    value=value_float,
                    normal_range=param_data.get("range", ""),
                    unit=param_data.get("unit"),
                )

                param_id = str(uuid.uuid4())
                param_record = {
                    "id": param_id,
                    "report_id": report_id,
                    "name": param_data.get("name", ""),
                    "value": param_data.get("value", ""),
                    "unit": param_data.get("unit"),
                    "normal_range": param_data.get("range", ""),
                    "flag": flag,
                    "created_at": datetime.utcnow().isoformat(),
                }
                
                # Add to lists
                param_records.append(param_record)
                parameters.append({**param_record, "flag": flag})
                
                # Prepare data for AI (must match what AI expects)
                param_data_list.append({
                    "name": param_data.get("name", ""),
                    "value": param_data.get("value", ""),
                    "range": param_data.get("range", ""),
                    "flag": flag,
                    "unit": param_data.get("unit")
                })

            # Batch Insert Parameters
            if param_records:
                self.storage_client.table("report_parameters").insert(param_records).execute()
            
            # 60% - Parameters Saved, Calling AI
            await self._update_progress(report_id, 60)

            # 2. Call AI: Single Batch Request
            print(f"[DEBUG] Generating batched explanations for {len(param_data_list)} parameters...")
            explanations = await self.explanation_service.generate_report_explanations(
                parameters=param_data_list,
                is_premium=is_premium
            )
            
            # 80% - AI Explanations Generated
            await self._update_progress(report_id, 80)
            
            # 3. Process results and batch insert explanations
            # Map parameters by name to associate IDs
            param_map = {p["name"].lower().strip(): p["id"] for p in param_records}
            
            explanation_records = []
            for exp in explanations:
                # Find matching parameter ID
                p_name = exp.get("name", "").lower().strip()
                if not p_name or p_name not in param_map:
                    # Try fuzzy match or fallback? 
                    # For now skip if no match to avoid bad data
                    continue
                    
                param_id = param_map[p_name]
                
                explanation_record = {
                    "id": str(uuid.uuid4()),
                    "parameter_id": param_id,
                    "what": exp.get("what", ""),
                    "meaning": exp.get("meaning", ""),
                    "causes": exp.get("causes", []),
                    "next_steps": exp.get("next_steps", []),
                    "generated_at": datetime.utcnow().isoformat(),
                }
                explanation_records.append(explanation_record)

            if explanation_records:
                print(f"[DEBUG] Inserting {len(explanation_records)} explanations")
                self.storage_client.table("report_explanations").insert(explanation_records).execute()
            
            flag_level = (
                self.safety_service.get_flag_level(parameters)
                if parameters
                else "green"
            )

            self.db.table("reports").update(
                {
                    "status": "completed",
                    "progress": 100,
                    "flag_level": flag_level,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", report_id).execute()

            print(f"[SUCCESS] Report {report_id} processed")
            
            # Trigger Background Synthesis (Fire and forget from user perspective, but awaited here in bg task)
            await self.generate_and_cache_synthesis(report_id, user_id)

        except Exception as e:
            print(f"[ERROR] Processing failed for {report_id}: {e}")
            # Try to save error to reports table
            try:
                self.db.table("reports").update(
                    {
                        "status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                ).eq("id", report_id).execute()
            except Exception as db_e:
                print(f"[ERROR] Failed to update error status: {db_e}")
            raise

    async def get_report(self, report_id: str, user_id: str) -> Optional[Dict]:
        """Get report details. Checks for ownership OR family connection."""
        
        # 1. Try standard access (Own report)
        response = (
            self.db.table("reports")
            .select("*")
            .eq("id", report_id)
            .eq("user_id", user_id)
            .execute()
        )
        if response.data:
            return response.data[0]
            
        # 2. Try Shared Access (Family report)
        # Fetch report metadata using Service Role to check owner
        admin_res = self.storage_client.table("reports").select("*").eq("id", report_id).execute()
        if not admin_res.data:
            return None # Report doesnt exist at all
            
        report = admin_res.data[0]
        owner_id = report["user_id"]
        
        # Verify connection
        if await self.verify_family_access(user_id, owner_id):
            return report
            
        return None

    async def list_reports(
        self,
        user_id: str,
        search: Optional[str] = None,
        report_type: Optional[str] = None,
        flag_level: Optional[str] = None,
        time_range: str = "all",
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        query = (
            self.storage_client.table("reports")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )

        if search:
            query = query.or_(f"type.ilike.%{search}%,lab_name.ilike.%{search}%")

        if report_type:
            query = query.eq("type", report_type)

        if flag_level:
            query = query.eq("flag_level", flag_level.lower())

        offset = (page - 1) * limit
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "items": response.data or [],
            "total": response.count or 0,
            "page": page,
            "limit": limit,
            "has_next": (response.count or 0) > offset + limit,
            "has_prev": page > 1,
        }

    async def delete_report(self, report_id: str, user_id: str) -> bool:
        # Direct delete. RLS policy ("Users can delete their own reports") ensures security.
        self.db.table("reports").delete().eq("id", report_id).execute()
        # Always return True (idempotent: if it's gone, mission accomplished)
        return True

    async def get_report_parameters(self, report_id: str, user_id: str) -> List[Dict]:
        """Get parameters for a report"""
        # Verify report ownership first
        report = await self.get_report(report_id, user_id)
        if not report:
            return []
            
        response = (
            self.storage_client.table("report_parameters")
            .select("*")
            .eq("report_id", report_id)
            .execute()
        )
        params = response.data or []
        
        # Enrich with explanations
        if params:
            param_ids = [p["id"] for p in params]
            explanations_response = (
                self.storage_client.table("report_explanations")
                .select("*")
                .in_("parameter_id", param_ids)
                .execute()
            )
            explanations = explanations_response.data or []
            explanation_map = {e["parameter_id"]: e for e in explanations}
            
            for p in params:
                p["explanation"] = explanation_map.get(p["id"])
                # Frontend might expect 'range' instead of 'normal_range'
                p["range"] = p.get("normal_range")

        return params

    async def get_report_explanations(self, report_id: str, user_id: str) -> List[Dict]:
        """Get AI explanations for a report"""
        # Verify ownership
        report = await self.get_report(report_id, user_id)
        if not report:
            return []
            
        # Get parameter IDs for this report
        params = await self.get_report_parameters(report_id, user_id)
        if not params:
            return []
            
        param_ids = [p["id"] for p in params]
        
        if not param_ids:
            return []
            
        response = (
            self.storage_client.table("report_explanations")
            .select("*")
            .in_("parameter_id", param_ids)
            .execute()
        )
        return response.data or []

    async def find_related_reports(self, report: Dict, user_id: str) -> List[Dict]:
        """Find reports related to the given report (by Type)"""
        if not report or not report.get("type"):
            return []
            
        # Find past reports of same type
        response = (
            self.db.table("reports")
            .select("*")
            .eq("user_id", user_id)
            .eq("type", report["type"])
            .neq("id", report["id"]) # Exclude current
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        
        related_reports = response.data or []
        
        # Enrich with parameters (Synthesis needs data)
        for r in related_reports:
             r["parameters"] = await self.get_report_parameters(r["id"], user_id)
             
        return related_reports

    async def get_cached_synthesis(self, report_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached synthesis from DB. NO OpenAI calls."""
        # 1. Verify Access
        report = await self.get_report(report_id, user_id)
        if not report:
            raise ValueError("Report not found")

        # 2. Get from DB
        response = (
            self.storage_client.table("report_summaries")
            .select("summary_text, status, error_message")
            .eq("report_id", report_id)
            .execute()
        )
        
        if response.data:
            row = response.data[0]
            # Structure the response
            return {
                "status": row.get("status", "completed"), # Default to completed for legacy
                "data": row.get("summary_text"),
                "error": row.get("error_message")
            }
            
        return None

    async def generate_and_cache_synthesis(self, report_id: str, user_id: str, force_regenerate: bool = False) -> bool:
        """
        Atomic synthesis generation using DB constraints.
        Guarantees: Hard Idempotency, Single Execution, No Race Conditions.
        """
        try:
            # 1. Force Regenerate: Atomic Delete checks
            if force_regenerate:
                print(f"[DEBUG] Forcing synthesis regeneration for {report_id}")
                # Delete existing row to clear the lock
                self.storage_client.table("report_summaries").delete().eq("report_id", report_id).execute()

            # 2. Acquire Lock (Atomic Insert)
            # Try to insert 'pending'. If row exists (pending/completed/failed), DB throws unique constraint error.
            # This serves as our atomic lock.
            current_time = datetime.utcnow().isoformat()
            try:
                self.storage_client.table("report_summaries").insert({
                    "report_id": report_id,
                    "status": "pending",
                    "summary_text": None,
                    "error_message": None,
                    "created_at": current_time, 
                    "updated_at": current_time
                }).execute()
            except Exception as e:
                # Lock failed -> Row already exists.
                # This is expected behavior for idempotency (job already running or done).
                print(f"[DEBUG] Synthesis lock held or done for {report_id}. Exiting. Reason: {e}")
                return True

            # --- WE HAVE THE LOCK ---
            
            try:
                # 3. Get Data
                report = await self.get_report(report_id, user_id)
                if not report:
                    self._mark_synthesis_failed(report_id, "Report not found")
                    return False
                    
                report["parameters"] = await self.get_report_parameters(report_id, user_id)
                
                # 4. Find History
                target_user_id = report["user_id"]
                related = await self.find_related_reports(report, target_user_id)
                
                # 5. Generate AI Synthesis
                print(f"[DEBUG] Generating AI synthesis for {report_id}...")
                synthesis = await self.synthesis_service.generate_synthesis(report, related)
                
                # 6. Validate AI Response
                if synthesis.get("doctor_precis") == "AI Synthesis unavailable.":
                    self._mark_synthesis_failed(report_id, "AI service unavailable")
                    return False

                # 7. Mark as COMPLETED
                self.storage_client.table("report_summaries").update({
                    "status": "completed",
                    "summary_text": synthesis,
                    "error_message": None,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("report_id", report_id).execute()
                
                print(f"[SUCCESS] Synthesis completed for {report_id}")
                return True
                
            except Exception as inner_e:
                # Catch internal logic errors and mark failed so user can retry later
                print(f"[ERROR] Logic failed during synthesis: {inner_e}")
                self._mark_synthesis_failed(report_id, str(inner_e))
                return False

        except Exception as e:
            print(f"[CRITICAL] Outer synthesis error: {e}")
            return False

    def _mark_synthesis_failed(self, report_id: str, error_message: str):
        """Helper to mark synthesis as failed"""
        try:
            self.storage_client.table("report_summaries").update({
                "status": "failed",
                "error_message": error_message,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("report_id", report_id).execute()
        except Exception as e:
            print(f"[CRITICAL] Failed to mark synthesis failure: {e}")

    async def _update_progress(self, report_id: str, progress: int):
        """Helper to safely update report progress"""
        try:
            self.db.table("reports").update({"progress": progress}).eq("id", report_id).execute()
        except Exception:
            # Ignore errors (e.g., if progress column doesn't exist yet)
            pass

    async def get_report_synthesis(self, report_id: str, user_id: str) -> Dict[str, Any]:
        """
        DEPRECATED: Use get_cached_synthesis
        Maintains backward compatibility by returning structured response
        """
        cached = await self.get_cached_synthesis(report_id, user_id)
        
        if cached:
            if cached["status"] == "completed" and cached["data"]:
                return {**cached["data"], "status": "completed"}
            elif cached["status"] == "pending":
                return {
                    "status": "pending",
                    "status_summary": "Analysis in progress...",
                    "key_trends": [],
                    "doctor_precis": "Generating your smart health synthesis..."
                }
            elif cached["status"] == "failed":
                return {
                    "status": "failed",
                    "status_summary": "Analysis failed.",
                    "key_trends": [],
                    "doctor_precis": "Could not generate synthesis. Please retry."
                }
            
        return {
            "status": "missing",
            "status_summary": "Analysis not ready.",
            "key_trends": [],
            "doctor_precis": "Smart synthesis not generated yet."
        }
