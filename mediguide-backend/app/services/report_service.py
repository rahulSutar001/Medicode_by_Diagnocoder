"""
Report service - Core service for managing medical reports
Orchestrates OCR, AI, and data storage
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import BackgroundTasks, Request

from app.core.security import get_authed_supabase_client
from app.services.premium_service import PremiumService
from app.services.safety_service import SafetyService
from app.utils.ocr import OCRService
from app.ai.explanations import ExplanationService
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
        self.explanation_service = ExplanationService()

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
            # OCR
            text = await self.ocr_service.extract_text(image_data)
            print(f"[DEBUG] OCR text (first 500 chars): {text[:500]}")

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

                self.storage_client.table("report_parameters").insert(param_record).execute()

                try:
                    explanation = await self.explanation_service.generate_explanation(
                        parameter_name=param_data.get("name", ""),
                        value=param_data.get("value", ""),
                        normal_range=param_data.get("range", ""),
                        flag=flag,
                        is_premium=is_premium,
                    )

                    explanation_record = {
                        "id": str(uuid.uuid4()),
                        "parameter_id": param_id,
                        "what": explanation.get("what", ""),
                        "meaning": explanation.get("meaning", ""),
                        "causes": explanation.get("causes", []),
                        "next_steps": explanation.get("next_steps", []),
                        "generated_at": datetime.utcnow().isoformat(),
                    }

                    self.storage_client.table("report_explanations").insert(
                        explanation_record
                    ).execute()

                except Exception as e:
                    print(f"[WARN] Explanation generation failed: {e}")

                parameters.append({**param_record, "flag": flag})

            flag_level = (
                self.safety_service.get_flag_level(parameters)
                if parameters
                else "green"
            )

            self.db.table("reports").update(
                {
                    "status": "completed",
                    "flag_level": flag_level,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", report_id).execute()

            print(f"[SUCCESS] Report {report_id} processed")

        except Exception as e:
            print(f"[ERROR] Processing failed for {report_id}: {e}")
            self.db.table("reports").update(
                {
                    "status": "failed",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", report_id).execute()
            raise

    async def get_report(self, report_id: str, user_id: str) -> Optional[Dict]:
        response = (
            self.db.table("reports")
            .select("*")
            .eq("id", report_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return response.data

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
        report = await self.get_report(report_id, user_id)
        if not report:
            return False

        self.db.table("report_parameters").delete().eq(
            "report_id", report_id
        ).execute()
        self.db.table("reports").delete().eq("id", report_id).execute()

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
