/**
 * AddGuestModal component
 * Presents a modal dialog to create a new guest in the "Kelola Tamu" (Manage Guests) page.
 * Encapsulates form UI and validation; communicates via props to parent page.
 * Updated to work with backend API data structure.
 */

import React from 'react';
import { X } from 'lucide-react';
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter';
import { apiUrl } from '../../lib/api';

export interface AddGuestFormData {
  name: string;
  info: string;
  phone: string;
  session: string;
  limit: number;
  tableNo: string;
  category: 'Regular' | 'VIP';
  guestCount?: number;
}

export interface AddGuestModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddGuestFormData) => void;
}

export function AddGuestModal({ open, onClose, onSave }: AddGuestModalProps) {
  const [form, setForm] = React.useState<AddGuestFormData>({
    name: '',
    info: '',
    phone: '',
    session: '',
    limit: 1,
    tableNo: '',
    category: 'Regular',
    guestCount: 1,
  });

  const [nameError, setNameError] = React.useState<string>('');
  const [phoneError, setPhoneError] = React.useState<string>('');
  const [checkingName, setCheckingName] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const infoMax = 120;

  React.useEffect(() => {
    if (!open) return;
    // Reset form when opened to ensure a clean state
    setForm({ 
      name: '', 
      info: '', 
      phone: '', 
      session: '', 
      limit: 1, 
      tableNo: '', 
      category: 'Regular',
      guestCount: 1,
    });
  }, [open]);

  const update = (k: keyof AddGuestFormData, v: string | number) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (k === 'name') {
      setNameError('');
    }
    if (k === 'phone') {
      setPhoneError('');
    }
  };

  const validateName = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }

    setCheckingName(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/guests/check-name/${encodeURIComponent(name)}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.data.exists) {
        setNameError('Guest name already exists. Please use a different name.');
        return false;
      } else {
        setNameError('');
        return true;
      }
    } catch (error) {
      console.error('Error checking name:', error);
      setNameError('');
      return true; // Allow submission if name check fails
    } finally {
      setCheckingName(false);
    }
  };

  const submit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate phone number
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      setPhoneError(phoneError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validate name on submission
      const isNameValid = await validateName(form.name);
      if (!isNameValid) {
        setIsSubmitting(false);
        return;
      }
      
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
      // The error will be handled by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <div className="w-full max-w-[95vw] sm:max-w-sm md:max-w-md rounded-xl border border-border bg-white shadow-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 rounded-t-xl bg-primary text-white">
            <div className="font-semibold text-sm sm:text-base md:text-lg">DETAIL TAMU</div>
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
                className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary ${
                  nameError ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Masukkan nama tamu"
              />
              {checkingName && (
                <p className="text-xs text-primary mt-1">Checking name availability...</p>
              )}
              {nameError && !checkingName && (
                <p className="text-xs text-red-500 mt-1">{nameError}</p>
              )}
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
            </div>            

            <div>
                <label className="block text-sm font-medium mb-2">Sesi Tamu *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.session}
                  onChange={(e) => update('session', e.target.value)}
                  className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                  className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Meja *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.tableNo}
                  onChange={(e) => update('tableNo', e.target.value)}
                  className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Contoh: 12"
                />
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
                disabled={isSubmitting || checkingName}
                className="ml-auto inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2 sm:py-3 text-white text-sm md:text-base font-medium shadow-sm hover:opacity-90 transition-opacity min-h-[40px] sm:min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}