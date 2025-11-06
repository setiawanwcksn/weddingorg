import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './global.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { GuestsProvider } from './contexts/GuestsContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageGuests from './pages/ManageGuests';
import GuestDetails from './pages/GuestDetails';
import SendReminder from './pages/SendReminder';
import WelcomeDisplay from './pages/WelcomeDisplay';
import { AppLayout } from './components/layout/AppLayout';
import { ReceptionCheckIn } from './pages/ReceptionCheckIn';
import { Souvenirs } from './pages/Souvenirs';
import { Gifts } from './pages/Gifts';
import { Doorprize } from './pages/Doorprize';
import { DoorprizePicker } from './pages/DoorprizePicker';
import MessageTemplates from './pages/MessageTemplates';
import UsersRoles from './pages/UsersRoles';
import Profile from './pages/Profile';
import PermissionGuard from './components/common/PermissionGuard';

// Configure Tailwind theme to Lavender Wedding palette with mobile-first responsive utilities
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  ...window.tailwind.config,
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        brandSecondary: 'hsl(var(--brand-secondary))',
        accent: 'hsl(var(--accent))',
        background: 'hsl(var(--background))',
        text: 'hsl(var(--text))',
        border: 'hsl(var(--border))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        highlight: 'hsl(var(--highlight))',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      }
    }
  }
};

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-background min-h-[50vh]">
        <div className="text-center">
          <i data-lucide="loader" className="w-8 h-8 animate-spin text-primary mx-auto mb-4"></i>
          <p className="text-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <GuestsProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reception" element={
                  <PermissionGuard requiredPermission="reception">
                    <ReceptionCheckIn />
                  </PermissionGuard>
                } />
                <Route path="/souvenirs" element={<Souvenirs />} />
                <Route path="/gifts" element={<Gifts />} />
                <Route path="/doorprize" element={<Doorprize />} />
                <Route path="/doorprize/picker" element={<DoorprizePicker />} />
                <Route path="/guests" element={
                  <PermissionGuard requiredPermission="guests">
                    <ManageGuests />
                  </PermissionGuard>
                } />
                <Route path="/guests/send-reminder" element={
                  <PermissionGuard requiredPermission="guests">
                    <SendReminder />
                  </PermissionGuard>
                } />
                <Route path="/guests/:id" element={
                  <PermissionGuard requiredPermission="guests">
                    <GuestDetails />
                  </PermissionGuard>
                } />
                <Route path="/message-templates" element={<MessageTemplates />} />
                <Route path="/users" element={<UsersRoles />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="/welcome-display" element={<WelcomeDisplay />} />
            </Routes>
          </GuestsProvider>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;