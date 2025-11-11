/**
 * ReminderSettingsModal component
 * Modal for setting reminder date and time for guests
 */
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../lib/api';
import { getApiUrl, getAuthHeaders, handleApiResponse } from '../../utils/api';

interface ReminderSettingsModalProps {
  open: boolean;
  onClose: () => void;
  guestId: string;
  guestName: string;
  phone: string;
  existingReminder?: {
    id: string;
    scheduledAt: string;
  };
  currentIntroTextCategory?: string;
  onSuccess?: () => void;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  open,
  onClose,
  guestId,
  guestName,
  phone,
  existingReminder,
  currentIntroTextCategory,
  onSuccess
}) => {
  const { showToast } = useToast();
  const { apiRequest, user } = useAuth();
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [introTextCategory, setIntroTextCategory] = useState('');
  const [introTextContent, setIntroTextContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingReminder) {
        const date = new Date(existingReminder.scheduledAt);
        setScheduledDate(date.toISOString().split('T')[0]);
        setScheduledTime(date.toTimeString().slice(0, 5));
      } else {
        // Default to tomorrow at 10:00 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setScheduledDate(tomorrow.toISOString().split('T')[0]);
        setScheduledTime('10:00');
      }

      // Set intro text category
      setIntroTextCategory(currentIntroTextCategory || 'Formal');
    }
  }, [open, existingReminder, currentIntroTextCategory]);

  // Fetch intro text when category changes
  useEffect(() => {
    if (open && introTextCategory) {
      fetchIntroText();
    }
  }, [introTextCategory, open]);

  const fetchIntroText = async () => {
    try {
      const response = await apiRequest(
        apiUrl(`/api/intro-text/category/${introTextCategory}`),
        {
          headers: {
            'user-id': user?.id || ''
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIntroTextContent(data.data.text);
        }
      } else {
        // Fallback to default message if API call fails
        setIntroTextContent(`Dear ${guestName}, this is a reminder for your upcoming event.`);
      }
    } catch (error) {
      console.error('Error fetching intro text:', error);
      // Fallback to default message
      setIntroTextContent(`Dear ${guestName}, this is a reminder for your upcoming event.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate || !scheduledTime) {
      showToast('Please select both date and time', 'error');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledAt <= new Date()) {
      showToast('Reminder time must be in the future', 'error');
      return;
    }

    setLoading(true);

    try {
      const url = existingReminder
        ? apiUrl(`/api/reminders/${existingReminder.id}`)
        : apiUrl(`/api/reminders`);

      const method = existingReminder ? 'PUT' : 'POST';

      const reminderData = {
        guestId,
        guestName,
        userId: user.id,
        phone,
        message: introTextContent || `Dear ${guestName}, this is a reminder for your upcoming event.`,
        scheduledAt: scheduledAt.toISOString(),
        type: 'reminder',
        introTextCategory: introTextCategory || currentIntroTextCategory || 'Formal'
        // Note: status and accountId are set server-side
      };

      const response = await apiRequest(url, {
        method,
        headers: getAuthHeaders(user.id),
        body: JSON.stringify(reminderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save reminder');
      }

      showToast(
        existingReminder ? 'Reminder updated successfully' : 'Reminder created successfully',
        'success'
      );

      onSuccess?.();
      onClose();
    } catch (error: any) {
      showToast(`Failed to save reminder: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Modal container */}
      <div className="w-full max-w-lg mx-auto bg-transparent shadow-xl rounded-xl overflow-hidden">
        {/* Header (ungu) */}
        <div className="bg-primary px-6 py-5 flex items-center justify-between rounded-t-xl">
          <h3 className="text-xl font-bold text-white tracking-wide">SET REMINDER</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body (white) */}
        <form onSubmit={handleSubmit} className="bg-white px-6 py-6 rounded-b-xl">
          {/* Guest name (read-only box) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text/80 mb-2">Nama Tamu <span className="text-red-500">*</span></label>
            <div className="w-full px-3 py-2 rounded-md border border-border bg-white text-text/70">
              {guestName}
            </div>
          </div>

          {/* Phone (read-only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text/80 mb-2">No. WhatsApp <span className="text-red-500">*</span></label>
            <div className="w-full px-3 py-2 rounded-md border border-border bg-white text-text/70">
              {phone}
            </div>
          </div>

          {/* Intro text select */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text/80 mb-2">Pilih Teks Pengantar <span className="text-red-500">*</span></label>
            <select
              value={introTextCategory}
              onChange={(e) => setIntroTextCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Formal">Formal</option>
              <option value="Casual">Casual</option>
            </select>
          </div>

          {/* Date + Time group */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-text/80 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Atur Jadwal <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="w-36 relative">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* Note text */}
          <p className="text-xs text-text/60 mb-4">
            <span className="font-medium text-text/80">Note:</span> Untuk menghindari akun <span className="text-red-600">WhatsApp ter-Block</span>, tolong atur jadwal reminder minimal 5 menit pernama tamu undangan.
          </p>

          {/* Buttons: Cancel + Save (Save emphasized, rounded pill) */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-accent text-text/80 hover:bg-primary/10 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : (existingReminder ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

};