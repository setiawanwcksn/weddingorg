/**
 * Souvenir Assignment Modal
 * Assigns souvenirs to guests using the same design as GuestDetailModal
 * Only souvenirs field is editable, other guest info is read-only
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Guest } from '../../../shared/types';
import { usePhoto } from "../../contexts/PhotoProvider";
import { useToast } from '../../contexts/ToastContext';
import SouvenirAct from '../../assets/SouvenirAct.png';
import Souvenir from '../../assets/Souvenir.png';
import GiftAct from '../../assets//GiftAct.png';
import Gift from '../../assets//Gift.png';

interface SouvenirAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest;
  onAssign: (guestId: string, count: number, kado: number, angpao: number) => Promise<void>;
}

const SouvenirAssignmentModal: React.FC<SouvenirAssignmentModalProps> = ({
  isOpen,
  onClose,
  guest,
  onAssign
}) => {
  const [count, setCount] = useState(guest.souvenirCount || 1);
  const [kado, setKado] = useState(guest.kadoCount);
  const [angpao, setAngpao] = useState(guest.angpaoCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const { photoUrl, dashboardUrl, welcomeUrl } = usePhoto();

  const currentSouvenirStatus = guest.souvenirCount && guest.souvenirCount > 0
    ? `${guest.souvenirCount} souvenirs`
    : 'No souvenirs assigned';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onAssign(guest._id, count, kado, angpao);
      showToast(`Berhasil menyimpan data Souvenir`, 'success');
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
                <span className="text-[13px] sm:text-sm">Kategori Tamu</span>
                <span className={`inline-flex items-center text-gray-500 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs bg-primary text-text`}>
                  {guest.category || '-'}
                </span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm  text-gray-500">Informasi</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right  text-gray-500">{guest.info || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm  text-gray-500">Sesi Tamu</span>
                <span className="text-[13px] sm:text-sm text-gray-500 truncate max-w-[60%] text-right  text-gray-500">{guest.session || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm  text-gray-500">No. Meja</span>
                <span className="text-[13px] sm:text-sm text-gray-500  text-gray-500">{guest.tableNo || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm  text-gray-500">Jumlah Tamu</span>
                <span className="text-[13px] sm:text-sm text-gray-500  text-gray-500">{guest.limit || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5 sm:py-3">
                <span className="text-[13px] sm:text-sm  text-gray-500">Tanggal dan Waktu</span>
                <span className="text-[13px] sm:text-sm text-gray-500">
                  {guest.souvenirRecordedAt
                    ? new Intl.DateTimeFormat('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(guest.souvenirRecordedAt))
                    : '-'}
                </span>
              </li>

              {/* Souvenir stepper */}
              <li className="px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] sm:text-sm">Souvenir</span>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="dec souvenir"
                      onClick={() => setCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                    >
                      –
                    </button>
                    <span className="text-sm sm:text-base font-semibold w-10 text-center">{count}</span>
                    <button
                      aria-label="inc souvenir"
                      onClick={() => setCount((c) => Math.min(99, c + 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-full bg-primary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
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
                      onClick={() => setAngpao((prev) => (prev > 0 ? 0 : 1))}
                      className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[13px] sm:text-sm border-2 transition ${angpao > 0
                        ? 'bg-primary text-background border-primary'
                        : 'bg-secondary text-text border-border hover:border-primary/50'
                        }`}
                    >
                      <img src={angpao > 0 ? Souvenir : SouvenirAct} className="w-5 h-5" style={angpao > 0 ? { filter: 'brightness(0) saturate(100%) invert(1)' } : {}} />
                      <span>Angpao</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKado((prev) => (prev > 0 ? 0 : 1))}
                      className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[13px] sm:text-sm border-2 transition ${kado > 0
                        ? 'bg-primary text-background border-primary'
                        : 'bg-secondary text-text border-border hover:border-primary/50'
                        }`}
                    >
                      <img src={kado > 0 ? Gift : GiftAct} className="w-5 h-5" style={kado > 0 ? { filter: 'brightness(0) saturate(100%) invert(1)' } : {}} />
                      <span>Kado</span>
                    </button>
                  </div>
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

export default SouvenirAssignmentModal;