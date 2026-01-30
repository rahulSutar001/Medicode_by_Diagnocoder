/**
 * API Client for MediGuide Backend
 * Handles all communication with FastAPI backend
 */
import { supabase } from './supabase';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is not defined in environment variables');
}

/**
 * Centralized API Client
 * Ensures all requests are authenticated and logged
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.error("❌ No Supabase session found");
    throw new Error('User is not authenticated');
  }

  console.log("✅ Using access token:", session.access_token.slice(0, 20), "...");

  const headers: HeadersInit = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
  };

  // Auto-set Content-Type to json if not set and body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  console.log("API REQUEST:", {
    url: `${API_BASE_URL}${endpoint}`,
    tokenPresent: !!session?.access_token,
    tokenPreview: session?.access_token?.slice(0, 20),
  });

  console.log("HEADERS SENT:", headers);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }));
    const error = new Error(errorBody.detail || errorBody.message || `API request failed: ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Upload file to backend
 */
export async function uploadReport(file: File, reportType?: string): Promise<{
  report_id: string;
  status: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (reportType) {
    formData.append('report_type', reportType);
  }

  // apiFetch will handle auth headers. 
  // We do NOT set Content-Type here so apiFetch/fetch detects FormData and sets multipart boundary
  return apiFetch('/reports/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Get report processing status
 */
export async function getReportStatus(reportId: string): Promise<{
  report_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  error_message?: string;
}> {
  return apiFetch(`/reports/${reportId}/status`);
}

/**
 * Get report details
 */
export async function getReport(reportId: string): Promise<{
  id: string;
  user_id: string;
  date: string;
  type: string;
  lab_name?: string;
  flag_level: 'green' | 'yellow' | 'red';
  uploaded_to_abdm: boolean;
  status: 'processing' | 'completed' | 'failed';
  image_url?: string;
  created_at: string;
  updated_at: string;
}> {
  return apiFetch(`/reports/${reportId}`);
}

/**
 * Get report synthesis (smart summary)
 */
export async function getReportSynthesis(reportId: string): Promise<{
  status_summary: string;
  key_trends: string[];
  doctor_precis: string;
  status: string; // Added status
}> {
  return apiFetch(`/reports/${reportId}/synthesis`);
}

/**
 * Trigger synthesis generation
 */
export async function generateReportSynthesis(reportId: string): Promise<{
  status: string;
  message: string;
}> {
  return apiFetch(`/reports/${reportId}/generate-synthesis`, {
    method: 'POST',
  });
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  return apiFetch(`/reports/${reportId}`, {
    method: 'DELETE',
  });
}

/**
 * List reports with filters
 */
export async function listReports(params?: {
  search?: string;
  report_type?: string;
  flag_level?: 'green' | 'yellow' | 'red';
  time_range?: '7d' | '30d' | '90d' | 'all';
  page?: number;
  limit?: number;
  user_id?: string;
  status?: string;
}): Promise<{
  items: any[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.report_type) queryParams.append('report_type', params.report_type);
  if (params?.flag_level) queryParams.append('flag_level', params.flag_level);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.time_range) queryParams.append('time_range', params.time_range);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.user_id) queryParams.append('target_user_id', params.user_id);

  return apiFetch(`/reports?${queryParams.toString()}`);
}

/**
 * Get report parameters with explanations
 */
export async function getReportParameters(reportId: string): Promise<Array<{
  id: string;
  name: string;
  value: string;
  unit?: string;
  normal_range: string;
  flag: 'normal' | 'high' | 'low';
  report_explanations?: Array<{
    what: string;
    meaning: string;
    causes: string[];
    next_steps: string[];
  }>;
}>> {
  return apiFetch(`/reports/${reportId}/parameters`);
}

/**
 * Send chatbot message
 */
export async function sendChatMessage(
  reportId: string,
  message: string
): Promise<{
  id: string;
  report_id: string;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
}> {
  return apiFetch(`/chat/reports/${reportId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message, report_id: reportId }),
  });
}

/**
 * Get chat history
 */
export async function getChatHistory(reportId: string): Promise<{
  messages: Array<{
    id: string;
    message: string;
    response: string;
    created_at: string;
  }>;
  total: number;
}> {
  return apiFetch(`/chat/reports/${reportId}/history`);
}

/**
 * Get premium status
 */
export async function getPremiumStatus(): Promise<{
  is_premium: boolean;
  subscription_tier: 'free' | 'premium';
  expires_at?: string;
  reports_used_this_month: number;
  reports_limit: number | null;
  family_members_count: number;
  family_members_limit: number | null;
}> {
  return apiFetch('/premium/status');
}
// Family
export interface FamilyMember {
  connection_id: string;
  user_id: string;
  display_name?: string;
  profile_name?: string;
  phone?: string;
  status: 'good' | 'needs-review' | 'critical' | 'pending';
  connection_status: 'connected' | 'pending-sent' | 'pending-received';
  created_at: string;
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  return apiFetch('/family/members');
}

export async function inviteFamilyMember(data: { email?: string; phone_number?: string; nickname?: string; target_user_id?: string }): Promise<{ connection_id: string; message: string }> {
  return apiFetch('/family/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function acceptFamilyConnection(connectionId: string, display_name?: string): Promise<{ message: string }> {
  return apiFetch(`/family/accept/${connectionId}`, {
    method: 'POST',
    body: JSON.stringify({ display_name }),
  });
}

export async function renameFamilyConnection(connectionId: string, display_name: string): Promise<{ message: string }> {
  return apiFetch(`/family/connections/${connectionId}/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ display_name }),
  });
}

/**
 * Ask MediBot a question (NEW V1)
 */
export async function askMediBot(
  reportId: string,
  question: string
): Promise<{ response: string }> {
  return apiFetch('/chatbot/ask', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, question }),
  });
}
