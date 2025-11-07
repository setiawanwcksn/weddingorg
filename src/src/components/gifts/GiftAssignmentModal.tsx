/**
 * Gift Assignment Modal
 * Assigns gifts to guests using unified guests collection
 * Works with both invited and non-invited guests
 */

import React, { useState, useEffect } from 'react';
import { X, Gift, DollarSign, User, Calendar, Plus, Minus } from 'lucide-react';
import { Guest, GiftType } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../lib/api';

interface GiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest;
  onAssign: (guestId: string, giftType: GiftType, count: number) => Promise<void>;
}

const GiftAssignmentModal: React.FC<GiftAssignmentModalProps> = ({
  isOpen,
  onClose,
  guest,
  onAssign
}) => {
  const { apiRequest } = useAuth();
  const [angpaoCount, setAngpaoCount] = useState(0);
  const [kadoCount, setKadoCount] = useState(0);
  const [giftNote, setGiftNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing gift data from guest object
  useEffect(() => {
    if (isOpen && guest) {
      // Set initial counts and notes from existing guest data
      setAngpaoCount(guest.angpaoCount || 0);
      setKadoCount(guest.kadoCount || 0);
      setGiftNote(guest.giftNote || '');
      console.log(`[GiftAssignmentModal] Loaded existing gift data for guest:`, guest.name, {
        giftType: guest.giftType,
        giftCount: guest.giftCount,
        giftNote: guest.giftNote
      });
    }
  }, [isOpen, guest]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (angpaoCount > 0 && kadoCount > 0) {
        // Update guest with gift data using unified guests API
        const response = await apiRequest(apiUrl(`/api/guests/${guest._id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            kadoCount: kadoCount,
            angpaoCount: angpaoCount,
            giftNote: giftNote
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign gifts');
        }

        const result = await response.json();
        console.log('[GiftAssignmentModal] Gift assignment successful:', result);

        // Call onAssign to refresh the parent component data
        if (onAssign) {
          await onAssign(guest._id, 'Angpao', 0); // Use Angpao as default for clearing
        }

        onClose();
      } else {
        // If no gifts are being assigned, clear existing gift data
        const response = await apiRequest(apiUrl(`/api/guests/${guest._id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            giftType: null,
            giftCount: 0,
            giftNote: ''
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to clear gifts');
        }

        console.log('[GiftAssignmentModal] Gift data cleared successfully');

        if (onAssign) {
          await onAssign(guest._id, 'Angpao', 0); // Use Angpao as default for clearing
        }

        onClose();
      }
    } catch (error) {
      console.error('[GiftAssignmentModal] Gift assignment failed:', error);
      setError(error.message || 'Failed to assign gifts');
    } finally {
      setLoading(false);
    }
  };

  const incrementAngpao = () => setAngpaoCount(prev => prev + 1);
  const decrementAngpao = () => setAngpaoCount(prev => Math.max(0, prev - 1));
  const incrementKado = () => setKadoCount(prev => prev + 1);
  const decrementKado = () => setKadoCount(prev => Math.max(0, prev - 1));

  const getCurrentGiftSummary = () => {
    const parts = [];
    if (angpaoCount > 0) parts.push(`${angpaoCount} Angpao`);
    if (kadoCount > 0) parts.push(`${kadoCount} Kado`);
    return parts.length > 0 ? parts.join(' + ') : 'No gifts assigned';
  };

  const getExistingGiftSummary = () => {
    if (guest.giftType && guest.giftCount > 0) {
      return `${guest.giftCount} ${guest.giftType}`;
    }
    return 'No gifts assigned';
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <button aria-label="Close overlay" onClick={onClose} className="absolute inset-0 bg-text/30" />

      {/* Card - Exactly matching GuestDetailModal style */}
      <div className="absolute left-1/2 top-2 sm:top-4 -translate-x-1/2 w-[96%] sm:w-[94%] max-w-[340px] sm:max-w-[480px] md:max-w-[660px] rounded-2xl border border-border bg-background shadow-lg overflow-hidden max-h-[98vh] sm:max-h-[95vh] overflow-y-auto">
        {/* Header - Exactly matching GuestDetailModal style */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-text">Gift Assignment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text/60 hover:text-text transition-colors p-1"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Detail list - Exactly matching GuestDetailModal style */}
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
          <div className="rounded-2xl border border-border bg-background">
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Nama Tamu</span>
                <span className="text-sm sm:text-base font-semibold text-text">{guest.name}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Kode Unik</span>
                <span className="text-sm sm:text-base font-semibold text-primary">{guest.code ?? guest.invitationCode ?? '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Kategori Tamu</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${guest.category === 'VIP' ? 'bg-secondary text-text' : 'bg-accent text-text'
                  }`}>
                  {guest.category}
                </span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Status</span>
                <span className="text-sm sm:text-base font-semibold text-text">{guest.status}</span>
              </li>
              {guest.info && (
                <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                  <span className="text-sm sm:text-base">Informasi</span>
                  <span className="text-sm sm:text-base text-text/80">{guest.info}</span>
                </li>
              )}
              {guest.session && (
                <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                  <span className="text-sm sm:text-base">Sesi Tamu</span>
                  <span className="text-sm sm:text-base text-text">{guest.session}</span>
                </li>
              )}
              {guest.tableNo && (
                <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                  <span className="text-sm sm:text-base">No. Meja</span>
                  <span className="text-sm sm:text-base text-text">{guest.tableNo}</span>
                </li>
              )}
              {guest.checkInDate && (
                <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                  <span className="text-sm sm:text-base">Tanggal dan Waktu</span>
                  <span className="text-sm sm:text-base text-text">
                    {new Intl.DateTimeFormat('id-ID', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(guest.checkInDate))}
                  </span>
                </li>
              )}
              {guest.souvenirCount !== undefined && guest.souvenirCount > 0 && (
                <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                  <span className="text-sm sm:text-base">Souvenir</span>
                  <span className="text-sm sm:text-base font-semibold text-text">{guest.souvenirCount}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Form - Matching GuestDetailModal footer style */}
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 w-full">
              <p className="text-xs sm:text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Gift Count Section - Matching GuestDetailModal style */}
          <div className="w-full">
            <div className="rounded-2xl border border-border bg-background mb-3">
              <ul className="divide-y divide-border">
                <li className="px-4 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base">Angpao Count</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={decrementAngpao}
                        className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                      >
                        –
                      </button>
                      <span className="text-base sm:text-lg font-semibold w-10 text-center">{angpaoCount}</span>
                      <button
                        type="button"
                        onClick={incrementAngpao}
                        className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base">Kado Count</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={decrementKado}
                        className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                      >
                        –
                      </button>
                      <span className="text-base sm:text-lg font-semibold w-10 text-center">{kadoCount}</span>
                      <button
                        type="button"
                        onClick={incrementKado}
                        className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base">Gift Note</span>
                    <input
                      type="text"
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="Optional note for gifts..."
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm w-48 sm:w-64"
                    />
                  </div>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/2 rounded-xl bg-secondary text-text border border-border px-4 py-3 text-sm sm:text-base font-semibold hover:bg-secondary/80 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-1/2 rounded-xl bg-primary text-background px-4 py-3 text-sm sm:text-base font-semibold shadow hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white inline-block mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  'Assign Gifts'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftAssignmentModal;