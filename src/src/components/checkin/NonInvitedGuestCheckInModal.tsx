/**
 * Non-Invited Guest Check-In Modal
 * Allows adding non-invited guests (walk-ins) for check-in using unified guests collection
 * Updated to match the format of regular guest modal
 */

import React, { useState } from 'react'
import { X, User, Phone, Users, MessageSquare, Hash } from 'lucide-react'
import { formatIndonesianPhone, getPhoneValidationError } from '../../utils/phoneFormatter'

export interface NonInvitedGuestData {
  name: string
  phone: string
  tableNo: string
  guestCount: number
  info: string
  session?: string
  limit?: number
  category?: 'Regular' | 'VIP'
}

interface NonInvitedGuestCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NonInvitedGuestData) => Promise<void>
}

export default function NonInvitedGuestCheckInModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: NonInvitedGuestCheckInModalProps) {
  const [formData, setFormData] = useState<NonInvitedGuestData>({
    name: '',
    phone: '',
    tableNo: '',
    info: '',
    guestCount: 1,
    notes: '',
    session: '1',
    limit: 1,
    category: 'Regular'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')


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
        tableNo: '',
        info: '',
        guestCount: 1,
        notes: '',
        session: '1',
        limit: 1,
        category: 'Regular'
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
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <div className="w-full max-w-[95vw] sm:max-w-sm md:max-w-md rounded-xl border border-border bg-white shadow-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 rounded-t-xl bg-primary text-white">
            <div className="font-semibold text-sm sm:text-base md:text-lg">TAMBAH TAMU TIDAK TERDAFTAR</div>
            <button aria-label="Close" className="p-2 rounded-lg hover:bg-white/20 transition-colors" onClick={onClose}>
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Nama Tamu *</label>
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Informasi *</label>
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
              <label className="block text-sm font-medium mb-2">No. WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${
                    phoneError ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="Contoh: 08123456789"
                  required
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            {/* Session */}
            <div>
              <label className="block text-sm font-medium mb-2">Sesi Tamu *</label>
              <input
                type="number"
                min="1"
                value={formData.session}
                onChange={(e) => handleInputChange('session', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="Contoh: 1 / 2"
                required
              />
            </div>

            {/* Guest Count */}
            <div>
              <label className="block text-sm font-medium mb-2">Jumlah Tamu *</label>
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

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">Limit Tamu *</label>
              <input
                type="number"
                min="1"
                value={formData.limit}
                onChange={(e) => handleInputChange('limit', parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-border px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="1"
                required
              />
            </div>

            {/* Table Number */}
            <div>
              <label className="block text-sm font-medium mb-2">Nomor Meja *</label>
              <div className="relative">                
                <input
                  type="text"
                  value={formData.tableNo}
                  onChange={(e) => handleInputChange('tableNo', e.target.value)}
                  className="w-full pl-2 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  placeholder="Contoh: 12"
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-3">Kategori Tamu *</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
                <label className="flex items-center gap-2 sm:gap-3 text-sm md:text-base cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value="Regular"
                    checked={formData.category === 'Regular'}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-3 h-3 sm:w-4 sm:h-4 text-primary focus:ring-primary"
                  />
                  <span>Regular</span>
                </label>
                <label className="flex items-center gap-2 sm:gap-3 text-sm md:text-base cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value="VIP"
                    checked={formData.category === 'VIP'}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-3 h-3 sm:w-4 sm:h-4 text-primary focus:ring-primary"
                  />
                  <span>VIP</span>
                </label>
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
    </div>
  )
}