import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Settings,
  Shield,
  Home,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function Sidebar({ mobileMenuOpen = false, onMobileMenuClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();

  // Base style item
  const linkBase =
    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors select-none';

  // Style states
  const active =
    'bg-gray-100 text-blue-600 font-medium'; // aktif = abu muda + teks biru
  const inactive =
    'text-gray-700 hover:bg-gray-50 hover:text-blue-600'; // default = teks abu tua, hover = abu muda
  const restricted =
    'opacity-50 cursor-not-allowed text-gray-400';

  // Daftar menu
  const allNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home, permission: 'guests' },
    { to: '/guests', label: 'Kelola Tamu', icon: Users, permission: 'guests' },
    { to: '/events', label: 'Events', icon: Lock, permission: 'guests' },
    { to: '/settings', label: 'Settings', icon: Settings, permission: 'guests' },
    { to: '/users', label: 'Users & Roles', icon: Shield, permission: 'users', adminOnly: true },
  ];

  // Filter menu items based on role
  const visibleNavItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'admin';
    }
    return true;
  });

  const nav = allNavItems.filter(item => {
    if (user?.role === 'admin') return true;
    if (item.adminOnly) return false;
    return hasPermission(item.permission);
  });

  return (
    <aside
      className={`${mobileMenuOpen
        ? 'fixed inset-y-0 left-0 z-50 w-64'
        : 'hidden md:flex w-56'
        } flex-col border-r border-gray-200 bg-white p-4 shadow-sm shrink-0 h-screen`}
    >
      {/* Header */}
      <div className="flex items-center justify-between md:justify-start gap-2 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-blue-600">Attari</span>
        </div>
        <button
          onClick={onMobileMenuClose}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1">
        {visibleNavItems.map(({ to, label, icon: Icon, permission, adminOnly }) => {
          const hasAccess =
            user?.role === 'admin' ||
            (user?.role === 'user' && hasPermission(permission) && !adminOnly);

          if (!hasAccess) {
            return (
              <div
                key={to}
                className={`${linkBase} ${restricted}`}
                title="You don't have permission to access this page"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
                <Lock className="w-3 h-3 ml-auto" />
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : inactive}`
              }
              onClick={() => mobileMenuOpen && onMobileMenuClose?.()}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
