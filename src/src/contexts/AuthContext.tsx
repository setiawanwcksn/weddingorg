/**
 * Authentication Context
 * Provides user authentication state and account-based data isolation
 * Handles login, logout, and token management for API requests
 * Supports tab isolation for independent sessions across browser tabs
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../../../shared/types';

// Import SWR cache management
import { mutate as swrMutate } from 'swr';
import { apiUrl } from '../lib/api';


interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (name: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>;
  hasPermission: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Use unified localStorage for consistent auth across tabs
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for storage changes (other tabs login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_user') {
        console.log(`[AuthContext] Storage changed in another tab: ${e.key}`);
        
        if (e.key === 'auth_token') {
          if (e.newValue) {
            setToken(e.newValue);
          } else {
            setToken(null);
            setUser(null);
          }
        }
        
        if (e.key === 'auth_user' && e.newValue) {
          try {
            const parsedUser = JSON.parse(e.newValue);
            setUser(parsedUser);
          } catch (error) {
            console.error('[AuthContext] Failed to parse user from storage event:', error);
            setUser(null);
          }
        } else if (e.key === 'auth_user' && !e.newValue) {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Remove tab isolation - use unified auth across tabs
  // This ensures consistent authentication state across all browser tabs

  // Fetch user permissions when user is authenticated
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (user && user.role === 'user' && token) {
        try {
          console.log(`[AuthContext] Fetching permissions for user: ${user.id}`);
          const response = await fetch(apiUrl(`/users/${user.id}/permissions`), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          console.log(`[AuthContext] Permissions response status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log(`[AuthContext] Permissions response:`, result);
            if (result.success && result.data) {
              setUser(prevUser => prevUser ? {
                ...prevUser,
                permissions: result.data
              } : null);
              console.log(`[AuthContext] Updated user with permissions:`, result.data);
            }
          } else {
            const errorText = await response.text();
            console.error(`[AuthContext] Failed to fetch permissions: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.error('[AuthContext] Failed to fetch user permissions:', error);
        }
      }
    };

    if (user && user.role === 'user' && token) {
      fetchUserPermissions();
    }
  }, [user?.id, user?.role, token]);

  // Login with username and password
  const login = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      console.log(`[auth] Attempting login for: ${username}`);
      
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log(`[auth] Login response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[auth] Login failed with status ${response.status}:`, errorText);
        
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || 'Login failed';
        } catch {
          errorMessage = errorText || 'Login failed';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`[auth] Login result:`, result);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      
      if (!result.data) {
        throw new Error('No user data returned from server');
      }
      
      const data: AuthResponse = result.data;
      
      // If permissions are already included in login response, use them
      let userWithPermissions = data.user;
      if (data.user.role === 'user' && data.user.permissions) {
        console.log(`[AuthContext] Permissions already included in login response:`, data.user.permissions);
        userWithPermissions = data.user;
      } else if (data.user.role === 'user') {
        // Fetch permissions for user role if not included
        try {
          console.log(`[AuthContext] Fetching permissions for newly logged in user: ${data.user.id}`);
          const permissionsResponse = await fetch(apiUrl(`/users/${data.user.id}/permissions`), {
            headers: {
              'Authorization': `Bearer ${data.token}`,
            },
          });
          
          if (permissionsResponse.ok) {
            const permissionsResult = await permissionsResponse.json();
            console.log(`[AuthContext] Permissions fetched after login:`, permissionsResult);
            if (permissionsResult.success && permissionsResult.data) {
              userWithPermissions = {
                ...data.user,
                permissions: permissionsResult.data
              };
            }
          }
        } catch (error) {
          console.error('[AuthContext] Failed to fetch permissions after login:', error);
        }
      }
      
      // Store auth data in localStorage for unified access across tabs
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(userWithPermissions));
      
      setToken(data.token);
      setUser(userWithPermissions);
      
      console.info(`[auth] User ${data.user.username} logged in successfully`);
    } catch (error) {
      console.error('[auth] Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login with Google OAuth
  const loginWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // For demo purposes, create a mock Google login
      // In production, this would redirect to Google OAuth flow
      const mockUser: User = {
        id: 'google_' + Date.now(),
        username: 'demo',
        name: 'Demo User',
        accountId: 'account_' + Date.now(),
        role: 'admin'
      };
      
      const mockToken = 'mock_google_token_' + Date.now();
      
      // Store in unified localStorage for cross-tab consistency
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      setToken(mockToken);
      setUser(mockUser);
      
      console.info(`[auth] Google user ${mockUser.username} logged in successfully`);
    } catch (error) {
      console.error('[auth] Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = (): void => {
    // Clear SWR cache for all guest data to prevent cross-account data leakage
    swrMutate(
      (key) => {
        // Match any SWR keys that contain guest-related endpoints
        return Array.isArray(key) && key.some(k => 
          typeof k === 'string' && k.includes('/api/guests')
        );
      },
      undefined,
      { revalidate: false }
    );
    
    // Clear unified auth storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    console.info('[auth] User logged out and SWR cache cleared');
  };

  // Sign up with username and password
  const signup = async (name: string, username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      console.log(`[auth] Attempting signup for: ${username}`);
      
      const response = await fetch(apiUrl(`/auth/register`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, password }),
      });

      console.log(`[auth] Signup response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[auth] Signup failed with status ${response.status}:`, errorText);
        
        let errorMessage = 'Registration failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || 'Registration failed';
        } catch {
          errorMessage = errorText || 'Registration failed';
        }
        
        console.error(`[auth] Final error message:`, errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`[auth] Signup result:`, result);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }
      
      const data: AuthResponse = result.data;
      
      // Store in unified localStorage for cross-tab consistency
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      console.info(`[auth] User ${data.user.username} registered successfully`);
    } catch (error) {
      console.error('[auth] Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // API Client function with authentication
  const apiRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`[AuthContext] Adding Authorization header: Bearer ${token.substring(0, 20)}...`);
    } else {
      console.log(`[AuthContext] No token available for request`);
    }

    // Add X-User-Id header if user is authenticated
    if (user?.id) {
      headers['X-User-Id'] = user.id;
      console.log(`[AuthContext] Adding X-User-Id header: ${user.id}`);
    }

    console.log(`[AuthContext] Making request to: ${url}`);
    console.log(`[AuthContext] Headers:`, headers);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`[AuthContext] Response status: ${response.status}`);

    // Handle unauthorized responses
    if (response.status === 401) {
      console.log(`[AuthContext] 401 response received, logging out`);
      logout();
      throw new Error('Authentication required');
    }

    return response;
  };

  // Check if user has permission to access a specific page
  const hasPermission = (page: string): boolean => {
    // Admin users have access to all pages
    if (user?.role === 'admin') {
      return true;
    }
    
    // Regular users need explicit permissions
    if (user?.role === 'user' && user.permissions) {
      const permission = user.permissions.find(p => p.page === page);
      return permission ? permission.canAccess : false;
    }
    
    // Default to no access if no permissions defined
    return false;
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user && !!token,
    apiRequest,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};