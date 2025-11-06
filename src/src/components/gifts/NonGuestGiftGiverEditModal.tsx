/**
 * NonGuestGiftGiverEditModal Component
 * 
 * Modal for editing non-guest gift giver information including name, phone,
 * gift type, gift count, and notes. Provides a consistent editing experience
 * with validation and error handling.
 */

import React, { useState, useEffect } from 'react';
import { X, Gift, Phone, User, Hash } from 'lucide-react';

interface NonGuestGiftGiver {
  _id: string;
  name: string;
  phone?: string;
  giftType: 'Angpao' | 'Kado';
  giftCount: number;
  note?: string;
  userId: string;
  receivedAt: Date;
  // Guest information fields
  guestId?: string;
  guestName?: string;
  guestCode?: string;
  guestCategory?: string;
}

interface NonGuestGiftGiverEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftGiver: NonGuestGiftGiver | null;
  onSave: (updatedData: Partial<NonGuestGiftGiver>) => Promise<void>;
}

export const NonGuestGiftGiverEditModal: React.FC<NonGuestGiftGiverEditModalProps> = ({
  isOpen,
  onClose,
  giftGiver,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    giftType: 'Angpao' as 'Angpao' | 'Kado',
    giftCount: 1,
    note: '',
    guestId: '',
    guestName: '',
    guestCode: '',
    guestCategory: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (giftGiver) {
      setFormData({
        name: giftGiver.name,
        phone: giftGiver.phone || '',
        giftType: giftGiver.giftType,
        giftCount: giftGiver.giftCount,
        note: giftGiver.note || '',
        guestId: giftGiver.guestId || '',
        guestName: giftGiver.guestName || '',
        guestCode: giftGiver.guestCode || '',
        guestCategory: giftGiver.guestCategory || ''
      });
    }
  }, [giftGiver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftGiver) return;

    if (!formData.name.trim()) {
      setError('Nama wajib diisi');
      return;
    }

    if (formData.giftCount < 1) {
      setError('Jumlah kado minimal 1');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        giftType: formData.giftType,
        giftCount: formData.giftCount,
        note: formData.note.trim() || undefined,
        guestId: formData.guestId.trim() || undefined,
        guestName: formData.guestName.trim() || undefined,
        guestCode: formData.guestCode.trim() || undefined,
        guestCategory: formData.guestCategory.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiftCountChange = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      giftCount: Math.max(1, prev.giftCount + delta)
    }));
  };

  if (!isOpen || !giftGiver) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Pemberi Kado Non-Tamu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nama *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Masukkan nama pemberi kado"
              required
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Masukkan nomor telepon (opsional)"
            />
          </div>

          {/* Gift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Gift className="w-4 h-4 inline mr-2" />
              Jenis Kado
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, giftType: 'Angpao' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.giftType === 'Angpao'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Angpao
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, giftType: 'Kado' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.giftType === 'Kado'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Kado
              </button>
            </div>
          </div>

          {/* Gift Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-2" />
              Jumlah Kado
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleGiftCountChange(-1)}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                disabled={formData.giftCount <= 1}
              >
                -
              </button>
              <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">
                {formData.giftCount}
              </span>
              <button
                type="button"
                onClick={() => handleGiftCountChange(1)}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Note Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Tambahkan catatan (opsional)"
              rows={3}
            />
          </div>

          {/* Guest Information Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Informasi Tamu Terkait (Opsional)</h3>
            
            {/* Guest Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Tamu
              </label>
              <input
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Masukkan nama tamu terkait (opsional)"
              />
            </div>

            {/* Guest Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kode Tamu
              </label>
              <input
                type="text"
                value={formData.guestCode}
                onChange={(e) => setFormData(prev => ({ ...prev, guestCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Masukkan kode tamu (opsional)"
              />
            </div>

            {/* Guest Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori Tamu
              </label>
              <select
                value={formData.guestCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, guestCategory: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Pilih kategori (opsional)</option>
                <option value="VIP">VIP</option>
                <option value="Regular">Regular</option>
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};