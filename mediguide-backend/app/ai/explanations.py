"""
AI service for generating medical test explanations
Uses OpenAI with strict safety constraints
"""
import json
from typing import Dict, List, Optional
from openai import OpenAI
from app.core.config import settings
from app.ai.prompts import get_explanation_prompt, get_batch_explanation_prompt


class ExplanationService:
    """Service for generating AI explanations of medical test results"""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
    
    async def generate_report_explanations(
        self,
        parameters: List[Dict],
        is_premium: bool = False
    ) -> List[Dict]:
        """
        Generate AI explanations for ALL parameters in one batch call.
        Strictly one OpenAI request per report.
        """
        if not parameters:
            return []

        prompt = get_batch_explanation_prompt(parameters)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical explanations assistant. Return ONLY a JSON array."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                # Increase tokens for potential large response
                max_tokens=2000 if is_premium else 1000,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            
            # Parse JSON response
            try:
                # OpenAI often wraps array in an object key if force-json is used, or just returns the object
                # We need to handle this robustly
                data = json.loads(content)
                
                explanations = []
                if isinstance(data, list):
                    explanations = data
                elif isinstance(data, dict):
                    # Try to find the list in values
                    # Common keys: "results", "explanations", "parameters"
                    for key, val in data.items():
                        if isinstance(val, list):
                            explanations = val
                            break
                        
                # Validate and Sanitize each item
                valid_explanations = []
                for exp in explanations:
                    # Basic validation
                    if not isinstance(exp, dict): continue
                    
                    # Match by name if possible? 
                    # For now just sanitize what we got
                    flag = exp.get("flag", "normal")
                    sanitized = self._validate_explanation(exp, flag)
                    
                    # Ensure name exists for mapping back
                    if "name" in exp:
                        sanitized["name"] = exp["name"]
                        
                    valid_explanations.append(sanitized)
                    
                return valid_explanations

            except json.JSONDecodeError:
                print(f"[ERROR] Batch AI response not valid JSON: {content[:100]}")
                return [] # Graceful degradation

        except Exception as e:
            print(f"[ERROR] Batch AI explanation failed: {e}")
            return [] # Graceful degradation: Report completes without explanations

    async def generate_explanation(
        self,
        parameter_name: str,
        value: str,
        normal_range: str,
        flag: str,
        is_premium: bool = False
    ) -> Dict[str, any]:
        """DEPRECATED: Use generate_report_explanations instead"""
        # Kept for backward compatibility if needed, but should not be used in new flow
        return self._get_fallback_explanation(parameter_name, flag)
    
    def _validate_explanation(self, explanation: Dict, flag: str) -> Dict:
        """Validate and sanitize explanation to ensure safety"""
        # Ensure all required fields exist
        result = {
            "what": explanation.get("what", "This test measures a health parameter."),
            "meaning": explanation.get("meaning", "Your result is within normal range."),
            "causes": explanation.get("causes", []),
            "next_steps": explanation.get("next_steps", [])
        }
        
        # Ensure causes is a list
        if not isinstance(result["causes"], list):
            result["causes"] = []
        
        # Ensure next_steps is a list
        if not isinstance(result["next_steps"], list):
            result["next_steps"] = []
        
        # Add "consult your doctor" if abnormal
        if flag != 'normal' and "consult" not in ' '.join(result["next_steps"]).lower():
            result["next_steps"].append("Consult your doctor for personalized medical advice.")
        
        # Remove any diagnosis/treatment language (basic check)
        result["meaning"] = self._sanitize_text(result["meaning"])
        result["what"] = self._sanitize_text(result["what"])
        
        return result
    
    def _sanitize_text(self, text: str) -> str:
        """Remove any diagnosis/treatment language"""
        # Basic sanitization - can be enhanced
        forbidden_phrases = [
            "you have",
            "you are diagnosed",
            "you should take",
            "prescribe",
            "treatment is"
        ]
        
        text_lower = text.lower()
        for phrase in forbidden_phrases:
            if phrase in text_lower:
                # Replace with safe alternative
                text = text.replace(phrase, "may indicate")
        
        return text
    
    def _parse_fallback_explanation(self, content: str) -> Dict:
        """Parse explanation from non-JSON response"""
        return {
            "what": "This test measures a health parameter.",
            "meaning": content[:200] if content else "Please consult your doctor for interpretation.",
            "causes": [],
            "next_steps": ["Consult your doctor for personalized medical advice."]
        }
    
    def _get_fallback_explanation(self, parameter_name: str, flag: str) -> Dict:
        """Generate fallback explanation if AI fails"""
        return {
            "what": f"{parameter_name} is a medical test parameter that measures specific health indicators.",
            "meaning": f"Your result is {'within normal range' if flag == 'normal' else 'outside normal range'}. Please consult your doctor for interpretation.",
            "causes": [],
            "next_steps": [
                "Consult your doctor for personalized medical advice.",
                "Review your medical history with a healthcare provider."
            ]
        }
