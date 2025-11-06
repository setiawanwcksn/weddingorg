/**
 * Non-Regular Guest Gift Assignment Modal
 * Handles gift assignment for non-regular guests using unified collection
 */

import React, { useState, useEffect } from 'react'
import { X, Gift, Plus, Minus } from 'lucide-react'

export interface GiftAssignmentData {
  giftType: 'Angpao' | 'Kado'
  giftCount: number
  giftNote: string
}

interface NonRegularGuestGiftAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  guest: any
  onSubmit: (data: GiftAssignmentData) => Promise<void>
}

export default function NonRegularGuestGiftAssignmentModal({
  isOpen,
  onClose,
  guest,
  onSubmit
}: NonRegularGuestGiftAssignmentModalProps) {
  const [formData, setFormData] = useState<GiftAssignmentData>({
    giftType: 'Angpao',
    giftCount: 1,
    giftNote: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (guest) {
      setFormData({
        giftType: guest.giftType || 'Angpao',
        giftCount: guest.giftCount || 1,
        giftNote: guest.giftNote || ''
      })
    }
  }, [guest])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error assigning gift:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateGiftCount = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      giftCount: Math.max(0, prev.giftCount + delta)
    }))
  }

  if (!isOpen || !guest) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Assign Gift to Non-Regular Guest</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text" />
          </button>
        </div>

        {/* Guest Info */}
        <div className="p-6 border-b border-border bg-secondary/10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">{guest.name?.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-text">{guest.name}</h3>
                <p className="text-sm text-text-secondary">Non-Regular Guest</p>
              </div>
            </div>
            
            {guest.phone && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Phone:</span> {guest.phone}
              </p>
            )}
            
            {guest.tableNo && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Table:</span> {guest.tableNo}
              </p>
            )}
            
            {guest.checkInDate && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Checked in:</span> {new Date(guest.checkInDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Current Gifts */}
        {guest.giftCount > 0 && (
          <div className="p-6 bg-blue-50 border-b border-border">
            <h4 className="font-medium text-text mb-2">Current Gift Assignment</h4>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {guest.giftType}: {guest.giftCount}
              </span>
              {guest.giftNote && (
                <span className="text-text-secondary">Note: {guest.giftNote}</span>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Gift Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Gift Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, giftType: 'Angpao' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  formData.giftType === 'Angpao'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text border-border hover:bg-secondary'
                }`}
              >
                Angpao
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, giftType: 'Kado' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  formData.giftType === 'Kado'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text border-border hover:bg-secondary'
                }`}
              >
                Kado
              </button>
            </div>
          </div>

          {/* Gift Count */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Gift Count
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateGiftCount(-1)}
                className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                disabled={formData.giftCount <= 0}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-semibold text-text">{formData.giftCount}</span>
              </div>
              <button
                type="button"
                onClick={() => updateGiftCount(1)}
                className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gift Note */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Gift Note
            </label>
            <textarea
              value={formData.giftNote}
              onChange={(e) => setFormData(prev => ({ ...prev, giftNote: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
              placeholder="Any notes about the gift (optional)"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-text rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.giftCount === 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              {isSubmitting ? 'Assigning...' : 'Assign Gift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}