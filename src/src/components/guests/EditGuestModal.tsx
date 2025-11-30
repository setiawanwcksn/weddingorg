/**
 * EditGuestModal component
 * Presents a modal dialog to edit existing guest information in the "Kelola Tamu" (Manage Guests) page.
 * Encapsulates form UI and validation; communicates via props to parent page.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Guest } from '../../../shared/types';
import { useAccount } from '../../hooks/useAccount';
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter';

export interface EditGuestFormData {
  name: string;
  info: string;
  phone: string;
  session: string;
  limit: string;
  tableNo: string;
  category: string;
  categoryID: number;
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
    limit: '',
    tableNo: '',
    category: '',
    categoryID: 0,
    email: '',
    guestCount: 1,
  });

  const [phoneError, setPhoneError] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const infoMax = 120;

  const { account } = useAccount();

  const categories = React.useMemo(
    () =>
      Array.isArray(account?.guestCategories) && account.guestCategories.length > 0
        ? account.guestCategories
        : [],
    [account]
  );

  // Populate form when guest data is available
  useEffect(() => {
    if (guest && open) {
      setForm({
        name: guest.name || '',
        info: guest.info || '',
        phone: guest.phone || '',
        session: guest.session || '',
        limit: guest.limit || '',
        tableNo: guest.tableNo || '',
        category: guest.category || '',
        categoryID: guest.categoryID || 0,
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="w-full max-w-sm rounded-lg border border-border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-primary text-white">
            <div className="font-semibold text-base">EDIT TAMU</div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="p-4 space-y-3 text-sm">
            {/* Nama */}
            <div>
              <label className="block font-medium mb-1">Nama Tamu *</label>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Masukkan nama tamu"
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
              <p className="text-xs text-text/60 mt-1">
                Format: 08123456789 akan otomatis menjadi 628123456789
              </p>
            </div>

            {/* Informasi */}
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

            {/* Sesi / Limit / Meja */}
            <div>
              <label className="block font-medium mb-1">Sesi Tamu *</label>
              <input
                type="number"
                value={form.session}
                onChange={(e) => update('session', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1 / 2"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Limit Tamu *</label>
              <input
                type="number"
                value={form.limit}
                onChange={(e) => update('limit', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Nomor Meja *</label>
              <input
                value={form.tableNo}
                onChange={(e) => update('tableNo', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="A12"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-medium mb-2">Kategori Tamu *</label>
              <div className="flex gap-4">
                {categories.map((opt, index) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={opt}
                      checked={form.category === opt}
                      onChange={() => {
                        update('category', opt);
                        update('categoryID', index + 1);
                      }}
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
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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