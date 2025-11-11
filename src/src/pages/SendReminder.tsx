/**
 * SendReminder page component
 * Page redesigned to match the provided reference exactly: header tiles, action buttons,
 * datatable controls, and a table with Set Reminder, Schedule, Status, and Share actions.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  Bell,
  LayoutGrid,
  Settings as Cog,
  Filter,
  Search,
  Share2,
  Trash2,
  ChevronDown,
  Circle,
  Clock,
  RefreshCw,
  Settings,
  Smartphone
} from 'lucide-react';
import { NoticeModal } from '../components/common/NoticeModal';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';
import { ReminderSettingsModal } from '../components/reminders/ReminderSettingsModal';
import { WhatsAppConnectionModal } from '../components/whatsapp/WhatsAppConnectionModal';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
import { useToast } from '../contexts/ToastContext';
import { Guest } from '../../shared/types';
import { apiUrl } from '../lib/api';
import { IntroTextModal } from '../components/guests/IntroTextModal';
import kelolaTamu from '../assets/KelolaTamu.png';
import sendReminderAct from '../assets/SendReminderAct.png';
import TambahTamu from '../assets/TambahTamu.png';
import EditTeksPengantar from '../assets/EditTeksPengantar.png';
import setting from '../assets/setting.png';
import filter from '../assets/filter.png';
import edit from '../assets/Edit.png';
import Whatsapp from '../assets/Whatsapp.png';
import shared from '../assets/shared.png';
import Copy from '../assets/Copy.png';
import Delete from '../assets/Delete.png';

interface ReminderItem {
  id: string;
  guestId: string;
  guestName: string;
  phone: string;
  message: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'failed';
  type: 'wedding_invitation' | 'reminder' | 'thank_you';
  createdAt: string;
  updatedAt: string;
}

function Badge({ children, tone = 'primary' }: { children: React.ReactNode; tone?: 'primary' | 'muted' }) {
  const tones = tone === 'primary'
    ? 'bg-primary/15 text-primary'
    : 'bg-secondary text-text/80';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${tones}`}>
      {children}
    </span>
  );
}

const SendReminder: React.FC = () => {
  const navigate = useNavigate();
  const { apiRequest, user } = useAuth();
  const { showToast } = useToast();

  const [openNotice, setOpenNotice] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openIntro, setOpenIntro] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedGuest, setSelectedGuest] = useState<string>('');
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [selectedGuestForReminder, setSelectedGuestForReminder] = useState<any>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(true);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    no: true,
    name: true,
    phone: true,
    email: true,
    status: true,
    terjadwal: true,
    reminder: true,
    share: true,
  });

  // Handle copying WhatsApp message to clipboard
  const handleCopyWhatsAppMessage = async (guest: Guest) => {
    try {
      if (!guest.introTextCategory) {
        showToast('Please select an intro text category first', 'error');
        return;
      }

      // Get the intro text for the selected category
      const response = await apiRequest(apiUrl(`/api/intro-text/category/${guest.introTextCategory}`), {
        headers: {
          'user-id': user?.id || '',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch intro text');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch intro text');
      }

      let introText = result.data.text;

      // Get account information for mempelai
      const accountResponse = await apiRequest(apiUrl(`/api/auth/accounts/${user?.accountId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      let accountName = 'Mempelai'; // Default fallback
      let linkUndangan = ''
      if (accountResponse.ok) {
        const accountResult = await accountResponse.json();
        if (accountResult.success && accountResult.data?.account) {
          accountName = accountResult.data.account.name || 'Mempelai';
          linkUndangan = accountResult.data.account.linkUndangan.trim().replace(/\/+$/, '') || ''
        }
      }

      // Replace placeholders with actual guest data
      // Map guest category to invitation category: VIP = 1, Regular = 2
      const invitationCategory = guest.category === 'VIP' ? '1' : '2';
      const invitationLink = `${linkUndangan}/?to=${encodeURIComponent(guest.name)}&sesi=${encodeURIComponent(guest.session || '1')}&cat=${invitationCategory}&lim=${encodeURIComponent(guest.limit?.toString() || '1')}`;

      introText = introText
        .replace(/\[nama\]/g, guest.name)
        .replace(/\[mempelai\]/g, accountName)
        .replace(/\[link-undangan\]/g, invitationLink);

      // Copy to clipboard
      await navigator.clipboard.writeText(introText);

      showToast('WhatsApp message copied to clipboard', 'success');
    } catch (error: any) {
      showToast('Failed to copy WhatsApp message', 'error');
    }
  };

  // Handle sharing guest information via native share API
  const handleShareGuest = async (guest: Guest) => {
    try {

      if (!guest.introTextCategory) {
        showToast('Please select an intro text category first', 'error');
        return;
      }

      // Get the intro text for the selected category
      const response = await apiRequest(apiUrl(`/api/intro-text/category/${guest.introTextCategory}`), {
        headers: {
          'user-id': user?.id || '',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch intro text');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch intro text');
      }

      let introText = result.data.text;

      // Get account information for mempelai
      const accountResponse = await apiRequest(apiUrl(`/api/auth/accounts/${user?.accountId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      let accountName = 'Mempelai'; // Default fallback
      let linkUndangan = ''
      if (accountResponse.ok) {
        const accountResult = await accountResponse.json();
        if (accountResult.success && accountResult.data?.account) {
          accountName = accountResult.data.account.name || 'Mempelai';
          linkUndangan = accountResult.data.account.linkUndangan.trim().replace(/\/+$/, '') || ''
        }
      }

      const invitationCategory = guest.category === 'VIP' ? '1' : '2';
      const invitationLink = `${linkUndangan}/?to=${encodeURIComponent(guest.name)}&sesi=${encodeURIComponent(guest.session || '1')}&cat=${invitationCategory}&lim=${encodeURIComponent(guest.limit?.toString() || '1')}`;

      introText = introText
        .replace(/\[nama\]/g, guest.name)
        .replace(/\[mempelai\]/g, accountName)
        .replace(/\[link-undangan\]/g, invitationLink);

      // Check if Web Share API is available
      if (navigator.share) {
        // Use native share API
        const shareData = {
          title: `Wedding Invitation for ${guest.name}`,
          text: introText,
          url: invitationLink
        };

        await navigator.share(shareData);
        showToast('Shared successfully', 'success');
      }
    } catch (error: any) {
      console.error(`[handleShareGuest] Error:`, error);

      // Handle specific share API errors
      if (error.name === 'AbortError') {
        // User cancelled the share dialog - this is not an error
        console.log('[handleShareGuest] User cancelled share dialog');
        return;
      }

      showToast('Failed to share message', 'error');
    }
  };

  // Use the shared guests data from context
  const { guests, loading, error, refresh } = useGuests();

  // Check WhatsApp connection status
  const { data: whatsAppStatus, error: whatsAppError } = useSWR(
    user ? '/api/whatsapp/status' : null,
    async (url) => {
      try {
        const response = await apiRequest(apiUrl(`${url}`));
        console.log(`[SendReminder] WhatsApp status response: ${response.status}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`[SendReminder] WhatsApp status error:`, errorData);
          throw new Error(errorData.error || 'Failed to fetch WhatsApp status');
        }
        const data = await response.json();
        console.log(`[SendReminder] WhatsApp status data:`, data);
        return data;
      } catch (error) {
        console.error(`[SendReminder] Network error fetching WhatsApp status:`, error);
        throw error;
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      onError: (error) => {
        console.error(`[SendReminder] WhatsApp status SWR error:`, error);
      }
    }
  );

  useEffect(() => {
    if (whatsAppStatus) {
      const isConnected =
        whatsAppStatus.ready === true ||
        whatsAppStatus.status === 'connected' ||
        whatsAppStatus.connected === true;
      setWhatsAppConnected(isConnected);
      setWhatsAppLoading(false);
    }
  }, [whatsAppStatus]);

  useEffect(() => {
    if (whatsAppError) {
      console.error('[SendReminder] WhatsApp status error:', whatsAppError);
      setWhatsAppLoading(false);
      showToast(`WhatsApp status check failed: ${whatsAppError.message}`, 'error');
    }
  }, [whatsAppError]);

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await apiRequest(apiUrl(`/api/reminders/${id}`), {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
        body: JSON.stringify({ guestId: id })
      });

      if (!response.ok) {
        throw new Error('Failed to delete guest');
      }

      showToast('Scheduler deleted successfully', 'success');
      refresh();
    } catch (error: any) {
      showToast(`Scheduler deleted failed, ${error}`, 'error');
    }
  };

  // Filter guests based on search term
  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = filteredGuests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageRows = filteredGuests.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset ke page 1 saat keyword berubah
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Filter guests for reminder creation (guests without active reminders)
  const { data: remindersData, error: remindersError, isLoading: remindersLoading, mutate: mutateReminders } = useSWR(
    user ? '/api/reminders' : null,
    async (url) => {
      const response = await apiRequest(apiUrl(`${url}`));
      if (!response.ok) {
        throw new Error('Failed to fetch reminders');
      }
      const data = await response.json();
      console.log('Reminders API response:', data); // Debug log
      return data;
    }
  );

  const reminders = remindersData?.data?.items || remindersData || [];
  console.log('Processed reminders array:', reminders); // Debug log
  const guestsWithoutReminders = guests.filter((guest: any) =>
    !reminders.some((reminder: ReminderItem) => reminder.guestId === guest._id)
  );

  return (
    <>
      <div className="bg-gray-50 text-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <NoticeModal
            open={openNotice}
            onClose={() => setOpenNotice(false)}
            title="Mohon diperhatikan!"
            confirmLabel="Mengerti"
          >
            <p>
              Untuk menghindari akun <a href="#" className="text-primary underline">WhatsApp ter-Block</a>,
              tolong atur jadwal reminder 5 menit pernama tamu undangan.
            </p>
          </NoticeModal>
          <div className="space-y-5">
            {/* Header tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-7">
              <button
                onClick={() => navigate('/guests')}
                className="rounded-lg sm:rounded-xl border border-border bg-secondary p-4 sm:p-5 flex items-center gap-2 sm:gap-3 shadow-sm hover:bg-accent transition-colors bg-secondary justify-center"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shadow-sm">
                  <img src={kelolaTamu} className="w-5 h-5 text-background" />
                </div>
                <div className="font-semibold text-sm sm:text-base">Kelola Tamu</div>
              </button>

              <div className="rounded-lg sm:rounded-xl border border-border p-4 sm:p-5 flex items-center gap-2 sm:gap-3 bg-primary shadow-sm justify-center">
                <img src={sendReminderAct} className="w-5 h-5 text-background" />
                <div className="font-semibold text-background text-sm sm:text-base">Send Reminder</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="rounded-lg sm:rounded-xl border border-border p-3 sm:p-4 shadow-sm bg-white rounded-b-none">
              <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm transition-colors flex-shrink-0 bg-primary text-white" onClick={() => setOpenIntro(true)}>
                    <img src={EditTeksPengantar} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} /> Teks Pengantar
                  </button>
                  <button
                    onClick={() => {
                      if (!whatsAppConnected && !whatsAppLoading) setWhatsAppModalOpen(true);
                    }}
                    disabled={whatsAppLoading || whatsAppConnected}
                    className={`inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-white text-xs sm:text-sm transition-colors
    ${whatsAppLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : whatsAppConnected
                          ? 'bg-green-500 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                  >
                    <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
                    {whatsAppLoading
                      ? 'Checking...'
                      : whatsAppConnected
                        ? 'WhatsApp Terhubung'
                        : 'Hubungkan WhatsApp'}
                  </button>

                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setFilterOpen(true)}
                      className="p-1.5 sm:p-2 rounded-lg border border-border bg-primary hover:bg-primary/10 transition-colors"
                      title="Filter columns"
                    >
                      <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-text/70" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                    </button>
                    <TableFilterPopover
                      open={filterOpen}
                      onClose={() => setFilterOpen(false)}
                      options={[
                        { key: 'no', label: 'No', checked: visibleCols.no },
                        { key: 'name', label: 'Nama', checked: visibleCols.name },
                        { key: 'phone', label: 'WhatsApp', checked: visibleCols.phone },
                        { key: 'status', label: 'Status', checked: visibleCols.status },
                        { key: 'terjadwal', label: 'Terjadwal', checked: visibleCols.terjadwal },
                        { key: 'reminder', label: 'Set Reminder', checked: visibleCols.reminder },
                        { key: 'share', label: 'Bagikan', checked: visibleCols.share },
                      ]}
                      onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                      onToggleAll={(checked) => {
                        const keys = ['no', 'name', 'phone', 'status', 'terjadwal', 'reminder', 'share'];
                        setVisibleCols(keys.reduce((acc, k) => ({ ...acc, [k]: checked }), {} as typeof visibleCols));
                      }}
                    />

                  </div>
                  <button className="p-1.5 sm:p-2 rounded-lg border border-border bg-primary hover:bg-primary/10 transition-colors" title="Settings">
                    <Cog className="w-3 h-3 sm:w-4 sm:h-4 text-text/70" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg sm:rounded-xl border border-border bg-white overflow-hidden shadow-sm px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 rounded-t-none" style={{ marginTop: '0px' }} >

              {/* Datatable controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-xs sm:text-sm mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-text/70">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                    className="border border-border rounded-md px-2 py-1 bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>entries</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="relative w-full sm:w-48 md:w-64">
                    <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-text/50" />
                    <input
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-lg border border-border bg-background text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {visibleCols.no && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium">No</th>}
                      {visibleCols.name && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium sticky left-0 bg-gray-50 z-10">Nama</th>}
                      {visibleCols.phone && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium hidden sm:table-cell">WhatsApp</th>}
                      {visibleCols.reminder && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium">Set Reminder</th>}
                      {visibleCols.terjadwal && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium hidden md:table-cell">Terjadwal</th>}
                      {visibleCols.status && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium">Status</th>}
                      {visibleCols.share && <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium text-center">Bagikan</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading || remindersLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-text/50">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading guests...
                          </div>
                        </td>
                      </tr>
                    ) : error || remindersError ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                          Error loading data: {error || remindersError}
                        </td>
                      </tr>
                    ) : filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-text/50">
                          No guests found
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((guest: any, index: number) => {
                        const hasReminder = reminders.some((reminder: ReminderItem) => reminder.guestId === guest._id);
                        return (
                          <tr key={guest._id} className="hover:bg-accent transition">
                            {visibleCols.no && <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap">{(page - 1) * pageSize + index + 1}</td>}
                            {visibleCols.name && <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap sticky left-0 bg-white z-10 text-sm sm:text-base">{guest.name}</td>}
                            {visibleCols.phone && <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">{guest.phone || '-'}</td>}
                            {visibleCols.reminder && (
                              <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedGuestForReminder({
                                      id: guest._id,
                                      name: guest.name,
                                      phone: guest.phone || ''
                                    });
                                    setReminderSettingsOpen(true);
                                  }}
                                  className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-[28px] ${guest.status === 'Confirmed' || hasReminder
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                >
                                  {guest.status === 'Confirmed' || hasReminder ? 'Done' : 'Setting'}
                                  <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                              </td>
                            )}
                            {visibleCols.terjadwal && (
                              <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                                {guest.reminderScheduledAt ? (
                                  <span className="text-xs text-gray-600">
                                    {new Date(guest.reminderScheduledAt).toLocaleString('id-ID', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            {visibleCols.status && (
                              <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  disabled={true}
                                  checked={guest.status === 'confirmed' || guest.status === 'scheduled' || !!guest.reminderScheduledAt}
                                  onChange={async (e) => {
                                    try {
                                      const newStatus = e.target.checked ? 'confirmed' : 'pending';

                                      // If unchecking (setting to pending), also remove any associated reminders
                                      if (!e.target.checked) {
                                        try {
                                          console.log(`[SendReminder] Removing reminders for guest ${guest._id}`);
                                          const remindersResponse = await apiRequest(apiUrl(`/api/reminders`), {
                                            method: 'GET'
                                          });

                                          if (remindersResponse.ok) {
                                            const remindersData = await remindersResponse.json();
                                            const guestReminders = remindersData.data?.items?.filter((reminder: any) => reminder.guestId === guest._id) || [];

                                            // Delete all reminders for this guest
                                            for (const reminder of guestReminders) {
                                              await apiRequest(apiUrl(`/api/reminders/${reminder.id}`), {
                                                method: 'DELETE'
                                              });
                                              console.log(`[SendReminder] Deleted reminder ${reminder.id} for guest ${guest._id}`);
                                            }
                                          }
                                        } catch (reminderError) {
                                          console.error(`[SendReminder] Error removing reminders:`, reminderError);
                                          // Continue with status update even if reminder deletion fails
                                        }
                                      }

                                      await apiRequest(apiUrl(`/api/guests/${guest._id}`), {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: newStatus })
                                      });
                                      showToast('Guest status updated successfully', 'success');
                                      refresh();
                                    } catch (error: any) {
                                      showToast(`Error updating status: ${error.message}`, 'error');
                                    }
                                  }}
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                                />
                              </td>
                            )}
                            {visibleCols.share && (
                              <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 min-w-[12rem] text-center">
                                <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                                  <button
                                    onClick={() => { handleShareGuest(guest) }}
                                    className="flex-shrink-0 p-2 w-8 h-8 rounded-md bg-blue-500 hover:bg-blue-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Share"
                                  >
                                    <img src={shared} className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { handleCopyWhatsAppMessage(guest) }}
                                    className="flex-shrink-0 p-2 w-8 h-8 rounded-md bg-gray-300 text-blue-700 hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center"
                                    title="Copy message"
                                  >
                                    <img src={Copy} className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={() => handleDeleteReminder(guest._id)}
                                    className="flex-shrink-0 p-2 w-8 h-8 rounded-md bg-red-500 hover:bg-red-400 transition-all shadow-sm flex items-center justify-center"
                                  >
                                    <img src={Delete} className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
                <p className="text-xs sm:text-sm">Showing {totalItems === 0 ? 0 : pageStart + 1} {' '}to{' '}{Math.min(pageStart + pageSize, totalItems)} {' '}of{' '}{totalItems} entries</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-2 sm:px-3 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors text-xs sm:text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-2 sm:px-3 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors text-xs sm:text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder Settings Modal */}
          {selectedGuestForReminder && (
            <ReminderSettingsModal
              open={reminderSettingsOpen}
              onClose={() => {
                setReminderSettingsOpen(false);
                setSelectedGuestForReminder(null);
              }}
              guestId={selectedGuestForReminder.id}
              guestName={selectedGuestForReminder.name}
              phone={selectedGuestForReminder.phone}
              existingReminder={reminders.find((reminder: ReminderItem) => reminder.guestId === selectedGuestForReminder.id)}
              currentIntroTextCategory={guests.find((guest: any) => guest._id === selectedGuestForReminder.id)?.introTextCategory}
              onSuccess={() => {
                mutateReminders();
                refresh();
              }}
            />
          )}

          <IntroTextModal
            open={openIntro}
            onClose={() => setOpenIntro(false)}
            onSave={() => setOpenIntro(false)}
          />

          {/* WhatsApp Connection Modal */}
          <WhatsAppConnectionModal
            open={whatsAppModalOpen}
            onClose={() => setWhatsAppModalOpen(false)}
            onConnected={() => {
              setWhatsAppConnected(true);
              showToast('WhatsApp berhasil terhubung!', 'success');
            }}
          />
        </div>
      </div >
    </>
  );
};

export default SendReminder;
