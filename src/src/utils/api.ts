
const RAW = (import.meta as any)?.env?.VITE_API_URL;
const API_BASE = (typeof RAW === 'string' && RAW !== 'undefined' ? RAW : '').replace(/\/+$/, ''); // '' atau '/api'

/**
 * API utility functions
 * Handles API URL construction and common API operations
 */

/**
 * Get the base API URL
 * Handles cases where process.env.AIPA_API_DOMAIN might not be set
 */
export function getApiUrl(path: string): string {
  const baseUrl = API_BASE;
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;
  console.log('API URL constructed:', { baseUrl, path: cleanPath, fullUrl });
  return fullUrl;
}

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(userId?: string): Record<string, string> {
  // Use unified localStorage for consistent auth across tabs
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (userId) {
    headers['user-id'] = userId;
  }
  
  console.log('Auth headers:', { hasToken: !!token, hasUserId: !!userId, userId });
  return headers;
}

/**
 * Handle API response and errors
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  console.log('Handling API response:', { status: response.status, statusText: response.statusText });
  
  const data = await response.json();
  console.log('Response data:', data);
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}