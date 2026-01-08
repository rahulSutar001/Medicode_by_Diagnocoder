# MediGuide AI - FastAPI Architecture Design

## ARCHITECTURE DECISIONS

### Tech Stack
- **FastAPI** - Async web framework
- **Supabase-py** - Direct Supabase client (respects RLS)
- **PostgreSQL** - Via Supabase (no direct connection)
- **Supabase Storage** - File storage for report images
- **Celery/Background Tasks** - Async OCR/AI processing
- **OpenAI/Anthropic** - LLM for explanations & chatbot
- **Tesseract/Google Vision** - OCR service

### Supabase Integration Strategy

**Decision: Use `supabase-py` with anon key (NOT service-role)**
- ✅ Respects RLS automatically
- ✅ User context from JWT
- ✅ No security bypass needed

**When to use service-role key:**
- ❌ Only for background jobs that need to write to storage
- ❌ Only for admin operations (if needed)
- ✅ Use sparingly, with explicit justification

### User Context Extraction
```python
# From JWT in Authorization header
# Verify with Supabase
# Extract user_id
# Use in all queries (RLS handles the rest)
```

---

## FOLDER STRUCTURE

```
mediguide-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings (env vars)
│   │   ├── security.py          # JWT verification, user extraction
│   │   └── dependencies.py     # FastAPI dependencies
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py              # Shared dependencies
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── reports.py       # Report endpoints
│   │       ├── chat.py          # Chatbot endpoints
│   │       ├── family.py        # Family endpoints
│   │       ├── premium.py       # Premium endpoints
│   │       └── trends.py        # Trends endpoints (premium)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── report_service.py    # Report CRUD logic
│   │   ├── ocr_service.py       # OCR processing
│   │   ├── ai_service.py        # LLM calls (explanations, chat)
│   │   ├── safety_service.py    # Critical value detection
│   │   ├── premium_service.py   # Premium checks
│   │   └── family_service.py     # Family connection logic
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── report.py            # Report Pydantic models
│   │   ├── chat.py              # Chat Pydantic models
│   │   ├── family.py            # Family Pydantic models
│   │   └── common.py            # Common models (errors, etc.)
│   │
│   ├── supabase/
│   │   ├── __init__.py
│   │   ├── client.py            # Supabase client setup
│   │   └── storage.py           # Storage operations
│   │
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── prompts.py           # LLM prompts (safety-focused)
│   │   ├── explanations.py      # Explanation generation
│   │   └── chatbot.py           # Chatbot logic
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── ocr.py               # OCR utilities
│   │   └── validators.py        # Medical data validators
│   │
│   └── tasks/
│       ├── __init__.py
│       └── background.py        # Background job processing
│
├── .env.example
├── requirements.txt
├── README.md
└── docker-compose.yml           # Optional: for local dev
```

---

## CORE MODULES DETAILED

### 1. core/security.py
```python
# JWT verification from Supabase
# Extract user_id from token
# Return user context for dependencies
```

### 2. core/config.py
```python
# Environment variables:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (for storage only)
# - OPENAI_API_KEY (or ANTHROPIC_API_KEY)
# - OCR_SERVICE_API_KEY (if using cloud OCR)
```

### 3. api/deps.py
```python
# get_current_user() - Dependency for auth
# get_premium_status() - Dependency for premium checks
```

### 4. services/report_service.py
- Create report record
- Upload image to Supabase Storage
- Trigger background OCR task
- Fetch report details
- List reports with filters
- Delete reports

### 5. services/ocr_service.py
- Process image → text
- Parse structured data
- Detect report type
- Extract parameters

### 6. services/ai_service.py
- Generate explanations (with safety prompts)
- Chatbot responses (with hard refusal rules)
- Context management

### 7. services/safety_service.py
- Critical value detection
- Flag classification (red/yellow/green)
- Threshold validation
- Emergency flag generation

### 8. services/premium_service.py
- Check subscription status
- Enforce free tier limits
- Track usage

---

## PYDANTIC MODELS

### Request Models
```python
class ReportUploadRequest(BaseModel):
    image: UploadFile
    report_type: Optional[str] = None  # Auto-detect if not provided

class ReportListRequest(BaseModel):
    search: Optional[str] = None
    report_type: Optional[str] = None
    flag_level: Optional[Literal['green', 'yellow', 'red']] = None
    time_range: Optional[Literal['7d', '30d', '90d', 'all']] = None
    page: int = 1
    limit: int = 20

class ChatMessageRequest(BaseModel):
    message: str
    report_id: str

class CompareReportsRequest(BaseModel):
    report_id_1: str
    report_id_2: str
    parameter_name: Optional[str] = None  # Compare specific param
```

### Response Models
```python
class ReportResponse(BaseModel):
    id: str
    date: str
    type: str
    lab_name: str
    flag_level: Literal['green', 'yellow', 'red']
    uploaded_to_abdm: bool
    status: Literal['processing', 'completed', 'failed']
    created_at: datetime

class TestParameterResponse(BaseModel):
    name: str
    value: str
    range: str
    flag: Literal['normal', 'high', 'low']
    explanation: ExplanationResponse

class ExplanationResponse(BaseModel):
    what: str
    meaning: str
    causes: List[str]
    next_steps: List[str]

class ChatMessageResponse(BaseModel):
    id: str
    message: str
    response: str
    created_at: datetime

class ErrorResponse(BaseModel):
    error: str
    message: str
    code: Optional[str] = None
```

---

## ERROR HANDLING

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing JWT)
- `403` - Forbidden (premium required, RLS violation)
- `404` - Not Found
- `429` - Too Many Requests (free tier limit)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "PREMIUM_REQUIRED",
  "message": "This feature requires a premium subscription",
  "code": "PREMIUM_REQUIRED"
}
```

---

## BACKGROUND PROCESSING

### Flow
1. User uploads image → FastAPI receives
2. Store image in Supabase Storage
3. Create report record (status: 'processing')
4. Trigger background task (Celery/BackgroundTasks)
5. Background task:
   - Run OCR
   - Extract parameters
   - Generate AI explanations
   - Update report status to 'completed'
6. Frontend polls `/api/reports/{id}/status` or uses WebSocket

### Implementation Options
- **FastAPI BackgroundTasks** - Simple, good for MVP
- **Celery + Redis** - Production-grade, scalable
- **Supabase Edge Functions** - Serverless option

**Recommendation:** Start with BackgroundTasks, migrate to Celery if needed.

---

## SAFETY PROMPTS (CRITICAL)

### Explanation Generation Prompt
```
You are a medical information assistant. Your role is to explain medical test results in an educational, non-diagnostic manner.

RULES:
- Explain what the test measures
- Explain what the result means in general terms
- List common causes (general, not specific to this patient)
- Suggest "consult your doctor" for abnormal values
- NEVER provide diagnosis
- NEVER suggest specific treatments
- NEVER prescribe medications

Test: {parameter_name}
Value: {value}
Normal Range: {range}
Flag: {flag}
```

### Chatbot Prompt
```
You are a medical information assistant helping users understand their lab reports.

CONTEXT:
- Report Type: {report_type}
- Test Parameters: {parameters}

RULES:
- Answer questions about what tests mean
- Explain medical terms
- Provide educational information
- For abnormal values, ALWAYS suggest "consult your doctor"
- REFUSE to provide:
  * Diagnoses
  * Treatment recommendations
  * Prescription suggestions
  * Medical advice specific to the user's condition

If asked about diagnosis or treatment, respond:
"I cannot provide medical diagnoses or treatment recommendations. Please consult with a qualified healthcare provider for personalized medical advice."
```

---

## PREMIUM ENFORCEMENT

### Free Tier Limits
- 3 reports/month
- 2 family members
- Basic explanations (shorter, less detailed)
- No trends
- No export

### Premium Checks
```python
# In dependencies
async def require_premium(user_id: str):
    is_premium = await premium_service.check_subscription(user_id)
    if not is_premium:
        raise HTTPException(403, "Premium subscription required")
    return True
```

---

## FRONTEND INTEGRATION

### Auth Header
```
Authorization: Bearer <supabase_jwt_token>
```

### Example Request
```typescript
const response = await fetch('http://api.mediguide.ai/api/reports', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Example Upload
```typescript
const formData = new FormData();
formData.append('image', file);

const response = await fetch('http://api.mediguide.ai/api/reports/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  },
  body: formData
});
```
