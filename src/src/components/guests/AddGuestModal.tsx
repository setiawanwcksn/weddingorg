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
import { useAccount } from '../../hooks/useAccount';
import { useAuth } from '../../contexts/AuthContext';

export interface AddGuestFormData {
  name: string;
  info: string;
  phone: string;
  session: string;
  limit: string;
  souvenir: number;
  kado: number;
  angpao: number;
  tableNo: string;
  category: string;
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
    souvenir: 0,
    kado: 0,
    angpao: 0,
    session: '',
    limit: '',
    tableNo: '',
    category: '',
    guestCount: 0,
  });
  const [nameError, setNameError] = React.useState<string>('');
  const [phoneError, setPhoneError] = React.useState<string>('');
  const [checkingName, setCheckingName] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const infoMax = 120;
  const { apiRequest, user } = useAuth();

  const { account } = useAccount();

  const categories = React.useMemo(
    () =>
      Array.isArray(account?.guestCategories) && account.guestCategories.length > 0
        ? account.guestCategories
        : [],
    [account]
  );

  React.useEffect(() => {
    if (!open) return;
    // Reset form when opened to ensure a clean state
    setForm({
      name: '',
      info: '',
      phone: '',
      session: '',
      kado: 0,
      angpao: 0,
      souvenir: 0,
      limit: '',
      tableNo: '',
      category: '',
      guestCount: 0,
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
      const response = await apiRequest(apiUrl(`/api/guests/check-name/${encodeURIComponent(name)}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.data.exists) {
        setNameError('Nama tamu sudah ada di daftar tamu. Gunakan nama lain');
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
    <div className="fixed inset-0 z-50" style={{ marginTop: '0px' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal wrapper */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="w-full max-w-sm rounded-lg border border-border bg-white shadow-xl">
          {/* Header */}
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

          {/* Body */}
          <form
            onSubmit={submit}
            className="p-4 space-y-3 text-sm"
          >
            {/* Nama */}
            <div>
              <label className="block font-medium mb-1">Nama Tamu *</label>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${nameError ? 'border-red-500' : 'border-border'
                  }`}
                placeholder="Masukkan nama tamu"
              />
              {checkingName && <p className="text-xs text-primary mt-1">Checking name...</p>}
              {nameError && !checkingName && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium">Informasi *</label>
                <span className="text-xs text-text/60">{form.info.length}/{infoMax}</span>
              </div>
              <input
                required
                value={form.info}
                maxLength={infoMax}
                onChange={(e) => update('info', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contoh: Rekan kerja, keluarga, dsb."
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block font-medium mb-1">No. WhatsApp *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${phoneError ? 'border-red-500' : 'border-border'
                  }`}
                placeholder="08123456789"
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>

            {/* Sesi / Limit / Meja */}
            <div>
              <label className="block font-medium mb-1">Sesi</label>
              <input
                type="number"
                value={form.session}
                onChange={(e) => update('session', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Limit</label>
              <input
                type="number"
                value={form.limit}
                onChange={(e) => update('limit', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Meja</label>
              <input
                value={form.tableNo}
                onChange={(e) => update('tableNo', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="12"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-medium mb-2">Kategori</label>
              <div className="flex gap-4">
                {categories.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={opt}
                      checked={form.category === opt}
                      onChange={(e) => update('category', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting || checkingName}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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