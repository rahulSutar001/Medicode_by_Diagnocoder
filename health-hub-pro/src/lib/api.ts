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
 * List reports with filters
 */
export async function listReports(params?: {
  search?: string;
  report_type?: string;
  flag_level?: 'green' | 'yellow' | 'red';
  time_range?: '7d' | '30d' | '90d' | 'all';
  page?: number;
  limit?: number;
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
  
  return apiRequest(`/reports?${queryParams.toString()}`);
}

/**
 * Get report parameters with explanations
 */
export async function getReportParameters(reportId: string): Promise<{
  parameters: Array<{
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
  }>;
}> {
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
