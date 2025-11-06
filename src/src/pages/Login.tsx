/**
 * Login page component for Lavender Wedding platform
 * Handles user authentication with email/password and Google OAuth
 * Integrates with backend authentication API
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log(`[login] Attempting login with username: ${formData.username}`);
    
    try {
      await login(formData.username, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(`[login] Login error:`, err);
      const errorMessage = err.message || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
      
      // Show detailed error in console for debugging
      console.error(`[login] Detailed error:`, {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/setup-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup demo account');
      }

      const result = await response.json();
      console.log(`[login] Demo setup result:`, result);
      
      // Auto-login with demo credentials
      await login('demo', 'demo123');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(`[login] Demo setup error:`, err);
      setError('Failed to setup demo account. Please try manual login.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent px-4 py-12">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-text">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>
          
          {/* Mobile-friendly form container */}
          <div className="space-y-4 sm:space-y-5">

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text mb-1 sm:mb-2">
                Username
              </label>
              <div className="relative">
                <i data-lucide="user" className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"></i>
                <input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <i data-lucide="lock" className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"></i>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                  disabled={loading}
                />
                <span className="select-none">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 sm:py-3.5 rounded-lg hover:bg-indigo-500 transition-all text-sm sm:text-base font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i data-lucide="loader" className="w-4 h-4 animate-spin"></i>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;