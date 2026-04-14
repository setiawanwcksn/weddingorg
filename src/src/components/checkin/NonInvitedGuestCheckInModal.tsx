/**
 * Non-Invited Guest Check-In Modal
 * Allows adding non-invited guests (walk-ins) for check-in using unified guests collection
 * Updated to support:
 * - Update existing invited guest if found
 * - Confirm create non-invited guest if not found
 */

import React, { useState } from 'react'
import { X, User, Phone, Users } from 'lucide-react'
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter'
import { useAccount } from '../../hooks/useAccount';
import { apiUrl } from '../../lib/api';
import { Guest } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useGuests } from '../../contexts/GuestsContext';

export interface NonInvitedGuestData {
  name: string
  phone: string
  guestCount: number
  info: string
  invitationCode: string
  category?: string
  categoryID?: number
  kado: number
  angpao: number
  kadoCount: number
  giftNote: string
  souvenir: number
}

interface NonInvitedGuestCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NonInvitedGuestData) => Promise<void> // create non-invited
}

export default function NonInvitedGuestCheckInModal({
  isOpen,
  onClose,
  onSubmit
}: NonInvitedGuestCheckInModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')

  const { account } = useAccount();
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const { allGuests, refresh } = useGuests();

  // confirm modal ketika tamu TIDAK ditemukan
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingGuest, setPendingGuest] = useState<NonInvitedGuestData | null>(null);

  const categories = Array.isArray(account?.guestCategories)
    ? account!.guestCategories
    : [];

  const [formData, setFormData] = useState<NonInvitedGuestData>({
    name: '',
    phone: '',
    info: '',
    invitationCode: '',
    guestCount: 1,
    category: '',
    categoryID: 0,
    kado: 0,
    angpao: 0,
    kadoCount: 0,
    giftNote: '',
    souvenir: 0
  })

  const updateAdd = (k: keyof NonInvitedGuestData, v: string) =>
    setFormData((s) => ({ ...s, [k]: v }));

  const handleInputChange = (field: keyof NonInvitedGuestData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'phone') {
      setPhoneError('')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      info: '',
      invitationCode: '',
      guestCount: 1,
      category: '',
      categoryID: 0,
      kado: 0,
      angpao: 0,
      kadoCount: 0,
      giftNote: '',
      souvenir: 0
    });
    setPhoneError('');
  };

  // Update check-in untuk guest existing
  const updateExistingGuestCheckIn = async (guest: Guest, data: NonInvitedGuestData) => {
    if (!guest._id) {
      throw new Error('Guest ID is missing');
    }

    const response = await apiRequest(apiUrl(`/api/guests/${guest._id}/checkin`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guestCount: data.guestCount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update guest check-in data');
    }

    await response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    // Validate phone number only if provided
    if (formData.phone.trim()) {
      const phoneError = getPhoneValidationError(formData.phone)
      if (phoneError) {
        setPhoneError(phoneError)
        return
      }
    }

    // Format phone number before saving (only if provided)
    let formattedPhone = '';
    if (formData.phone.trim()) {
      formattedPhone = formatIndonesianPhone(formData.phone) || '';
      if (!formattedPhone) {
        setPhoneError('Invalid phone number format')
        return
      }
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const invitationCode = `GUEST-${code}`;

    const candidate: NonInvitedGuestData = {
      ...formData,
      phone: formattedPhone,
      invitationCode: invitationCode
    };

    const matchedGuest = allGuests?.find((guest: Guest) => {
      const samePhone =
        candidate.phone &&
        guest.phone &&
        guest.phone.replace(/\s+/g, '') === candidate.phone.replace(/\s+/g, '');
      const sameName =
        guest.name &&
        guest.name.trim().toLowerCase() === candidate.name.trim().toLowerCase();

      return samePhone || sameName;
    });

    if (matchedGuest) {
      setIsSubmitting(true);
      try {
        await updateExistingGuestCheckIn(matchedGuest, candidate);
        showToast(`Berhasil check-in tamu ${candidate.name}`, 'success');
        await refresh?.();
        resetForm();
        setPendingGuest(null);
        setIsConfirmOpen(false);
        onClose();
      } catch (err: any) {
        console.error('Error updating existing guest check-in:', err);
        showToast(`Gagal mengupdate check-in tamu. ${err.message || ''}`, 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setPendingGuest(candidate);
    setIsConfirmOpen(true);
  };

  // Dipanggil ketika user klik "Lanjutkan" di confirm modal (tamu tidak ditemukan)
  const handleConfirmNotFound = async () => {
    if (!pendingGuest) return;

    setIsSubmitting(true);
    try {
      await onSubmit(pendingGuest); // create non-invited guest
      showToast(`Berhasil menyimpan tamu tambahan`, 'success');
      await refresh?.();
      resetForm();
      setPendingGuest(null);
      setIsConfirmOpen(false);
      onClose();
    } catch (error: any) {
      console.error('Error submitting non-invited guest:', error)
      showToast(`Gagal menyimpan tamu tambahan. ${error.message || ''}`, 'error');
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <div className="w-full max-w-[95vw] sm:max-w-sm md:max-w-md rounded-xl border border-border bg-white shadow-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 rounded-t-xl bg-primary text-white">
            <div className="font-semibold text-sm sm:text-base md:text-lg">Tambah Tamu Tambahan</div>
            <button aria-label="Close" className="p-2 rounded-lg hover:bg-white/20 transition-colors" onClick={onClose}>
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Nama Tamu <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  placeholder="Masukkan nama tamu"
                  required
                />
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Informasi <span className="text-red-500">*</span></label>
              </div>
              <input
                required
                value={formData.info}
                onChange={(e) => handleInputChange('info', e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Contoh: Rekan kerja, keluarga, dsb."
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">No. WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${phoneError ? 'border-red-500' : 'border-border'
                    }`}
                  placeholder="Contoh: 08123456789"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            {/* Guest Count */}
            <div>
              <label className="block text-sm font-medium mb-2">Jumlah Tamu <span className="text-red-500">*</span></label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.guestCount}
                  onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value) || 1)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
            </div>



            {/* Souvenir */}
            <div>
              <label className="block text-sm font-medium mb-2">Souvenir</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="dec souvenir"
                  onClick={() => handleInputChange('souvenir', Math.max(0, formData.souvenir - 1))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-secondary text-text border border-border hover:bg-secondary/80 transition-colors text-lg font-semibold"
                >
                  –
                </button>
                <span className="text-sm font-semibold w-10 text-center">
                  {formData.souvenir}
                </span>
                <button
                  type="button"
                  aria-label="inc souvenir"
                  onClick={() => handleInputChange('souvenir', Math.min(99, formData.souvenir + 1))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-primary text-white border border-border hover:bg-primary/90 transition-colors text-lg font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Kado */}
            <div>
              <label className="block text-sm font-medium mb-2">Kado</label>
              <select
                value={formData.kado === 1 ? '1' : '0'}
                onChange={(e) => handleInputChange('kado', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-colors"
              >
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
            </div>

            {/* Angpao */}
            <div>
              <label className="block text-sm font-medium mb-2">Angpao</label>
              <select
                value={formData.angpao === 1 ? '1' : '0'}
                onChange={(e) => handleInputChange('angpao', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-colors"
              >
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
            </div>

            {/* Jumlah Kado */}
            {formData.kado === 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">Jumlah Kado</label>
                <select
                  value={formData.kadoCount}
                  onChange={(e) => handleInputChange('kadoCount', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-colors"
                  required
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gift Note */}
            <div>
              <label className="block text-sm font-medium mb-2">Catatan Hadiah</label>
              <textarea
                rows={3}
                value={formData.giftNote}
                onChange={(e) => handleInputChange('giftNote', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-colors"
                placeholder="Contoh: kotak warna kuning"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-3">Kategori Tamu <span className="text-red-500">*</span></label>

              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6">
                {categories.map((cat, index) => (
                  <label key={cat} className="flex items-center gap-3 text-base sm:text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="kategori"
                      value={cat}
                      checked={formData.category === cat}
                      onChange={() => {
                        updateAdd('category', cat);
                        updateAdd('categoryID', index+1);
                      }}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 sm:pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border text-text rounded-lg hover:bg-secondary transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirm Modal ketika tamu TIDAK ditemukan di allGuests */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-4 w-[90vw] max-w-sm space-y-3">
            <div className="font-semibold text-base">
              Tamu belum terdaftar
            </div>
            <p className="text-sm text-text-secondary">
              Tamu dengan nama "<span className="font-medium">{pendingGuest?.name}</span>" tidak ditemukan di daftar tamu.
              Simpan sebagai tamu non-undangan dan catat check-in?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setPendingGuest(null);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary/60"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmNotFound}
                className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
