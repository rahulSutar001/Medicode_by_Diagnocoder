/**
 * API Client for MediGuide Backend
 * Handles all communication with FastAPI backend
 */
import { supabase } from './supabase';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Get authentication headers with Supabase JWT token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Generic API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API request failed: ${response.statusText}`);
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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (reportType) {
    formData.append('report_type', reportType);
  }

  const response = await fetch(`${API_BASE_URL}/reports/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }

  return response.json();
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
  return apiRequest(`/reports/${reportId}/status`);
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
  return apiRequest(`/reports/${reportId}`);
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
  return apiRequest(`/reports/${reportId}/synthesis`);
}

/**
 * Trigger synthesis generation
 */
export async function generateReportSynthesis(reportId: string): Promise<{
  status: string;
  message: string;
}> {
  return apiRequest(`/reports/${reportId}/generate-synthesis`, {
    method: 'POST',
  });
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  return apiRequest(`/reports/${reportId}`, {
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
  if (params?.time_range) queryParams.append('time_range', params.time_range);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.user_id) queryParams.append('target_user_id', params.user_id);

  return apiRequest(`/reports?${queryParams.toString()}`);
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
  return apiRequest(`/reports/${reportId}/parameters`);
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
  return apiRequest(`/chat/reports/${reportId}/message`, {
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
  return apiRequest(`/chat/reports/${reportId}/history`);
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
  return apiRequest('/premium/status');
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
  return apiRequest('/family/members');
}

export async function inviteFamilyMember(data: { email?: string; phone_number?: string; nickname?: string }): Promise<{ connection_id: string; message: string }> {
  return apiRequest('/family/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function acceptFamilyConnection(connectionId: string, display_name?: string): Promise<{ message: string }> {
  return apiRequest(`/family/accept/${connectionId}`, {
    method: 'POST',
    body: JSON.stringify({ display_name }),
  });
}

export async function renameFamilyConnection(connectionId: string, display_name: string): Promise<{ message: string }> {
  return apiRequest(`/family/connections/${connectionId}/rename`, {
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
  return apiRequest('/chatbot/ask', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, question }),
  });
}
