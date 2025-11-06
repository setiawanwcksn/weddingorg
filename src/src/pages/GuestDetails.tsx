/**
 * Guest Details page component for Lavender Wedding platform
 * Displays detailed information about a specific guest
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const GuestDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Mock guest data - in real app, this would be fetched based on ID
  const guest = {
    name: 'Emily Johnson',
    phone: '+1 (555) 123-4567',
    address: '123 Maple Street, Springfield, IL 62704',
    dietaryRestrictions: 'Vegetarian',
    rsvpDate: 'May 15, 2024',
    table: 'Table 5',
    status: 'Attending',
    plusOne: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=4&w=256&h=256&q=60'
  };

  return (
    <div className="bg-background flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/guests')}
            className="flex items-center gap-2 text-primary hover:opacity-80"
          >
            <i data-lucide="arrow-left" className="w-4 h-4 sm:w-5 sm:h-5"></i>
            <span className="font-semibold text-sm sm:text-base">Back to Guests</span>
          </button>
          <h1 className="text-base sm:text-lg font-bold text-text">Guest Details</h1>
          <div className="w-16 sm:w-24"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6 grid gap-4 sm:gap-6 md:grid-cols-3">
        {/* Left Card: Profile */}
        <section className="md:col-span-1 bg-white rounded-xl border border-border p-4 sm:p-6 flex flex-col items-center text-center shadow-sm">
          <img
            src={guest.avatar}
            alt="Guest"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mb-3 sm:mb-4"
          />
          <h2 className="text-lg sm:text-xl font-semibold text-text">{guest.name}</h2>
          <p className="text-sm text-gray-500">Friend of the Bride</p>
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 justify-center">
            <span className="px-2 sm:px-3 py-1 rounded-full bg-primary text-white text-xs font-medium">
              {guest.status}
            </span>
            {guest.plusOne && (
              <span className="px-2 sm:px-3 py-1 rounded-full bg-secondary text-primary text-xs font-medium">
                Plus One
              </span>
            )}
          </div>
        </section>

        {/* Right Card: Details */}
        <section className="md:col-span-2 bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-text">Information</h3>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
                Phone
              </label>
              <p className="text-sm text-text">{guest.phone}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
                Mailing Address
              </label>
              <p className="text-sm text-text">{guest.address}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
                Dietary Restrictions
              </label>
              <p className="text-sm text-text">{guest.dietaryRestrictions}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
                RSVP Date
              </label>
              <p className="text-sm text-text">{guest.rsvpDate}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
                Table Assignment
              </label>
              <p className="text-sm text-text">{guest.table}</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button className="px-3 sm:px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
              Edit Guest
            </button>
            <button className="px-3 sm:px-4 py-2 rounded-lg border border-border text-text text-sm font-medium hover:bg-accent">
              Send Message
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GuestDetails;