/**
 * EditGuestModal component
 * Presents a modal dialog to edit existing guest information in the "Kelola Tamu" (Manage Guests) page.
 * Encapsulates form UI and validation; communicates via props to parent page.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Guest } from '../../../shared/types';
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter';

export interface EditGuestFormData {
  name: string;
  info: string;
  phone: string;
  session: string;
  limit: number;
  tableNo: string;
  category: 'Regular' | 'VIP';
  email?: string;
  guestCount?: number;
}

export interface EditGuestModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EditGuestFormData) => void;
  guest: Guest | null;
}

export function EditGuestModal({ open, onClose, onSave, guest }: EditGuestModalProps) {
  const [form, setForm] = React.useState<EditGuestFormData>({
    name: '',
    info: '',
    phone: '',
    session: '',
    limit: 1,
    tableNo: '',
    category: 'Regular',
    email: '',
    guestCount: 1,
  });

  const [phoneError, setPhoneError] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const infoMax = 120;

  // Populate form when guest data is available
  useEffect(() => {
    if (guest && open) {
      setForm({
        name: guest.name || '',
        info: guest.notes || '',
        phone: guest.phone || '',
        session: guest.session || '',
        limit: guest.limit || 1,
        tableNo: guest.tableNo || '',
        category: (guest.category as 'Regular' | 'VIP') || 'Regular',
        email: guest.email || '',
        guestCount: guest.guestCount || 1,
      });
    }
  }, [guest, open]);

  const update = (k: keyof EditGuestFormData, v: string | number) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (k === 'phone') {
      setPhoneError('');
    }
  };

  const submit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || !guest) return;
    
    // Validate phone number
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      setPhoneError(phoneError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format phone number before saving
      const formattedPhone = formatIndonesianPhone(form.phone);
      if (!formattedPhone) {
        setPhoneError('Invalid phone number format');
        setIsSubmitting(false);
        return;
      }
      
      onSave({
        ...form,
        phone: formattedPhone
      });
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !guest) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <div className="w-full max-w-[95vw] sm:max-w-sm md:max-w-md rounded-xl border border-border bg-white shadow-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 rounded-t-xl bg-primary text-white">
            <div className="font-semibold text-sm sm:text-base md:text-lg">EDIT TAMU</div>
            <button aria-label="Close" className="p-2 rounded-lg hover:bg-white/20 transition-colors" onClick={onClose}>
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Tamu *</label>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Masukkan nama tamu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">No. WhatsApp *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary ${
                  phoneError ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Contoh: 08123456789"
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
              <p className="text-xs text-text/60 mt-1">Format: 08123456789 akan otomatis menjadi 628123456789</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Informasi *</label>
                <span className="text-xs text-text/60">{form.info.length}/{infoMax}</span>
              </div>
              <input
                required
                value={form.info}
                maxLength={infoMax}
                onChange={(e) => update('info', e.target.value)}
                className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Contoh: Rekan kerja, keluarga, dsb."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sesi Tamu *</label>
                <input
                  required
                  value={form.session}
                  onChange={(e) => update('session', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: 1 / 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Limit Tamu *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.limit}
                  onChange={(e) => update('limit', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Meja *</label>
                <input
                  required
                  value={form.tableNo}
                  onChange={(e) => update('tableNo', e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: A12"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Kategori Tamu *</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
                <label className="flex items-center gap-2 sm:gap-3 text-sm md:text-base cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value="Regular"
                    checked={form.category === 'Regular'}
                    onChange={(e) => update('category', e.target.value)}
                    className="w-3 h-3 sm:w-4 sm:h-4 text-primary focus:ring-primary"
                  />
                  <span>Regular</span>
                </label>
                <label className="flex items-center gap-2 sm:gap-3 text-sm md:text-base cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value="VIP"
                    checked={form.category === 'VIP'}
                    onChange={(e) => update('category', e.target.value)}
                    className="w-3 h-3 sm:w-4 sm:h-4 text-primary focus:ring-primary"
                  />
                  <span>VIP</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 sm:pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="ml-auto inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2 sm:py-3 text-white text-sm md:text-base font-medium shadow-sm hover:opacity-90 transition-opacity min-h-[40px] sm:min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}