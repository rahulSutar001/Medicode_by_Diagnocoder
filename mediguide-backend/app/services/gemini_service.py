import os
import json
import google.generativeai as genai
from PIL import Image
from openai import OpenAI
import io
import time
from app.core.config import settings

class GeminiService:
    def __init__(self):
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        # Using 2.5 Flash as per user request.
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Initialize OpenAI for fallback
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.openai_model = "gpt-4o" # Vision requires gpt-4o

    def generate_json(self, prompt: str) -> dict:
        """
        Generates a JSON response from the given prompt.
        """
        try:
            # Force JSON structure in prompt if not present
            if "JSON" not in prompt:
                prompt += "\n\nReturn strict JSON."
                
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Clean up markdown code blocks
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            return json.loads(text.strip())
        except Exception as e:
            print(f"[ERROR] Gemini JSON generation failed: {e}")
            raise e

    def generate_text(self, prompt: str) -> str:
        """
        Generates a plain text response.
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[ERROR] Gemini text generation failed: {e}")
            raise e

    def validate_medical_report(self, image_bytes: bytes) -> bool:
        """
        Validates if the image is a medical lab report.
        Returns True if medical, False otherwise.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            prompt = "Is this image a medical lab report or health document? Reply strictly with YES or NO."
            
            print("[GEMINI] Calling validation...")
            response = self.model.generate_content([prompt, image])
            answer = response.text.strip().upper()
            
            print(f"[DEBUG] Medical Validation: {answer}")
            return "YES" in answer
        except Exception as e:
            print(f"[WARNING] Gemini validation failed: {e}. Attempting OpenAI fallback...")
            if self.openai_client:
                return self._validate_via_openai(image_bytes)
            return False

    def _validate_via_openai(self, image_bytes: bytes) -> bool:
        """Fallback validation using OpenAI Vision"""
        import base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        try:
            print("[OPENAI] Calling validation fallback...")
            response = self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Is this image a medical lab report or health document? Reply strictly with YES or NO."},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                            },
                        ],
                    }
                ],
                max_tokens=10
            )
            answer = response.choices[0].message.content.strip().upper()
            print(f"[DEBUG] OpenAI Medical Validation: {answer}")
            return "YES" in answer
        except Exception as e:
            print(f"[ERROR] OpenAI Validation failed: {e}")
            return False

    def analyze_medical_report(self, image_bytes: bytes) -> dict:
        """
        Analyzes a medical report image using Gemini (with OpenAI fallback) and returns structured JSON data.
        """
        prompt = """
        You are an expert medical AI assistant. Analyze this medical lab report image and extract the following information in strict JSON format:
        
        1.  **patient_name**: Name of the patient (or "Unknown").
        2.  **patient_age**: Age of the patient (e.g., "45 years", "32Y"). Extracted directly from report.
        3.  **patient_gender**: Gender of the patient (e.g., "Male", "Female", "M", "F").
        4.  **date**: Date of the report (YYYY-MM-DD format required. Return null if not found or ambiguous).
        5.  **lab_name**: Name of the laboratory/hospital.
        6.  **report_type**: Type of report (e.g., "CBC", "Lipid Profile", "Thyroid Profile").
        7.  **parameters**: A list of test results, where each item has:
            -   **name**: Name of the test/parameter.
            -   **value**: Measured value.
            -   **unit**: Unit of measurement (e.g., mg/dL).
            -   **normal_range**: Reference range provided in the report.
            -   **flag**: "high", "low", or "normal" based on the value and range.
            -   **explanation**: A simplified, easy-to-understand explanation of what this result means for the patient (1 sentence).
        8.  **summary**: A brief, friendly summary of the report for the patient (2-3 sentences).
        
        Return ONLY the valid JSON object. Do not include markdown code blocks or additional text.
        """

        try:
            image = Image.open(io.BytesIO(image_bytes))
            print("[GEMINI] Calling analysis...")
            response = self.model.generate_content([prompt, image])
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            return json.loads(text.strip())

        except Exception as e:
            print(f"[WARNING] Gemini analysis failed: {e}. Attempting OpenAI fallback...")
            if self.openai_client:
                return self._analyze_via_openai(image_bytes, prompt)
            raise e

    def _analyze_via_openai(self, image_bytes: bytes, prompt: str) -> dict:
        """Fallback analysis using OpenAI Vision"""
        import base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        try:
            print("[OPENAI] Calling analysis fallback...")
            response = self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                            },
                        ],
                    }
                ],
                response_format={"type": "json_object"}
            )
            text = response.choices[0].message.content
            return json.loads(text)
        except Exception as e:
            print(f"[ERROR] OpenAI Analysis failed: {e}")
            raise e

    def chat_with_report(self, report_context: str, user_question: str) -> str:
        """
        Answers user questions based on the report context using Gemini.
        """
        try:
            text, _ = self.chat_with_report_and_usage(report_context, user_question)
            return text
        except Exception as e:
            raise e

    def chat_with_report_and_usage(self, report_context: str, user_question: str) -> tuple:
        """
        Answers user questions and returns both text and usage metadata for token tracking.
        """
        try:
            prompt = f"""
            Context: The user has uploaded a medical report with the following details:
            {report_context}
            
            User Question: {user_question}
            
            Answer the user's question accurately, helpful, and empathetic manner based ONLY on the provided context. 
            If the answer is not in the report, use general medical knowledge but clarify that it's general advice.
            Keep the answer concise and easy to understand.
            """
            
            response = self.model.generate_content(prompt)
            return response.text, response.usage_metadata
            
        except Exception as e:
            # Check for 429 specifically if possible, or just re-raise for service layer to catch
            print(f"Gemini Chat Error: {e}")
            raise e
