import json
import re
import time
from typing import Dict, List, Optional
from openai import OpenAI
from app.core.config import settings
from app.utils.anonymization import anonymize_medical_data

# Strict System Prompt
MEDIBOT_SYSTEM_PROMPT = """You are MediBot, a helpful, extremely concise, and empathetic AI chatbot inside the MediGuide app.
Your goal is to help users understand their medical reports in a standard chatbot style: short, to-the-point, and human.

STRICT CONCISENESS RULES:
1. MAX 3-4 SENTENCES: Keep every response extremely brief. Do not write long paragraphs.
2. NO REPETITION: Do not repeat the lab name, date, or "I see you're asking about..." unless it's essential for clarity.
3. DIRECT ANSWERS: If asked "Is it normal?", answer directly first (e.g., "Most values are normal, but one is high.") then briefly explain why.
4. USE BULLETS: For more than two items, use short bullet points.

CONVERSATIONAL TONE & EMPATHY:
- Use a warm, human tone ("I see...", "Don't worry...").
- SHOW EMPATHY: Acknowledge abnormal results kindly but briefly (e.g., "I understand this might be concerning, but let's look at what it means.").
- Avoid sounding like a textbook or a formal report. Just talk to the user.

STRICT SAFETY RULES (NON-NEGOTIABLE):
1. NOT A DOCTOR: Do NOT diagnose or prescribe.
2. NO "YOU HAVE": Say "This value is elevated" instead of "You have high cholesterol".
3. REFER TO DOCTOR: Always end questions about treatment or diagnosis by advising a doctor visit.
4. REFUSAL: Refuse specific diagnosis/medication questions and redirect to a professional.

CONTEXT:
1. REPORT_METADATA: Type, date, lab.
2. PARAMETERS: Values, units, flags, and ranges.
3. EXPLANATIONS: Educational meanings.

OUTPUT:
An extremely short, warm, and direct chatbot response.
"""

class ChatbotService:
    # Sticky Model Tracking: {report_id: model_name}
    # Once a report flips to OpenAI, it stays there for the duration of the server session
    _sticky_models = {}

    def __init__(self):
        from app.services.gemini_service import GeminiService
        self.gemini = GeminiService()
        
        # Initialize OpenAI as fallback
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.openai_model = settings.OPENAI_MODEL

    async def generate_response(
        self, 
        question: str, 
        report_data: Dict, 
        parameters: List[Dict], 
        explanations: List[Dict],
        chat_history: Optional[List[Dict]] = None,
        report_id: Optional[str] = None
    ) -> str:
        """
        Generates a safe response using a hybrid approach:
        Try Gemini first, but switch permanently to OpenAI for this report if Gemini fails.
        """
        
        # 1. Pre-check for obviously unsafe keywords
        unsafe_keywords = ["prescribe", "medication for me", "diagnose me", "do i have cancer", "am i dying"]
        q_lower = question.lower()
        if any(k in q_lower for k in unsafe_keywords):
            return "I am an AI assistant and cannot provide medical diagnoses or prescribe medication. Please consult a qualified doctor for personal medical advice and treatment options."

        # 2. Build and Anonymize Context
        context_json = self._build_context_json(report_data, parameters, explanations)
        anonymized_context = anonymize_medical_data(context_json)
        
        full_prompt = f"{MEDIBOT_SYSTEM_PROMPT}\n\nCONTEXT:\n{anonymized_context}"
        
        # 3. Hybrid Execution Path
        try:
            # STICKY SWITCH CHECK
            if report_id and ChatbotService._sticky_models.get(report_id) == "openai":
                print(f"[CHATBOT] Report {report_id} is flagged for STICKY OpenAI usage. Skipping Gemini.")
                return await self._generate_openai_fallback(full_prompt, question, chat_history)

            # TRY GEMINI 
            print("[CHATBOT] Attempting Gemini call...")
            response_text, usage_metadata = self.gemini.chat_with_report_and_usage(full_prompt, question)
            
            # Token Limit Tracking (Proactive Switch)
            if usage_metadata and hasattr(usage_metadata, 'total_token_count'):
                if usage_metadata.total_token_count > settings.CHAT_TOKEN_LIMIT:
                    print(f"[CHATBOT] Gemini token limit reached. Switching report {report_id} to STICKY OpenAI.")
                    if report_id: ChatbotService._sticky_models[report_id] = "openai"
                    return await self._generate_openai_fallback(full_prompt, question, chat_history)
            
            return response_text

        except Exception as e:
            # Mark as Sticky OpenAI on error
            print(f"[WARNING] Chatbot Gemini call failed: {e}. Switching report {report_id} to STICKY OpenAI.")
            if report_id: ChatbotService._sticky_models[report_id] = "openai"
            
            # Immediate Fallback (No technical error message sent to user)
            return await self._generate_openai_fallback(full_prompt, question, chat_history)

    async def _generate_openai_fallback(self, system_prompt: str, question: str, chat_history: Optional[List[Dict]]) -> str:
        """Fallback to OpenAI for high availability"""
        if not self.openai_client:
            return "I'm currently unable to process your request. Please try again or consult your doctor for advice."
            
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add history if provided
        if chat_history:
            for msg in chat_history[-5:]: # Last 5 for context
                messages.append({
                    "role": "user" if msg.get("role") == "user" else "assistant",
                    "content": msg.get("content", "")
                })
        
        messages.append({"role": "user", "content": question})
        
        try:
            print("[CHATBOT] Calling OpenAI Chat Completion...")
            response = self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=messages,
                temperature=0.7,
                max_tokens=300
            )
            return response.choices[0].message.content
        except Exception as oe:
            print(f"[ERROR] OpenAI completion failed: {oe}")
            return "I apologize, but I'm unable to answer right now. Please consult your doctor for medical advice."

    def _build_context_json(self, report: Dict, params: List[Dict], explanations: List[Dict]) -> str:
        """Helper to format data for the LLM"""
        clean_params = []
        for p in params:
            item = {
                "name": p.get("name"),
                "value": p.get("value"),
                "unit": p.get("unit"),
                "ref_range": p.get("range") or p.get("normal_range"),
                "flag": p.get("flag"),
            }
            expl = next((e for e in explanations if e.get("parameter_id") == p.get("id")), None)
            if expl:
                item["explanation_meaning"] = expl.get("meaning")
            
            clean_params.append(item)
            
        context = {
            "report_metadata": {
                "type": report.get("type"),
                "date": report.get("date"),
                "lab": report.get("lab_name"),
                "patient_name": report.get("patient_name", "Unknown"), # We anonymize this later
                "overall_flag": report.get("flag_level")
            },
            "parameters": clean_params
        }
        
        return json.dumps(context, indent=2)
