/**
 * Gift Assignment Modal
 * Assigns gifts to guests using unified guests collection
 * Works with both invited and non-invited guests
 */

import React, { useState, useEffect } from 'react';
import { X, DollarSign, User, Calendar, Plus, Minus } from 'lucide-react';
import { Guest, GiftType } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import SouvenirAct from '../../assets/SouvenirAct.png';
import Souvenir from '../../assets/Souvenir.png';
import GiftAct from '../../assets//GiftAct.png';
import Gift from '../../assets//Gift.png';

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
  const [count, setCount] = useState(guest.souvenirCount);
  const { showToast } = useToast();

  // Load existing gift data from guest object
  useEffect(() => {
    if (isOpen && guest) {
      // Set initial counts and notes from existing guest data
      setAngpaoCount(guest.angpaoCount || 0);
      setKadoCount(guest.kadoCount || 0);
      setGiftNote(guest.giftNote || '');
    }
  }, [isOpen, guest]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (angpaoCount > 0 || kadoCount > 0) {
        // Update guest with gift data using unified guests API
        const response = await apiRequest(apiUrl(`/api/guests/${guest._id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            kadoCount: kadoCount,
            angpaoCount: angpaoCount,
            souvenirCount: count,
            giftNote: giftNote,
            giftRecordedAt: new Date(),
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign gifts');
        }

        const result = await response.json();
        console.log('[GiftAssignmentModal] Gift assignment successful:', result);
        showToast(`Berhasil menyimpan data Gift`, 'success');
        // Call onAssign to refresh the parent component data
        if (onAssign) {
          await onAssign(guest._id, 'Angpao', 0); // Use Angpao as default for clearing
        }

        onClose();
      } else {
        showToast(`Gagal menyimpan data Gift. Angpao atau Gift harus dipilih`, 'error');
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

  return (
    <div className="fixed inset-0 z-[60]" style={{ marginTop: '0px' }}>
      {/* Overlay */}
      <button aria-label="Close overlay" onClick={onClose} className="absolute inset-0 bg-text/30" />

      {/* Card */}
      <div className="absolute left-1/2 top-2 sm:top-4 -translate-x-1/2 w-[96%] sm:w-[60%] max-w-[340px] sm:max-w-[480px] md:max-w-[520px] rounded-2xl border border-border bg-accent shadow-lg overflow-hidden max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-primary text-white">
          <div className="font-semibold text-base">DETAIL TAMU</div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detail list */}
        <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 pt-3">
          <div className="rounded-2xl border border-border bg-background">
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Nama Tamu</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right">{guest.name}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Kode Unik</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right">{guest.code ?? '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Kategori Tamu</span>
                <span className={`inline-flex items-center text-gray-500 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs bg-primary text-text`}>
                  {guest.category || 'Regular'}
                </span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Informasi</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right">{guest.info || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Sesi Tamu</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right">{guest.session || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">No. Meja</span>
                <span className="text-[13px] sm:text-sm text-gray-500 text-text">{guest.tableNo || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Jumlah Tamu</span>
                <span className="text-[13px] sm:text-sm text-gray-500 text-text">{guest.limit || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm text-gray-500">Tanggal dan Waktu</span>
                <span className="text-[13px] sm:text-sm text-gray-500">
                  {guest.giftRecordedAt
                    ? new Intl.DateTimeFormat('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(guest.giftRecordedAt))
                    : '-'}
                </span>
              </li>

              {/* Souvenir stepper */}
              <li className="px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] sm:text-sm ">Souvenir</span>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="dec souvenir"
                      onClick={() => setCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border transition-colors text-lg font-semibold"
                    >
                      –
                    </button>
                    <span className="text-sm sm:text-base font-semibold w-10 text-center">{count}</span>
                    <button
                      aria-label="inc souvenir"
                      onClick={() => setCount((c) => Math.min(99, c + 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-full bg-primary text-text border border-border transition-colors text-lg font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>

              <li className="px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] sm:text-sm">Pilih Hadiah</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAngpaoCount((prev) => (prev > 0 ? 0 : 1))}
                      className={`flex items-center gap-2 py-1 sm:px-3 sm:py-1 rounded-lg sm:text-sm border-2 transition ${angpaoCount > 0
                        ? 'bg-primary text-background border-primary'
                        : 'bg-secondary text-text border-border hover:border-primary/50'
                        }`}
                    >
                      <img src={angpaoCount > 0 ? Souvenir : SouvenirAct} className="w-5 h-5" style={angpaoCount > 0 ? { filter: 'brightness(0) saturate(100%) invert(1)' } : {}} />
                      <span>Angpao</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKadoCount((prev) => (prev > 0 ? 0 : 1))}
                      className={`flex items-center gap-2 py-1 sm:px-3 sm:py-1 rounded-lg sm:text-sm border-2 transition ${kadoCount > 0
                        ? 'bg-primary text-background border-primary'
                        : 'bg-secondary text-text border-border hover:border-primary/50'
                        }`}
                    >
                      <img src={kadoCount > 0 ? Gift : GiftAct} className="w-5 h-5" style={kadoCount > 0 ? { filter: 'brightness(0) saturate(100%) invert(1)' } : {}} />
                      <span>Kado</span>
                    </button>
                  </div>
                </div>
              </li>
              <li className="px-4 py-2.5 sm:py-3">
                <div>
                  <label className="block font-medium mb-1">Gift Note</label>
                  <textarea
                    rows={3}
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Contoh: kotak warna kuning"
                  />
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-1/2 rounded-xl bg-primary text-background px-3 py-2.5 text-[13px] sm:text-sm font-semibold shadow hover:opacity-90 transition-opacity min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                Simpan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftAssignmentModal;