"""
AI Service for synthesizing medical reports and identifying trends
"""
import json
from typing import Dict, List, Optional
from openai import OpenAI
from app.core.config import settings

class SynthesisService:
    """Service for generating comprehensive medical syntheses"""

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            # warn or raise, but for now allow instantiation
            pass
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    def _minify_report_data(self, report: Dict) -> Dict:
        """Extract only essential data for AI processing to save tokens"""
        # Minimal parameters: name, value, unit, flag
        minified_params = []
        for p in report.get("parameters", []):
            minified_params.append({
                "n": p.get("name"), # Shorten keys
                "v": p.get("value"),
                "u": p.get("unit"),
                "f": p.get("flag")
            })
            
        return {
            "d": report.get("date") or report.get("created_at"), # d = date
            "t": report.get("type"), # t = type
            "p": minified_params # p = parameters
        }

    async def generate_synthesis(
        self, 
        current_report: Dict, 
        related_reports: List[Dict]
    ) -> Dict[str, any]:
        """
        Generate a synthesis of the current report in context of history.
        """
        
        # Prepare context data (Minified)
        history_context = [self._minify_report_data(r) for r in related_reports]
        current_data = self._minify_report_data(current_report)

        system_prompt = (
            "You are an expert medical AI assistant helping a doctor review patient history. "
            "Your goal is to synthesize the CURRENT report findings in the context of PAST reports. "
            "Identify what has changed, improved, or worsened. "
            "Input data is minified: d=date, t=type, p=parameters (n=name, v=value, u=unit, f=flag). "
            "Output must be valid JSON."
        )

        # Minify JSON to save tokens (no whitespace)
        user_prompt = f"""
        CURRENT:
        {json.dumps(current_data, separators=(',', ':'))}

        HISTORY:
        {json.dumps(history_context, separators=(',', ':'))}

        TASK:
        1. Summarize the user's current health status based on this report.
        2. Identify key trends (e.g., "Hemoglobin has increased from 11.2 to 12.5").
        3. Write a "Doctor's Précis" - a concise, professional summary for a GP.

        OUTPUT FORMAT:
        {{
            "status_summary": "1-2 sentences on current status",
            "key_trends": ["trend 1", "trend 2"],
            "doctor_precis": "Paragraph for the doctor"
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1000, # Cap output tokens
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            print(f"[ERROR] Synthesis generation failed: {e}")
            return {
                "status_summary": "Could not generate synthesis.",
                "key_trends": [],
                "doctor_precis": "AI Synthesis unavailable."
            }
