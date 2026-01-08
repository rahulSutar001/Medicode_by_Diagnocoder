# MediGuide AI - Backend Analysis & Architecture

## STEP 1: PRODUCT UNDERSTANDING

### Core Product Features
1. **Medical Report Scanner** - Upload lab reports, OCR extraction, AI analysis
2. **Health Tracking** - Historical reports, trends, parameter comparison
3. **Family Monitoring** - Connect family members, share health data
4. **AI Explanations** - Detailed explanations of test results
5. **Chatbot** - Report-context aware Q&A (NO diagnosis/prescriptions)
6. **Premium Features** - Free tier limits, premium unlocks

### Frontend Screens & Backend Dependencies

| Screen | Backend Requirements |
|--------|---------------------|
| **HomeScreen** | - Premium status check<br>- Free scans remaining<br>- Recent reports summary |
| **ScanScreen** | - Image upload endpoint<br>- Trigger OCR processing |
| **ScanningScreen** | - Poll processing status<br>- WebSocket/SSE for real-time updates |
| **ReportResultScreen** | - Fetch report details<br>- Fetch test parameters<br>- AI explanations<br>- Chatbot context |
| **HistoryScreen** | - List reports with filters<br>- Search functionality<br>- Compare reports endpoint |
| **FamilyScreen** | - List family connections<br>- Connection requests<br>- Family member reports |

### Data Structures (From Frontend)

#### Report Interface
```typescript
interface Report {
  id: string;
  date: string;           // "Jan 3, 2025"
  type: string;            // "Lipid Panel", "CBC", "BMP", etc.
  labName: string;         // "CityLab Diagnostics"
  flagLevel: 'green' | 'yellow' | 'red';
  uploadedToABDM: boolean;
}
```

#### Test Result (ReportResultScreen)
```typescript
interface TestResult {
  name: string;           // "Total Cholesterol"
  value: string;          // "210 mg/dL"
  range: string;           // "< 200 mg/dL"
  flag: 'normal' | 'high' | 'low';
  explanation: {
    what: string;
    meaning: string;
    causes: string[];
    nextSteps: string[];
  };
}
```

#### Family Member
```typescript
interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  status: 'good' | 'needs-review' | 'critical' | 'pending';
  connectionStatus: 'connected' | 'pending-sent' | 'pending-received';
}
```

### Premium Features (From PremiumModal)
- **Free Tier:**
  - 3 scans/month
  - Basic AI explanations
  - 2 family members
  - No health trends
  - No export reports
  - No priority support

- **Premium Tier:**
  - Unlimited scans
  - Detailed AI explanations
  - Unlimited family members
  - Health trends
  - Export reports
  - Priority support

### Safety Constraints (CRITICAL)
❌ **NEVER:**
- Provide medical diagnosis
- Suggest prescriptions
- Give treatment recommendations
- Replace doctor consultation

✅ **ONLY:**
- Explain what test parameters mean
- Provide educational context
- Flag critical values (red/yellow/green)
- Suggest "consult your doctor" for abnormal values

---

## STEP 2: BACKEND RESPONSIBILITY MAP

### Supabase Handles (Already Working)
✅ User authentication (JWT)
✅ User profiles (`profiles` table)
✅ Row Level Security (RLS)
✅ Database storage

### FastAPI Must Handle
1. **Report Upload & Processing**
   - Accept image uploads
   - Store in Supabase Storage (via service-role key)
   - Trigger OCR pipeline
   - Extract structured data
   - Store in `reports` and `report_parameters` tables

2. **OCR Pipeline**
   - Integrate OCR service (Tesseract/Google Vision/Cloud OCR)
   - Extract text from medical reports
   - Parse structured data (test names, values, ranges)
   - Handle multiple report formats

3. **AI Explanation Generation**
   - Generate explanations for each parameter
   - Use LLM (OpenAI/Anthropic/Local) with strict prompts
   - Enforce safety rules (no diagnosis)
   - Store explanations in database

4. **Safety Engine**
   - Critical value detection
   - Flag classification (red/yellow/green)
   - Emergency flag generation
   - Threshold validation

5. **Chatbot Service**
   - Report-scoped conversations
   - Context-aware responses
   - Hard refusal for diagnosis/prescription queries
   - Conversation persistence

6. **Report History & Comparison**
   - List reports with filters
   - Search functionality
   - Compare parameters across reports
   - Trend calculations

7. **Premium Enforcement**
   - Check subscription status
   - Enforce free tier limits
   - Feature gating

8. **Family Connections**
   - Connection requests
   - Accept/decline logic
   - Shared report access (with RLS)

---

## STEP 3: REQUIRED API ENDPOINTS

### Report Management
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| POST | `/api/reports/upload` | Upload report image | ✅ | Free (3/month) |
| GET | `/api/reports/{report_id}/status` | Check processing status | ✅ | - |
| GET | `/api/reports/{report_id}` | Get report details | ✅ | - |
| GET | `/api/reports` | List reports (with filters) | ✅ | - |
| POST | `/api/reports/compare` | Compare 2 reports | ✅ | Premium |
| DELETE | `/api/reports/{report_id}` | Delete report | ✅ | - |

### Report Parameters
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| GET | `/api/reports/{report_id}/parameters` | Get test parameters | ✅ | - |
| GET | `/api/reports/{report_id}/explanations` | Get AI explanations | ✅ | Basic/Detailed |

### Chatbot
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| POST | `/api/reports/{report_id}/chat` | Send message | ✅ | - |
| GET | `/api/reports/{report_id}/chat/history` | Get chat history | ✅ | - |

### Family
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| GET | `/api/family/members` | List family members | ✅ | Free (2) |
| POST | `/api/family/invite` | Send connection request | ✅ | Premium (unlimited) |
| POST | `/api/family/accept/{request_id}` | Accept connection | ✅ | - |
| DELETE | `/api/family/connection/{connection_id}` | Remove connection | ✅ | - |

### Premium
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| GET | `/api/premium/status` | Check subscription | ✅ | - |
| GET | `/api/premium/usage` | Get usage stats | ✅ | - |

### Health Trends (Premium)
| Method | Path | Purpose | Auth | Premium |
|--------|------|---------|------|---------|
| GET | `/api/trends/{parameter_name}` | Get parameter trends | ✅ | ✅ Required |

---

## STEP 4: SUPABASE SCHEMA (ASSUMED)

### Tables (Must Exist)
- `profiles` - User profiles (already working)
- `reports` - Medical reports
- `report_parameters` - Test parameters extracted from reports
- `report_explanations` - AI-generated explanations
- `family_connections` - Family member connections
- `chat_messages` - Chatbot conversation history
- `subscriptions` - Premium subscription status
- `usage_stats` - Free tier usage tracking

### RLS Policies (Must Respect)
- Users can only read/write their own reports
- Family connections allow read access to connected members' reports
- Chat messages scoped to report + user

---

## STEP 5: MISSING BACKEND LOGIC

### Not Handled by Supabase
1. **OCR Processing** - Image → Text → Structured data
2. **AI Explanation Generation** - LLM calls with safety constraints
3. **Critical Value Detection** - Medical threshold logic
4. **Report Type Detection** - Classify report type (CBC, Lipid Panel, etc.)
5. **Background Job Processing** - Async OCR/AI tasks
6. **File Storage Management** - Supabase Storage operations
7. **Premium Limit Enforcement** - Usage tracking & blocking
8. **Chatbot Logic** - Context-aware responses with safety rules

---

## NEXT STEPS

1. ✅ Confirm Supabase schema exists
2. ✅ Design FastAPI architecture
3. ✅ Implement core modules
4. ✅ Provide frontend integration guide
