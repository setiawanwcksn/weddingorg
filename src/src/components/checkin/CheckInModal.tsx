/**
 * CheckInModal component
 * Presents the UI for guest check-in, registered-guest search, and add-guest inline form.
 * Modes:
 * - Scan (default): QR placeholder, camera selector, primary actions
 * - Search Registered: header "CARI TAMU TERDAFTAR", search input with dropdown results, preview + save
 * - Add Guest: header "TAMBAH TAMU", form fields and save
 *
 * Relationship:
 * - Used by Reception / Check-in page. Pure UI; parent owns navigation and action handlers.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { CameraView } from './CameraView';

export type RegisteredGuest = {
  id: string;
  name: string;
  code?: string;
  extra?: string;
  checkInDate?: string | Date;
  category?: string;
  isInvited?: boolean; // Add isInvited field for unified guest structure
};

export interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onSearch?: () => void; // optional analytics
  onAddGuest?: () => void; // optional analytics when switching to add mode
  onAddNonInvitedGuest?: () => void; // optional analytics when switching to non-invited guest mode
  guests?: RegisteredGuest[]; // list to search from
  onPickRegisteredGuest?: (guest: RegisteredGuest) => void; // emit picked guest or newly added
  mode?: Mode; // initial mode to open the modal
  onQRCodeScanned?: (qrData: any) => void; // handle QR code scan results
  context?: 'reception' | 'gift' | 'souvenir'; // calling page context for dynamic behavior
}

type Mode = 'scan' | 'search' | 'add';

export function CheckInModal({ open, onClose, onSearch, onAddGuest, onAddNonInvitedGuest, guests = [], onPickRegisteredGuest, mode: initialMode, onQRCodeScanned, context = 'reception' }: CheckInModalProps): JSX.Element | null {
  const [cam, setCam] = React.useState<'front' | 'back'>('back');
  const [mode, setMode] = React.useState<Mode>(initialMode || 'scan');
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<RegisteredGuest | null>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const [showAlreadyCheckedInAlert, setShowAlreadyCheckedInAlert] = React.useState(false);
  const [pendingGuestSelection, setPendingGuestSelection] = React.useState<RegisteredGuest | null>(null);

  type AddGuestForm = {
    name: string;
    info: string;
    whatsapp: string;
    count: string;
    category: 'Reguler' | 'VIP';
  };
  const [addForm, setAddForm] = React.useState<AddGuestForm>({ name: '', info: '', whatsapp: '', count: '', category: 'Reguler' });
  const updateAdd = (k: keyof AddGuestForm, v: string) => setAddForm((s) => ({ ...s, [k]: v }));

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    // reset state when reopened
    if (open) {
      setMode(initialMode || 'scan');
      setQ('');
      setSelected(null);
      setAddForm({ name: '', info: '', whatsapp: '', count: '', category: 'Reguler' });
    }
  }, [open, initialMode]);

  // Calculate dropdown position when it opens
  React.useEffect(() => {
    if (showDropdown && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const dropdownWidth = Math.min(320, inputRect.width); // max 320px width

      setDropdownStyle({
        position: 'fixed',
        top: `${inputRect.bottom + 4}px`,
        left: `${inputRect.left}px`,
        width: `${dropdownWidth}px`,
        zIndex: 9999,
      });
    }
  }, [showDropdown]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return guests.filter(g => (g.name?.toLowerCase().includes(term) || g.code?.toLowerCase().includes(term)));
  }, [q, guests]);

  if (!open) return null;

  const Header = () => {
    const getHeaderText = () => {
      if (mode === 'search') {
        // Dynamic search header based on context
        switch (context) {
          case 'gift':
            return 'CARI TAMU UNTUK KADO';
          case 'souvenir':
            return 'CARI TAMU UNTUK SOUVENIR';
          case 'reception':
          default:
            return 'CARI TAMU TERDAFTAR';
        }
      }
      if (mode === 'add') return 'TAMBAH TAMU';

      // Dynamic header based on context for scan mode
      switch (context) {
        case 'gift':
          return 'CARI TAMU UNTUK KADO';
        case 'souvenir':
          return 'CARI TAMU UNTUK SOUVENIR';
        case 'reception':
        default:
          return 'CHECK-IN TAMU';
      }
    };

    return (
      <div className="bg-primary text-background px-5 py-3">
        <h2 className="text-sm sm:text-base font-semibold tracking-wide">
          {getHeaderText()}
        </h2>
      </div>
    );
  };

  const onSearchClick = () => {
    onSearch?.();
    setMode('search');
  };

  const handleGuestSelection = (guest: RegisteredGuest) => {
    // Check if guest is already checked in by looking for check-in date
    const isAlreadyCheckedIn = guests.find(g => g.id === guest.id && (g as any).checkInDate);

    if (isAlreadyCheckedIn) {
      setPendingGuestSelection(guest);
      setShowAlreadyCheckedInAlert(true);
    } else {
      onPickRegisteredGuest?.(guest);
      onClose();
    }
  };

  const handleQRCodeScanned = (qrData: string) => {
    try {
      // QR code now contains only the guest name
      const guestName = qrData.trim();

      console.log('[CheckInModal] QR code data received:', qrData);
      console.log('[CheckInModal] Trimmed guest name:', guestName);
      console.log('[CheckInModal] Raw QR data length:', qrData.length);
      console.log('[CheckInModal] Trimmed guest name length:', guestName.length);
      console.log('[CheckInModal] QR data type:', typeof qrData);
      console.log('[CheckInModal] QR data bytes:', Array.from(qrData).map(c => c.charCodeAt(0)));

      if (!guestName) {
        console.error('[CheckInModal] Empty QR code data');
        alert('QR code appears to be empty. Please try scanning again or upload a different QR code.');
        return;
      }

      console.log('[CheckInModal] Searching for guest with name:', guestName);
      console.log('[CheckInModal] Total guests in list:', guests.length);
      console.log('[CheckInModal] Available guests:', guests.map(g => ({ name: g.name, id: g.id })));

      // Find guest by name in the provided guests list (case-insensitive)
      const foundGuest = guests.find(g => {
        const guestNameLower = g.name.toLowerCase();
        const scannedNameLower = guestName.toLowerCase();
        console.log(`[CheckInModal] Comparing: "${guestNameLower}" === "${scannedNameLower}"`, guestNameLower === scannedNameLower);
        return guestNameLower === scannedNameLower;
      });

      if (foundGuest) {
        console.log('[CheckInModal] Found matching guest:', foundGuest);
        if (onPickRegisteredGuest) {
          onPickRegisteredGuest(foundGuest);
          onClose();
        }
      } else {
        console.log('[CheckInModal] No matching guest found for name:', guestName);

        // Try fuzzy matching for similar names
        const similarGuests = guests.filter(g => {
          const guestNameLower = g.name.toLowerCase();
          const scannedNameLower = guestName.toLowerCase();

          // Check for partial matches
          return guestNameLower.includes(scannedNameLower) ||
            scannedNameLower.includes(guestNameLower) ||
            guestNameLower.split(' ').some(part => scannedNameLower.includes(part)) ||
            scannedNameLower.split(' ').some(part => guestNameLower.includes(part));
        });

        if (similarGuests.length > 0) {
          console.log('[CheckInModal] Found similar guests:', similarGuests);
          alert(`No exact match found for "${guestName}". Found ${similarGuests.length} similar guest(s). Switching to search mode...`);
        } else {
          alert(`No guest found with name "${guestName}". Switching to search mode...`);
        }

        // Switch to search mode with the scanned name pre-filled
        setQ(guestName);
        setMode('search');
        // Also trigger the parent callback if provided
        if (onQRCodeScanned) {
          onQRCodeScanned(qrData);
        }
      }
    } catch (error) {
      console.error('[CheckInModal] Error processing QR code:', error);
      alert(`Error processing QR code: ${error.message}`);
    }
  };

  const onAddClick = () => {
    onAddGuest?.();
    setMode('add');
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <button aria-label="Close overlay" onClick={onClose} className="absolute inset-0 bg-text/30" />

      {/* Already Checked In Alert Modal */}
      {showAlreadyCheckedInAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-text/50" onClick={() => setShowAlreadyCheckedInAlert(false)} />
          <div className="relative bg-background rounded-2xl border border-border shadow-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-warning/20 mb-4">
                <svg className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Guest Already Checked In</h3>
              <p className="text-sm text-text/70 mb-6">
                Tamu ini sudah check-in. Apakah kamu yakin ingin melanjutkan?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAlreadyCheckedInAlert(false)}
                  className="flex-1 rounded-xl bg-secondary text-text border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlreadyCheckedInAlert(false);
                    if (pendingGuestSelection) {
                      onPickRegisteredGuest?.(pendingGuestSelection);
                      onClose();
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

      {/* Modal card */}
      <div className="absolute left-1/2 top-4 sm:top-6 -translate-x-1/2 w-[92%] sm:w-[94%] max-w-[320px] sm:max-w-[480px] md:max-w-[720px] rounded-2xl border border-border bg-background shadow-lg overflow-hidden">
        <Header />

        {/* Body */}
        <div className="p-4 sm:p-5 md:p-6">
          {mode === 'scan' && (
            <>
              <p className="text-sm font-medium text-text/70 mb-3">Scan QR-Code</p>
              {/* Scan area with real camera */}
              <div className="rounded-lg border border-border bg-accent">
                <div className="h-[200px] sm:h-[240px] md:h-[300px]">
                  {/* Camera preview - auto opens when modal opens */}
                  <CameraView
                    key={cam}
                    facingMode={cam === 'user' ? 'user' : 'environment'}
                    className="w-full h-full"
                    onQRCodeScanned={handleQRCodeScanned}
                    onFileUpload={handleQRCodeScanned}
                  />
                </div>
                {/* Camera selector */}
                <div className="border-t border-border">
                  <label className="sr-only">Choose camera</label>
                  <select
                    value={cam}
                    onChange={(e) => setCam(e.target.value === 'front' ? 'front' : 'back')}
                    className="w-full bg-background text-text text-sm px-4 py-3 rounded-b-lg outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="back">Use back camera (recommended)</option>
                    <option value="front">Use front camera</option>
                  </select>
                </div>
              </div>

              {/* Actions - Dynamic based on context */}
              <div className="mt-5 space-y-3">
                {context === 'reception' && (
                  <button
                    type="button"
                    onClick={onSearchClick}
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base font-medium bg-primary text-background shadow hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    Cari Tamu Terdaftar
                  </button>)}
                {context === 'reception' && (
                  <button
                    type="button"
                    onClick={onAddClick}
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base font-medium bg-primary text-background shadow hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    Tambah Tamu
                  </button>
                )}
                {context === 'reception' && (
                  <button
                    type="button"
                    onClick={() => {
                      // When guest search fails, open non-invited guest modal
                      onAddNonInvitedGuest?.();
                    }}
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base font-medium bg-accent text-text border border-border shadow hover:bg-accent/80 transition-colors min-h-[44px]"
                  >
                    Tambah Tamu Tambahan
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-5 py-3 text-sm sm:text-base font-medium bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors min-h-[44px]"
                >
                  Tutup
                </button>
              </div>
            </>
          )}

          {mode === 'search' && (
            <>
              {/* Search Registered view */}
              <div className="relative rounded-xl border border-border bg-accent p-4">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setShowDropdown(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => setShowDropdown(q.trim().length > 0)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="Cari Nama Tamu"
                />
              </div>

              {/* Dropdown Portal */}
              {showDropdown && createPortal(
                <div className="w-full bg-white rounded-lg shadow-lg border border-border" style={dropdownStyle}>
                  <div className="max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-3">
                        <div className="text-sm text-text/70 mb-3">No matching guests found.</div>
                        {context === 'reception' && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDropdown(false);
                              onAddNonInvitedGuest?.();
                            }}
                            className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-primary text-background hover:bg-primary/90 transition-colors"
                          >
                            Tambah Tamu Tambahan
                          </button>
                        )}
                      </div>
                    ) : (
                      filtered.map((g) => (
                        <button
                          key={`${g.id}-${g.code ?? ''}`}
                          type="button"
                          onClick={() => {
                            setSelected(g);
                            setQ(g.name);
                            setShowDropdown(false);
                            handleGuestSelection(g);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors"
                        >
                          <div className="font-medium text-text">{g.name}</div>
                          {g.code && <div className="text-xs text-text/70 mt-1">Kode: {g.code}</div>}
                        </button>
                      ))
                    )}
                  </div>
                </div>,
                document.body
              )}

              {/* Selected guest preview */}
              {selected && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <div className="text-sm text-text/70 mb-2">Selected guest:</div>
                  <div className="font-medium text-text text-base">{selected.name}</div>
                  {selected.code && <div className="text-sm text-text/70 mt-1">Kode: {selected.code}</div>}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (selected) handleGuestSelection(selected);
                  }}
                  disabled={!selected}
                  className="rounded-xl px-5 py-3 text-sm sm:text-base font-medium bg-primary text-background disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity min-h-[44px]"
                >
                  Simpan
                </button>
              </div>
            </>
          )}

          {mode === 'add' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newGuest: RegisteredGuest = { id: 'new', name: addForm.name, extra: addForm.info };
                onPickRegisteredGuest?.(newGuest);
                onClose();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Nama Tamu *</label>
                <input
                  required
                  value={addForm.name}
                  onChange={(e) => updateAdd('name', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Masukkan nama tamu"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Informasi *</label>
                  <span className="text-xs text-primary">(Untuk bagan informasi dikasih limit)</span>
                </div>
                <input
                  required
                  value={addForm.info}
                  onChange={(e) => updateAdd('info', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: Rekan kerja, keluarga, dsb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">No. WhatsApp *</label>
                <input
                  required
                  value={addForm.whatsapp}
                  onChange={(e) => updateAdd('whatsapp', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: +628123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Jumlah Tamu *</label>
                <input
                  required
                  value={addForm.count}
                  onChange={(e) => updateAdd('count', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: 1 / 2 / 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Kategori Tamu *</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                  <label className="flex items-center gap-3 text-base sm:text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="kategori"
                      value="Reguler"
                      checked={addForm.category === 'Reguler'}
                      onChange={(e) => updateAdd('category', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>Reguler</span>
                  </label>
                  <label className="flex items-center gap-3 text-base sm:text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="kategori"
                      value="VIP"
                      checked={addForm.category === 'VIP'}
                      onChange={(e) => updateAdd('category', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>VIP</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-background text-base sm:text-sm font-medium shadow-sm hover:opacity-90 transition-opacity min-h-[44px]">
                  Simpan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}