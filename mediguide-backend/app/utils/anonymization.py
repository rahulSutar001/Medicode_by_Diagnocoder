import re

def anonymize_medical_data(text: str) -> str:
    """
    Basic PII scrub for medical data.
    Removes patterns that look like full names (Capitalized First Last).
    """
    if not text:
        return ""
        
    # Redact common Name pattern: First Last (e.g., John Doe)
    # This is a basic pattern as requested by the user.
    anonymized = re.sub(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[Patient]', text)
    
    # Redact potential IDs (e.g., MRN-12345 or patient ID: 123)
    anonymized = re.sub(r'(?i)ID:?\s*\d+', 'ID: [Redacted]', anonymized)
    anonymized = re.sub(r'(?i)MRN:?\s*\d+', 'MRN: [Redacted]', anonymized)
    
    return anonymized
