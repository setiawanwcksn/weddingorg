/**
 * AppLayout wraps all authenticated pages with a persistent Sidebar and top header.
 * It renders breadcrumbs derived from the current hash route and an Outlet for page content.
 * Now includes user information and logout functionality.
 * Used by routes in App.tsx to make the sidebar accessible across pages.
 */
import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LayoutGrid, Menu, LogOut, User, Calendar, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveWeddingToCalendar } from '../../utils/calendar';
import { useState } from 'react';
import { apiUrl } from '../../lib/api';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, apiRequest } = useAuth();
  const parts = location.pathname.split('/').filter(Boolean);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [weddingData, setWeddingData] = useState<any>(null);
  const [loadingWedding, setLoadingWedding] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchWeddingData = async () => {
    if (!user?.accountId) return;
    
    try {
      setLoadingWedding(true);
      const response = await apiRequest(apiUrl(`/api/auth/accounts/${user.accountId}`));
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.account) {
          setWeddingData(result.data.account);
          return result.data.account;
        }
      }
    } catch (error) {
      console.error('Failed to fetch wedding data:', error);
    } finally {
      setLoadingWedding(false);
    }
    return null;
  };

  const handleSaveTheDate = async () => {
    try {
      let data = weddingData;
      if (!data) {
        data = await fetchWeddingData();
      }
      
      if (data && data.dateTime) {
        const weddingDate = new Date(data.dateTime);
        const title = data.title || 'Wedding Celebration';
        const location = data.location || '';
        const description = `Save the date for ${title}`;
        
        saveWeddingToCalendar(title, weddingDate, location, description);
      } else {
        console.error('Wedding data not available');
      }
    } catch (error) {
      console.error('Failed to save the date:', error);
    }
  };

  const handleOpenUserMenu = async () => {
    const willOpen = !userMenuOpen;
    setUserMenuOpen(willOpen);
    if (willOpen && !weddingData) {
      await fetchWeddingData();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [userMenuOpen]);

  return (
    <div className="bg-background text-text overflow-x-hidden min-h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-primary">Lavender</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <Sidebar mobileMenuOpen={mobileMenuOpen} onMobileMenuClose={() => setMobileMenuOpen(false)} />
        
        <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <div className="flex items-center justify-between mt-2 md:mt-2 px-4 sm:px-6 md:px-8">
            <nav className="text-sm text-text/70 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <Link to="/dashboard" className="hover:underline whitespace-nowrap transition-colors">Dashboard</Link>
              {parts.map((p, idx) => (
                <span key={idx} className="flex items-center gap-2">
                  <span className="text-text/40">›</span>
                  <span className={idx === parts.length - 1 ? 'font-medium text-text' : 'hover:underline'}>{decodeURIComponent(p)}</span>
                </span>
              ))}
            </nav>
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleOpenUserMenu}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-border flex items-center justify-center">
                  <User className="w-4 h-4 text-text/60" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-text">{user?.name || 'User'}</span>
              </button>
              
              {/* Profile Dropdown (anchored under avatar, position unchanged) */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-background rounded-xl shadow-lg border border-border z-50">
                  <div className="px-8 pt-10 pb-6 text-center">
          <div className="mx-auto w-28 h-28 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center shadow-sm">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name || 'avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6fb8ff] to-[#9b7bff] flex items-center justify-center text-white font-bold text-2xl">
                {(user?.name || 'U').slice(0,1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
                  <div className="divide-border">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/dashboard'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <Moon className="w-5 h-5 text-text/70" />
                      <span className="text-sm">Theme</span>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleSaveTheDate(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left disabled:opacity-60 mb-3"
                      disabled={loadingWedding}
                    >
                      <Calendar className="w-5 h-5 text-text/70" />
                      <span className="text-sm">Save The Date</span>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <LogOut className="w-5 h-5 text-text/70" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-accent text-gray-800">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
