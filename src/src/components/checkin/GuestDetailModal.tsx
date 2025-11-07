/**
 * GuestDetailModal component
 * Shows detailed information of the selected guest along with the date & time when they were chosen.
 * Relationship:
 * - Opened from CheckInModal (Cari Tamu / Tambah Tamu) after pressing "Simpan".
 * - Pure UI component; parent owns state and check-in actions.
 */
import React from 'react';
import type { RegisteredGuest } from './CheckInModal';
import { useToast } from '../../contexts/ToastContext';
import { useGuests } from '../../contexts/GuestsContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../lib/api';

export interface GuestDetailModalProps {
  open: boolean;
  guest: RegisteredGuest | null;
  pickedAt: Date | null;
  onClose: () => void;
  onCheckIn?: (guest: RegisteredGuest) => void;
}

function formatPickedAt(dt: Date | null): string {
  if (!dt) return '-';
  try {
    return dt.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dt);
  }
}

export function GuestDetailModal({ open, guest, pickedAt, onClose, onCheckIn }: GuestDetailModalProps): JSX.Element | null {
  const { showToast } = useToast();
  const { apiRequest } = useAuth();
  const [count, setCount] = React.useState<number>(guest ? 1 : 0);
  const [souvenir, setSouvenir] = React.useState<number>(0);
  const [kado, setKado] = React.useState<number>(0);
  const [angpao, setAngpao] = React.useState<number>(0);
  const [gift, setGift] = React.useState<'Angpao' | 'Kado' | null>(null);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [guestDetails, setGuestDetails] = React.useState<any>(null);
  const { refresh } = useGuests();
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [showDuplicateCheckInAlert, setShowDuplicateCheckInAlert] = React.useState(false);
  const [pendingCheckInData, setPendingCheckInData] = React.useState<any>(null);

  React.useEffect(() => {
    if (!open) return;
    setCount(guest ? 1 : 0);
    // Initialize with current guest data if available
    setSouvenir(guestDetails?.souvenirCount || 0);
    setGift(guestDetails?.giftType || null);
    // Reset duplicate check-in alert when modal opens
    setShowDuplicateCheckInAlert(false);
    setPendingCheckInData(null);
  }, [open, guest, guestDetails]);

  const fetchGuestDetails = React.useCallback(async () => {
    if (!guest?.id) return;

    setIsLoadingDetails(true);
    try {
      // Use unified guests API for all guest types
      const endpoint = apiUrl(`/api/guests/${guest.id}`);

      const response = await apiRequest(endpoint);
      const data = await response.json();

      console.log('Guest details API response:', data);

      if (data.success && data.data) {
        setGuestDetails(data.data);
        // Sync local state with updated guest data
        setSouvenir(data.data.souvenirCount || 0);
        setGift(data.data.giftType || null);
      }
    } catch (err) {
      console.error('Failed to fetch guest details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [guest?.id, apiRequest]);

  const performCheckIn = React.useCallback(async () => {
    if (!guest || !onCheckIn) return;

    setIsCheckingIn(true);
    try {
      // Use unified guests API for all guest types
      // First, call the check-in API with guest count
      const checkInResponse = await apiRequest(apiUrl(`/api/guests/${guest.id}/checkin`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestCount: count })
      });

      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok || !checkInData.success) {
        throw new Error(checkInData.error || 'Failed to check in guest');
      }

      // Update souvenir count if set
      if (souvenir > 0) {
        try {
          await apiRequest(apiUrl(`/api/guests/${guest.id}/souvenirs`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ count: souvenir })
          });
        } catch (souvenirError) {
          console.error('Error updating souvenir count:', souvenirError);
          // Continue with check-in even if souvenir update fails
        }
      }

      // Update gift information if set
      if (kado > 0 || angpao > 0) {
        try {
          await apiRequest(apiUrl(`/api/guests/${guest.id}/gifts`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ angpao: angpao, kado: kado, count: 1})
          });
        } catch (giftError) {
          console.error('Error updating gift information:', giftError);
          // Continue with check-in even if gift update fails
        }
      }

      // Call the parent's onCheckIn callback
      onCheckIn(guest);
      showToast(`Guest ${guest.name} checked in successfully`, 'success');
      onClose();

      // Refresh the global guests data to reflect the check-in
      await refresh();
    } catch (error) {
      console.error('Error checking in guest:', error);
      showToast(`Failed to check in guest: ${error.message}`, 'error');
    } finally {
      setIsCheckingIn(false);
    }
  }, [guest, onCheckIn, count, souvenir, angpao, kado, apiRequest, onClose, refresh, showToast]);

  React.useEffect(() => {
    if (open && guest?.id) {
      console.log('Opening guest detail modal for:', guest);
      fetchGuestDetails();
    }
  }, [open, guest?.id, fetchGuestDetails]);

  if (!open || !guest) return null;

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
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${guestDetails?.category === 'VIP' ? 'bg-secondary text-text' : 'bg-accent text-text'
                  }`}>
                  {guestDetails?.category || 'Regular'}
                </span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Informasi</span>
                <span className="text-sm sm:text-base text-text/80">{guestDetails?.info || guestDetails?.dietaryRequirements || guest.extra || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Sesi Tamu</span>
                <span className="text-sm sm:text-base text-text">{guestDetails?.session || guestDetails?.notes || '-'}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">No. Meja</span>
                <span className="text-sm sm:text-base text-text">{guestDetails?.tableNo || '-'}</span>
              </li>
              <li className="px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base">Jumlah Tamu</span>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="dec guest count"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                    >
                      –
                    </button>
                    <span className="text-base sm:text-lg font-semibold w-10 text-center">{count}</span>
                    <button
                      aria-label="inc guest count"
                      onClick={() => setCount((c) => Math.min(99, c + 1))}
                      className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
              <li className="flex items-center justify-between px-4 py-3 sm:py-4">
                <span className="text-sm sm:text-base">Tanggal dan Waktu</span>
                <span className="text-sm sm:text-base text-text">{guestDetails?.checkInDate
                  ? new Intl.DateTimeFormat('id-ID', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(new Date(guestDetails.checkInDate))
                  : '-'}</span>
              </li>
              <li className="px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base">Souvenir</span>
                  <div className="flex items-center gap-3">
                    {isLoadingDetails ? (
                      <div className="w-10 text-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                      </div>
                    ) : (
                      <>
                        <button
                          aria-label="dec souvenir"
                          onClick={() => setSouvenir((c) => Math.max(0, c - 1))}
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                        >
                          –
                        </button>
                        <span className="text-base sm:text-lg font-semibold w-10 text-center">{souvenir}</span>
                        <button
                          aria-label="inc souvenir"
                          onClick={() => setSouvenir((c) => Math.min(99, c + 1))}
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
              <li className="px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base">Pilih Hadiah</span>
                  <div className="flex items-center gap-3">
                    {isLoadingDetails ? (
                      <div className="flex gap-3">
                        <div className="w-20 h-10 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                        <div className="w-20 h-10 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setAngpao(1)}
                          className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base border-2 transition ${angpao > 0 ? 'bg-primary text-background border-primary' : 'bg-secondary text-text border-border hover:border-primary/50'
                            }`}
                        >
                          Angpao
                        </button>
                        <button
                          type="button"
                          onClick={() => setKado(1)}
                          className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base border-2 transition ${kado > 0 ? 'bg-primary text-background border-primary' : 'bg-secondary text-text border-border hover:border-primary/50'
                            }`}
                        >
                          Kado
                        </button>
                      </>
                    )}
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
            onClick={async () => {
              if (!guest || !onCheckIn || isCheckingIn) return;

              // Check if guest has already checked in
              if (guestDetails?.checkInDate) {
                setPendingCheckInData({ guest, onCheckIn });
                setShowDuplicateCheckInAlert(true);
                return;
              }

              await performCheckIn();
            }}
            disabled={isCheckingIn}
            className="w-full sm:w-1/2 rounded-xl bg-primary text-background px-4 py-3 text-sm sm:text-base font-semibold shadow hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingIn ? 'Checking in...' : 'Check-in'}
          </button>
        </div>
      </div>

      {/* Duplicate Check-in Alert Modal */}
      {showDuplicateCheckInAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-text/50" onClick={() => setShowDuplicateCheckInAlert(false)} />
          <div className="relative bg-background rounded-2xl border border-border shadow-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-warning/20 mb-4">
                <svg className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Guest Already Checked In</h3>
              <p className="text-sm text-text/70 mb-6">
                Guest has already checked in. Do you want to continue anyway?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDuplicateCheckInAlert(false)}
                  className="flex-1 rounded-xl bg-secondary text-text border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowDuplicateCheckInAlert(false);
                    if (pendingCheckInData) {
                      await performCheckIn();
                    }
                  }}
                  className="flex-1 rounded-xl bg-primary text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
