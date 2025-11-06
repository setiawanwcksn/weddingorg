/**
 * Permission Guard Component
 * Protects routes based on user permissions
 * Redirects unauthorized users or shows access denied message
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  requiredPermission, 
  fallback 
}) => {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admin users have access to everything
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  // Check if user has the required permission
  if (hasPermission(requiredPermission)) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default access denied UI
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">Access Denied</h2>
      <p className="text-gray-600 max-w-md">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
};

export default PermissionGuard;