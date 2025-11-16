/**
 * Non-Invited Guest Check-In Modal
 * Allows adding non-invited guests (walk-ins) for check-in using unified guests collection
 * Updated to match the format of regular guest modal
 */

import React, { useState } from 'react'
import { X, User, Phone, Users, MessageSquare, Hash } from 'lucide-react'
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter'
import { useAccount } from '../../hooks/useAccount';

export interface NonInvitedGuestData {
  name: string
  phone: string
  kado: number
  kadoCount: number
  angpao: number
  giftNote: string
  info: string
  category?: string
}

interface NonInvitedGiftAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NonInvitedGuestData) => Promise<void>
}

export default function NonInvitedGiftAssignmentModal({
  isOpen,
  onClose,
  onSubmit
}: NonInvitedGiftAssignmentModalProps) {
  const [formData, setFormData] = useState<NonInvitedGuestData>({
    name: '',
    phone: '',
    info: '',
    angpao: 0,
    kado: 0,
    kadoCount: 0,
    giftNote: '',
    category: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')
  const { account } = useAccount();

  const categories = Array.isArray(account?.guestCategories)
    ? account!.guestCategories
    : ['Regular', 'VIP'];


  const updateAdd = (k: keyof NonInvitedGuestData, v: string) => setFormData((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    // Validate phone number
    const phoneError = getPhoneValidationError(formData.phone)
    if (phoneError) {
      setPhoneError(phoneError)
      return
    }

    // Format phone number before saving
    const formattedPhone = formatIndonesianPhone(formData.phone)
    if (!formattedPhone) {
      setPhoneError('Invalid phone number format')
      return
    }

    if (formData.kado === 0 && formData.angpao === 0) {
      alert("Minimal salah satu harus diisi: pilih 'Ya' untuk Kado atau Angpao.");
      return;
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        phone: formattedPhone
      })
      // Reset form after successful submission
      setFormData({
        name: '',
        phone: '',
        info: '',
        angpao: 0,
        kadoCount: 0,
        kado: 0,
        giftNote: '',
        category: categories[0]
      })
      setPhoneError('')
      onClose()
    } catch (error) {
      console.error('Error submitting non-invited guest:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof NonInvitedGuestData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'phone') {
      setPhoneError('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="w-full max-w-[90vw] sm:max-w-sm md:max-w-md rounded-xl border border-border bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-white">
            <div className="font-semibold text-base">Tambah Tamu</div>
            <button
              aria-label="Close"
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3 text-sm">
            {/* Nama */}
            <div>
              <label className="block font-medium mb-1">Nama Tamu *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                  placeholder="Masukkan nama tamu"
                  required
                />
              </div>
            </div>

            {/* Informasi */}
            <div>
              <label className="block font-medium mb-1">Informasi *</label>
              <input
                required
                value={formData.info}
                onChange={(e) => handleInputChange('info', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Contoh: Rekan kerja, keluarga, dsb."
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block font-medium mb-1">No. WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${phoneError ? 'border-red-500' : 'border-border'
                    }`}
                  placeholder="Contoh: 08123456789"
                  required
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            {/* Kado & Angpao */}
            <div>
              <label className="block font-medium mb-1">Kado *</label>
              <select
                value={formData.kado === 1 ? '1' : '0'}
                onChange={(e) =>
                  handleInputChange('kado', parseInt(e.target.value))
                }
                className="w-full px-2 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                required={formData.angpao === 0}
              >
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Angpao *</label>
              <select
                value={formData.angpao === 1 ? '1' : '0'}
                onChange={(e) =>
                  handleInputChange('angpao', parseInt(e.target.value))
                }
                className="w-full px-2 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                required={formData.kado === 0}
              >
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
            </div>
            {/* Jumlah Kado */}
            <div>
              <label className="block font-medium mb-1">Jumlah Kado *</label>
              <select
                value={formData.kadoCount}
                onChange={(e) =>
                  handleInputChange('kadoCount', parseInt(e.target.value))
                }
                className="w-full px-2 py-2 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                required={formData.kado !== 0}
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block font-medium mb-1">Note</label>
              <textarea
                rows={3}
                value={formData.giftNote}
                onChange={(e) => handleInputChange('giftNote', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                placeholder="Contoh: kotak warna kuning"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-medium mb-1">Kategori Tamu *</label>
              <div className="flex items-center gap-4">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="kategori"
                      value={cat}
                      checked={formData.category === cat}
                      onChange={(e) => updateAdd('category', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border text-text rounded-lg hover:bg-secondary/60 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  )
}