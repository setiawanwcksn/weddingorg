/**
 * Profile Page
 * User profile and personal information management
 */

import React from 'react';
import { ArrowLeft, User, Lock, Bell, CreditCard, HelpCircle, LogOut, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function Profile() {
  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const handleEditProfile = () => {
    console.log('Edit profile');
    // TODO: Implement edit profile functionality
  };

  const handleShare = () => {
    console.log('Share profile');
    // TODO: Implement share functionality
  };

  const handleNavigation = (section: string) => {
    console.log('Navigate to:', section);
    // TODO: Implement navigation to specific sections
  };

  const handleLogout = () => {
    console.log('Logging out...');
    // TODO: Implement logout functionality
  };

  return (
    <div className="bg-background text-text">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={handleBack} className="text-primary">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <button className="text-primary">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar & Name */}
        <section className="flex items-center gap-4">
          <img 
            src="https://images.unsplash.com/photo-1494790108755-2616b612b5bc?auto=format&fit=crop&w=200&q=80" 
            alt="avatar" 
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h2 className="text-xl font-bold">Emily Johnson</h2>
            <p className="text-sm text-gray-500">emily.j@example.com</p>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">128</div>
            <div className="text-xs text-gray-600">Posts</div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">4.2k</div>
            <div className="text-xs text-gray-600">Followers</div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">362</div>
            <div className="text-xs text-gray-600">Following</div>
          </div>
        </section>

        {/* Actions */}
        <section className="flex gap-3">
          <button 
            onClick={handleEditProfile}
            className="flex-1 bg-primary text-white rounded-lg py-3 font-medium hover:bg-primary/90 transition"
          >
            Edit Profile
          </button>
          <button 
            onClick={handleShare}
            className="flex-1 bg-secondary text-primary rounded-lg py-3 font-medium hover:bg-secondary/80 transition"
          >
            Share
          </button>
        </section>

        {/* Menu List */}
        <section className="bg-accent rounded-lg divide-y divide-border">
          <button 
            onClick={() => handleNavigation('personal-information')}
            className="flex items-center justify-between px-4 py-4 w-full hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <span>Personal Information</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => handleNavigation('privacy-security')}
            className="flex items-center justify-between px-4 py-4 w-full hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <span>Privacy & Security</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => handleNavigation('notifications')}
            className="flex items-center justify-between px-4 py-4 w-full hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <span>Notifications</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => handleNavigation('payment-methods')}
            className="flex items-center justify-between px-4 py-4 w-full hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>Payment Methods</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => handleNavigation('help-support')}
            className="flex items-center justify-between px-4 py-4 w-full hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span>Help & Support</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-between px-4 py-4 w-full text-red-500 hover:bg-secondary transition"
          >
            <span className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </section>
      </main>
    </div>
  );
}