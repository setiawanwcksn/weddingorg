/**
 * Souvenir Assignment Modal
 * Assigns souvenirs to guests using the same design as GuestDetailModal
 * Only souvenirs field is editable, other guest info is read-only
 */

import React, { useState } from 'react';
import { Gift, User, Plus, Minus } from 'lucide-react';
import { Guest } from '../../../shared/types';

interface SouvenirAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest;
  onAssign: (guestId: string, count: number) => Promise<void>;
}

const SouvenirAssignmentModal: React.FC<SouvenirAssignmentModalProps> = ({
  isOpen,
  onClose,
  guest,
  onAssign
}) => {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSouvenirStatus = guest.souvenirCount && guest.souvenirCount > 0 
    ? `${guest.souvenirCount} souvenirs` 
    : 'No souvenirs assigned';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onAssign(guest._id, count);
      onClose();
      // Reset form
      setCount(1);
    } catch (error) {
      console.error('Error in souvenir assignment:', error);
      setError(error.message || 'Failed to assign souvenir');
    } finally {
      setLoading(false);
    }
  };

  const incrementCount = () => setCount(prev => prev + 1);
  const decrementCount = () => setCount(prev => Math.max(1, prev - 1));

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <button aria-label="Close overlay" onClick={onClose} className="absolute inset-0 bg-text/30" />

      {/* Card */}
      <div className="absolute left-1/2 top-2 sm:top-4 -translate-x-1/2 w-[96%] sm:w-[60%] max-w-[340px] sm:max-w-[480px] md:max-w-[660px] rounded-2xl border border-border bg-background shadow-lg overflow-hidden max-h-[98vh] sm:max-h-[95vh] overflow-y-auto">
        {/* Header media */}
        <div className="p-3 sm:p-4 md:p-5">
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1517244683847-7456b63c5969?q=80&w=1600&auto=format&fit=crop"
              alt="Guest banner"
              className="w-full h-32 sm:h-40 md:h-56 object-cover"
            />
          </div>
        </div>

        {/* Detail list */}
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
          <div className="rounded-2xl border border-border bg-background">
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Nama Tamu</span>
                <span className="text-sm sm:text-base font-semibold text-text">{guest.name}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Kode Unik</span>
                <span className="text-sm sm:text-base font-semibold text-primary">{guest.code ?? '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Kategori Tamu</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${
                  guest.category === 'VIP' ? 'bg-secondary text-text' : 'bg-accent text-text'
                }`}>
                  {guest.category || 'Regular'}
                </span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Informasi</span>
                <span className="text-sm sm:text-base text-text/80">{guest.info || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Sesi Tamu</span>
                <span className="text-sm sm:text-base text-text">{guest.session || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">No. Meja</span>
                <span className="text-sm sm:text-base text-text">{guest.tableNo || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Jumlah Tamu</span>
                <span className="text-sm sm:text-base text-text">{guest.limit || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Tanggal dan Waktu</span>
                <span className="text-sm sm:text-base text-text">{guest.souvenirRecordedAt ? new Intl.DateTimeFormat('id-ID', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(new Date(guest.souvenirRecordedAt))
              : '-'}</span>
              </li>
              <li className="px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base">Souvenir</span>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="dec souvenir"
                      onClick={() => setCount((c) => Math.max(0, c - 1))}
                      className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                    >
                      –
                    </button>
                    <span className="text-base sm:text-lg font-semibold w-10 text-center">{count}</span>
                    <button
                      aria-label="inc souvenir"
                      onClick={() => setCount((c) => Math.min(99, c + 1))}
                      className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-1/2 rounded-xl bg-secondary text-text border border-border px-4 py-3 text-sm sm:text-base font-semibold hover:bg-secondary/80 transition-colors min-h-[44px]"
          >
            Cetak
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-1/2 rounded-xl bg-primary text-background px-4 py-3 text-sm sm:text-base font-semibold shadow hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                Assign Souvenirs
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SouvenirAssignmentModal;