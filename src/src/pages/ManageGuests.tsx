import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  FileText,
  Filter,
  Settings as Cog,
  Search,
  Bell,
  Users,
  Edit3,
  Trash2,
  Send,
  Eye,
  LayoutGrid,
  Loader2,
  RefreshCw,
  MessageCircle,
  Share2
} from 'lucide-react';
import { ExcelImportModal } from '../components/guests/ExcelImportModal';
import { AddGuestModal } from '../components/guests/AddGuestModal';
import { EditGuestModal } from '../components/guests/EditGuestModal';
import { IntroTextModal } from '../components/guests/IntroTextModal';
import { IntroTextCategoryDropdown } from '../components/guests/IntroTextCategoryDropdown';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
import { Guest } from '../../../shared/types';
import { Toast } from '../components/common/Toast';
import { NoticeModal } from '../components/common/NoticeModal';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';
import { apiUrl } from '../lib/api';
import kelolaTamuAct from '../assets/KelolaTamuAct.png';
import sendReminder from '../assets/SendReminder.png';
import TambahTamu from '../assets/TambahTamu.png';
import EditTeksPengantar from '../assets/EditTeksPengantar.png';
import setting from '../assets/setting.png';
import filter from '../assets/filter.png';
import edit from '../assets/Edit.png';
import Whatsapp from '../assets/Whatsapp.png';
import shared from '../assets/shared.png';
import Copy from '../assets/Copy.png';
import Delete from '../assets/Delete.png';

const ManageGuests: React.FC = () => {
  const navigate = useNavigate();
  const { apiRequest, user } = useAuth();
  const [openAdd, setOpenAdd] = useState(false);
  const [openIntro, setOpenIntro] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);
  const [openExcelImport, setOpenExcelImport] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    no: true,
    name: true,
    phone: true,
    kode: true,
    kategori: true,
    informasi: true,
    sesi: true,
    limit: true,
    meja: true,
    pengantar: true,
    teks: true,
    kirim: true,
    status: true,
    ditambahkan: true,
  });

  const { guests, loading, error, refresh, setGuests } = useGuests();

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (guest.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Handle search - only trigger when search term changes
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // SWR will automatically revalidate when the key changes due to searchTerm
  };

  // Generate unique invitation code
  const generateUniqueInvitationCode = async (baseCode: string): Promise<string> => {
    let code = baseCode;
    let counter = 1;

    // Check if code exists and generate unique one
    while (true) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(apiUrl(`/api/guests/search?q=${encodeURIComponent(code)}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (data.success && data.data.length > 0) {
          // Code exists, try next variation
          code = `${baseCode}-${counter}`;
          counter++;

          // Safety check to prevent infinite loop
          if (counter > 100) {
            code = `${baseCode}-${Date.now()}`;
            break;
          }
        } else {
          // Code doesn't exist, we can use it
          break;
        }
      } catch (error) {
        console.error('Error checking invitation code:', error);
        // If check fails, fall back to timestamp
        code = `${baseCode}-${Date.now()}`;
        break;
      }
    }

    return code;
  };

  // Handle guest update
  const handleUpdateGuest = async (guestData: any) => {
    if (!selectedGuest) return;

    try {
      console.log('[ManageGuests] Updating guest with data:', guestData);

      const mappedData = {
        name: guestData.name,
        phone: guestData.phone,
        email: guestData.email || '',
        category: guestData.category || 'Regular',
        notes: guestData.info || '',
        session: guestData.session,
        limit: guestData.limit,
        tableNo: guestData.tableNo,
      };

      console.log('[ManageGuests] Mapped data for backend:', mappedData);

      const response = await apiRequest(apiUrl(`/api/guests/${selectedGuest._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedData)
      });

      console.log('[ManageGuests] Response status:', response.status);
      const responseData = await response.json();
      console.log('[ManageGuests] Response data:', responseData);

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || responseData.details || 'Failed to update guest';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      if (!responseData.success) {
        const errorMessage = responseData.error || responseData.message || responseData.details || 'Guest update failed';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      setToast({ message: 'Guest updated successfully', type: 'success' });
      setOpenEdit(false);
      setSelectedGuest(null);
      refresh();
    } catch (error: any) {
      console.error('[ManageGuests] Error updating guest:', error);
      const errorMessage = error.message || 'Failed to update guest';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  // Handle guest creation
  const handleCreateGuest = async (guestData: any) => {
    try {
      console.log('[ManageGuests] Creating guest with data:', guestData);

      // Generate unique invitation code
      const baseCode = guestData.tableNo || `INV-${Date.now()}`;
      const uniqueCode = await generateUniqueInvitationCode(baseCode);

      const mappedData = {
        name: guestData.name,
        phone: guestData.phone,
        email: guestData.email || '',
        invitationCode: uniqueCode,
        category: guestData.category || 'Regular',
        status: 'Pending',
        plusOne: false,
        notes: guestData.info || '',
        code: uniqueCode, // Use the same unique code
        session: guestData.session,
        limit: guestData.limit,
        tableNo: guestData.tableNo,
        info: guestData.info,
        introTextCategory: 'Formal' // Default intro text category
      };

      console.log('[ManageGuests] Mapped data for backend:', mappedData);

      const response = await apiRequest(apiUrl(`/api/guests`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedData)
      });

      console.log('[ManageGuests] Response status:', response.status);
      const responseData = await response.json();
      console.log('[ManageGuests] Response data:', responseData);

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || responseData.details || 'Failed to create guest';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      if (!responseData.success) {
        const errorMessage = responseData.error || responseData.message || responseData.details || 'Guest creation failed';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      setToast({ message: 'Guest created successfully', type: 'success' });
      setOpenAdd(false);
      refresh();
    } catch (error: any) {
      console.error('[ManageGuests] Error creating guest:', error);
      const errorMessage = error.message || 'Failed to create guest';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  // Handle guest deletion
  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;

    try {
      const response = await apiRequest(apiUrl(`/api/guests/${guestId}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete guest');
      }

      setToast({ message: 'Guest deleted successfully', type: 'success' });
      refresh();
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' });
    }
  };

  // Handle guest status update
  const handleStatusChange = async (guestId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Confirmed' || currentStatus === 'scheduled' ? 'Pending' : 'Confirmed';
      console.log(`[handleStatusChange] Updating guest ${guestId} status from ${currentStatus} to ${newStatus}`);

      // If unchecking (setting to Pending), also remove any associated reminders
      if (newStatus === 'Pending') {
        try {
          console.log(`[handleStatusChange] Removing reminders for guest ${guestId}`);
          const remindersResponse = await apiRequest(apiUrl(`/api/reminders`), {
            method: 'GET'
          });

          if (remindersResponse.ok) {
            const remindersData = await remindersResponse.json();
            const guestReminders = remindersData.data?.items?.filter((reminder: any) => reminder.guestId === guestId) || [];

            // Delete all reminders for this guest
            for (const reminder of guestReminders) {
              await apiRequest(apiUrl(`/api/reminders/${reminder.id}`), {
                method: 'DELETE'
              });
              console.log(`[handleStatusChange] Deleted reminder ${reminder.id} for guest ${guestId}`);
            }
          }
        } catch (reminderError) {
          console.error(`[handleStatusChange] Error removing reminders:`, reminderError);
          // Continue with status update even if reminder deletion fails
        }
      }

      // Optimistic update: update local state immediately
      setGuests(prevGuests =>
        prevGuests.map(guest =>
          guest._id === guestId
            ? {
              ...guest,
              status: newStatus,
              // If unchecking (setting to Pending), also clear reminderScheduledAt
              reminderScheduledAt: newStatus === 'Pending' ? undefined : guest.reminderScheduledAt
            }
            : guest
        )
      );

      // Prepare update data - if setting to Pending, also clear reminderScheduledAt
      const updateData: any = { status: newStatus };
      if (newStatus === 'Pending') {
        updateData.reminderScheduledAt = null; // Clear the scheduled reminder
      }

      const response = await apiRequest(apiUrl(`/api/guests/${guestId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const responseData = await response.json();
      console.log(`[handleStatusChange] Server response:`, responseData);

      if (!response.ok) {
        console.error(`[handleStatusChange] Server error, reverting optimistic update`);
        // Revert optimistic update on error
        setGuests(prevGuests =>
          prevGuests.map(guest =>
            guest._id === guestId
              ? { ...guest, status: currentStatus, reminderScheduledAt: guest.reminderScheduledAt }
              : guest
          )
        );
        throw new Error(responseData.error || 'Failed to update guest status');
      }

      console.log(`[handleStatusChange] Status update successful!`);
      setToast({ message: `Guest status updated to ${newStatus}`, type: 'success' });
      // Refresh to ensure data consistency
      await refresh();
    } catch (error: any) {
      console.error(`[handleStatusChange] Error:`, error);
      setToast({ message: error.message || 'Failed to update guest status', type: 'error' });
    }
  };

  // Handle intro text category change
  const handleIntroTextCategoryChange = async (guestId: string, category: string) => {
    console.log(`[handleIntroTextCategoryChange] === HANDLER START ===`);
    console.log(`[handleIntroTextCategoryChange] Called with guestId: ${guestId}, category: ${category}`);
    console.log(`[handleIntroTextCategoryChange] Total guests in state: ${guests.length}`);

    try {
      // Get the current guest to preserve existing data
      const currentGuest = guests.find(g => g._id === guestId);
      if (!currentGuest) {
        console.error(`[handleIntroTextCategoryChange] Guest not found with ID: ${guestId}`);
        throw new Error('Guest not found');
      }

      console.log(`[handleIntroTextCategoryChange] Found guest: ${currentGuest.name} (${currentGuest._id})`);
      console.log(`[handleIntroTextCategoryChange] Current guest introTextCategory: ${currentGuest.introTextCategory}`);
      console.log(`[handleIntroTextCategoryChange] Updating to category: ${category}`);

      // Optimistic update: update local state immediately
      console.log(`[handleIntroTextCategoryChange] Starting optimistic update...`);
      setGuests(prevGuests => {
        console.log(`[handleIntroTextCategoryChange] Previous guests count: ${prevGuests.length}`);
        const updatedGuests = prevGuests.map(guest => {
          if (guest._id === guestId) {
            console.log(`[handleIntroTextCategoryChange] Updating local state for guest ${guestId} from ${guest.introTextCategory} to ${category}`);
            return { ...guest, introTextCategory: category };
          }
          return guest;
        });
        console.log(`[handleIntroTextCategoryChange] Updated guests count: ${updatedGuests.length}`);
        return updatedGuests;
      });

      console.log(`[handleIntroTextCategoryChange] Sending PUT request to server...`);
      const response = await apiRequest(apiUrl(`/api/guests/${guestId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introTextCategory: category })
      });

      const responseData = await response.json();
      console.log(`[handleIntroTextCategoryChange] Server response:`, responseData);

      if (!response.ok) {
        console.error(`[handleIntroTextCategoryChange] Server error, reverting optimistic update`);
        // Revert optimistic update on error
        setGuests(prevGuests =>
          prevGuests.map(guest =>
            guest._id === guestId
              ? { ...guest, introTextCategory: currentGuest.introTextCategory }
              : guest
          )
        );
        throw new Error(responseData.error || 'Failed to update intro text category');
      }

      console.log(`[handleIntroTextCategoryChange] Update successful!`);
      setToast({ message: 'Intro text category updated successfully', type: 'success' });
      // Refresh to ensure data consistency
      await refresh();
    } catch (error: any) {
      console.error(`[handleIntroTextCategoryChange] Error:`, error);
      setToast({ message: error.message, type: 'error' });
    } finally {
      console.log(`[handleIntroTextCategoryChange] === HANDLER END ===`);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle sharing guest information via native share API
  const handleShareGuest = async (guest: Guest) => {
    try {
      console.log(`[handleShareGuest] Starting share for guest: ${guest.name} (${guest._id})`);
      console.log(`[handleShareGuest] Guest introTextCategory: ${guest.introTextCategory}`);

      if (!guest.introTextCategory) {
        setToast({ message: 'Please select an intro text category first', type: 'error' });
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
      console.log(`[handleShareGuest] Intro text response:`, result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch intro text');
      }

      let introText = result.data.text;
      console.log(`[handleShareGuest] Original intro text:`, introText);

      // Get account information for mempelai
      const accountResponse = await apiRequest(apiUrl(`/api/auth/accounts/${user?.accountId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      let accountName = 'Mempelai'; // Default fallback
      if (accountResponse.ok) {
        const accountResult = await accountResponse.json();
        if (accountResult.success && accountResult.data?.account) {
          accountName = accountResult.data.account.name || 'Mempelai';
        }
      }

      // Replace placeholders with actual guest data
      // Map guest category to invitation category: VIP = 1, Regular = 2
      const invitationCategory = guest.category === 'VIP' ? '1' : '2';
      const invitationLink = `https://attarivitation.com/hamid-khalisha/?to=${encodeURIComponent(guest.name)}&sesi=${encodeURIComponent(guest.session || '1')}&cat=${invitationCategory}&lim=${encodeURIComponent(guest.limit?.toString() || '1')}`;

      introText = introText
        .replace(/\[nama\]/g, guest.name)
        .replace(/\[mempelai\]/g, accountName)
        .replace(/\[link-undangan\]/g, invitationLink);

      console.log(`[handleShareGuest] Processed intro text:`, introText);

      // Check if Web Share API is available
      if (navigator.share) {
        // Use native share API
        const shareData = {
          title: `Wedding Invitation for ${guest.name}`,
          text: introText,
          url: invitationLink
        };

        await navigator.share(shareData);
        setToast({ message: 'Shared successfully', type: 'success' });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(introText);
        setToast({ message: 'Message copied to clipboard (Share API not available)', type: 'info' });
      }
    } catch (error: any) {
      console.error(`[handleShareGuest] Error:`, error);

      // Handle specific share API errors
      if (error.name === 'AbortError') {
        // User cancelled the share dialog - this is not an error
        console.log('[handleShareGuest] User cancelled share dialog');
        return;
      }

      setToast({ message: error.message || 'Failed to share message', type: 'error' });
    }
  };

  // Handle copying WhatsApp message to clipboard
  const handleCopyWhatsAppMessage = async (guest: Guest) => {
    try {
      console.log(`[handleCopyWhatsAppMessage] Starting copy for guest: ${guest.name} (${guest._id})`);
      console.log(`[handleCopyWhatsAppMessage] Guest introTextCategory: ${guest.introTextCategory}`);

      if (!guest.introTextCategory) {
        setToast({ message: 'Please select an intro text category first', type: 'error' });
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
      console.log(`[handleCopyWhatsAppMessage] Intro text response:`, result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch intro text');
      }

      let introText = result.data.text;
      console.log(`[handleCopyWhatsAppMessage] Original intro text:`, introText);

      // Get account information for mempelai
      const accountResponse = await apiRequest(apiUrl(`/api/auth/accounts/${user?.accountId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      let accountName = 'Mempelai'; // Default fallback
      if (accountResponse.ok) {
        const accountResult = await accountResponse.json();
        if (accountResult.success && accountResult.data?.account) {
          accountName = accountResult.data.account.name || 'Mempelai';
        }
      }

      // Replace placeholders with actual guest data
      // Map guest category to invitation category: VIP = 1, Regular = 2
      const invitationCategory = guest.category === 'VIP' ? '1' : '2';
      const invitationLink = `https://attarivitation.com/hamid-khalisha/?to=${encodeURIComponent(guest.name)}&sesi=${encodeURIComponent(guest.session || '1')}&cat=${invitationCategory}&lim=${encodeURIComponent(guest.limit?.toString() || '1')}`;

      introText = introText
        .replace(/\[nama\]/g, guest.name)
        .replace(/\[mempelai\]/g, accountName)
        .replace(/\[link-undangan\]/g, invitationLink);

      console.log(`[handleCopyWhatsAppMessage] Processed intro text:`, introText);

      // Copy to clipboard
      await navigator.clipboard.writeText(introText);

      setToast({ message: 'WhatsApp message copied to clipboard', type: 'success' });
    } catch (error: any) {
      console.error(`[handleCopyWhatsAppMessage] Error:`, error);
      setToast({ message: error.message || 'Failed to copy WhatsApp message', type: 'error' });
    }
  };

  // Handle WhatsApp message sending with dynamic placeholder replacement
  const handleWhatsAppSend = async (guest: Guest) => {
    try {
      console.log(`[handleWhatsAppSend] Starting WhatsApp send for guest: ${guest.name} (${guest._id})`);
      console.log(`[handleWhatsAppSend] Guest introTextCategory: ${guest.introTextCategory}`);
      console.log(`[handleWhatsAppSend] Guest phone: ${guest.phone}`);

      if (!guest.phone) {
        setToast({ message: 'Guest phone number is required', type: 'error' });
        return;
      }

      if (!guest.introTextCategory) {
        setToast({ message: 'Please select an intro text category first', type: 'error' });
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
      console.log(`[handleWhatsAppSend] Intro text response:`, result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch intro text');
      }

      let introText = result.data.text;
      console.log(`[handleWhatsAppSend] Original intro text:`, introText);

      // Get account information for mempelai
      const accountResponse = await apiRequest(apiUrl(`/api/auth/accounts/${user?.accountId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      let accountName = 'Mempelai'; // Default fallback
      if (accountResponse.ok) {
        const accountResult = await accountResponse.json();
        if (accountResult.success && accountResult.data?.account) {
          accountName = accountResult.data.account.name || 'Mempelai';
        }
      }

      // Replace placeholders with actual guest data
      // Map guest category to invitation category: VIP = 1, Regular = 2
      const invitationCategory = guest.category === 'VIP' ? '1' : '2';
      const invitationLink = `https://attarivitation.com/hamid-khalisha/?to=${encodeURIComponent(guest.name)}&sesi=${encodeURIComponent(guest.session || '1')}&cat=${invitationCategory}&lim=${encodeURIComponent(guest.limit?.toString() || '1')}`;

      introText = introText
        .replace(/\[nama\]/g, guest.name)
        .replace(/\[mempelai\]/g, accountName)
        .replace(/\[link-undangan\]/g, invitationLink);

      console.log(`[handleWhatsAppSend] Processed intro text:`, introText);

      // Format phone number (remove +, spaces, etc.)
      const formattedPhone = guest.phone.replace(/[\s\+\-\(\)]/g, '');
      console.log(`[handleWhatsAppSend] Formatted phone: ${formattedPhone}`);

      // URL encode the text
      const encodedText = encodeURIComponent(introText);
      console.log(`[handleWhatsAppSend] Encoded text length: ${encodedText.length}`);

      // Create WhatsApp URL
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
      console.log(`[handleWhatsAppSend] WhatsApp URL: ${whatsappUrl}`);

      // Open in new tab
      window.open(whatsappUrl, '_blank');

      setToast({ message: 'WhatsApp message opened successfully', type: 'success' });
    } catch (error: any) {
      console.error(`[handleWhatsAppSend] Error:`, error);
      setToast({ message: error.message || 'Failed to open WhatsApp message', type: 'error' });
    }
  };



  // Drag-to-scroll using Pointer Events (works for mouse + touch)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Only handle primary button / touch
      if ((e as any).button && (e as any).button !== 0) return;
      isDown = true;
      setIsDragging(true);
      (e.target as Element).setPointerCapture?.((e as any).pointerId);
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const x = e.clientX;
      const walk = startX - x;
      el.scrollLeft = scrollLeft + walk;
      e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent) => {
      isDown = false;
      setIsDragging(false);
      try { (e.target as Element).releasePointerCapture?.((e as any).pointerId); } catch { }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading guests: {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4 sm:space-y-5">
          {/* Toast notifications */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {/* Header Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-7">
            <div className="rounded-xl border border-border p-5 flex items-center gap-3 bg-primary shadow-sm justify-center">
              <img src={kelolaTamuAct} className="w-5 h-5 text-background" />
              <div className="font-semibold text-background">Kelola Tamu</div>
            </div>


            <button
              onClick={() => navigate('/guests/send-reminder')}
              className="rounded-xl border border-border bg-secondary p-5 flex items-center gap-3 shadow-sm hover:bg-accent transition-colors bg-secondary justify-center"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shadow-sm">
                <img src={sendReminder} className="w-5 h-5 text-primary" />
              </div>
              <div className="font-semibold">Send Reminder</div>
            </button>


          </div>

          {/* Actions row */}
          <div className="rounded-xl border border-border p-3 sm:p-4 shadow-sm bg-white  rounded-b-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm shadow-sm hover:bg-primary/90 transition-colors flex-shrink-0 bg-primary text-white" onClick={() => setOpenAdd(true)}>
                  <img src={TambahTamu} className="w-4 h-4" /> Tambah Tamu
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm  transition-colors flex-shrink-0 bg-primary text-white"
                  onClick={() => setOpenExcelImport(true)}
                >
                  <Download className="w-4 h-4" /> Import Excel
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm transition-colors flex-shrink-0 bg-primary text-white" onClick={() => setOpenIntro(true)}>
                  <img src={EditTeksPengantar} className="w-4 h-4" /> Teks Pengantar
                </button>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="p-1.5 sm:p-2 rounded-lg border border-border bg-accent hover:bg-primary/10 transition-colors"
                    title="Filter columns"
                  >
                    <img src={filter} className="w-4 h-4" />
                  </button>
                  <TableFilterPopover
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    options={[
                      { key: 'no', label: 'No', checked: visibleCols.no },
                      { key: 'name', label: 'Nama', checked: visibleCols.name },
                      { key: 'phone', label: 'WhatsApp', checked: visibleCols.phone },
                      { key: 'status', label: 'Status', checked: visibleCols.status },
                      { key: 'kode', label: 'kode', checked: visibleCols.kode },
                      { key: 'kategori', label: 'kategori', checked: visibleCols.kategori },
                      { key: 'informasi', label: 'informasi', checked: visibleCols.informasi },
                      { key: 'teks', label: 'Teks Pengantar', checked: visibleCols.teks },
                      { key: 'sesi', label: 'Sesi', checked: visibleCols.sesi },
                      { key: 'limit', label: 'Limit Tamu', checked: visibleCols.limit },
                      { key: 'meja', label: 'No. Meja', checked: visibleCols.meja },
                      { key: 'kirim', label: 'Kirim', checked: visibleCols.kirim },
                      { key: 'ditambahkan', label: 'Ditambahkan', checked: visibleCols.ditambahkan },
                    ]}
                    onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                    onToggleAll={(checked) => {
                      const keys = ['no', 'name', 'phone', 'status', 'kode', 'kategori', 'informasi', 'sesi', 'limit', 'meja', 'kirim', 'ditambahkan', 'teks'];
                      setVisibleCols(keys.reduce((acc, k) => ({ ...acc, [k]: checked }), {} as typeof visibleCols));
                    }}
                  />

                </div>
                <button className="p-2 rounded-lg border border-border transition-colors bg-primary" aria-label="Settings"><img src={setting} className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Responsive Table */}
          {/* Table Card */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm px-4 sm:px-6 lg:px-8 py-6  rounded-t-none" style={{ marginTop: '0px' }} >
            {/* Meta + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-sm mb-6">
              <div className="text-text/70">Show [ {guests.length} ]entries</div>
              <form onSubmit={handleSearch} className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text/50" />
                <input
                  className="pl-9 pr-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm w-full sm:w-64 hover:border-primary/50 transition-colors"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>
            <div ref={scrollRef} className={`overflow-x-auto w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
              <div className="w-full overflow-x-auto">
                <table className="table-auto w-full min-w-[1200px] text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      {visibleCols.no && <th className="px-4 py-3 text-xs font-medium text-text/70">No</th>}
                      {visibleCols.name && <th className="px-4 py-3 text-xs font-medium text-text/70 sticky bg-gray-50 left-0">Nama</th>}
                      {visibleCols.phone && <th className="px-4 py-3 text-xs font-medium text-text/70">WhatsApp</th>}
                      {visibleCols.kode && <th className="px-4 py-3 text-xs font-medium text-text/70">Kode</th>}
                      {visibleCols.kategori && <th className="px-4 py-3 text-xs font-medium text-text/70">Kategori</th>}
                      {visibleCols.informasi && <th className="px-4 py-3 text-xs font-medium text-text/70">Informasi</th>}
                      {visibleCols.sesi && <th className="px-4 py-3 text-xs font-medium text-text/70">Sesi</th>}
                      {visibleCols.limit && <th className="px-4 py-3 text-xs font-medium text-text/70">Limit</th>}
                      {visibleCols.meja && <th className="px-4 py-3 text-xs font-medium text-text/70">No. Meja</th>}
                      {visibleCols.teks && <th className="px-4 py-3 text-xs font-medium text-text/70">Teks Pengantar</th>}

                      {/* Kolom Kirim - beri min-width agar cukup untuk ikon */}
                      {visibleCols.kirim && <th className="px-4 py-3 text-xs font-medium text-text/70 text-center whitespace-nowrap min-w-[200px]">
                        Kirim
                      </th>}

                      {visibleCols.status && <th className="px-4 py-3 text-xs font-medium text-text/70">Status</th>}
                      {visibleCols.ditambahkan && <th className="px-4 py-3 text-xs font-medium text-text/70">Ditambahkan</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {filteredGuests.map((guest: Guest, index: number) => (
                      <tr key={guest._id} className="hover:bg-accent/50 transition-colors">
                        {visibleCols.no && <td className="px-4 py-4 text-sm whitespace-nowrap">{String(index + 1).padStart(2, '0')}</td> }
                        {visibleCols.name && <td className="px-4 py-4 text-sm whitespace-nowrap sticky left-0 bg-white z-10">{guest.name}</td>}
                        {visibleCols.phone && <td className="px-4 py-4 text-sm whitespace-nowrap">{guest.phone || '-'}</td> }
                        {visibleCols.kode && <td className="px-4 py-4 text-sm whitespace-nowrap text-primary">{guest.code || '-'}</td>}
                        {visibleCols.kategori && <td className="px-4 py-4 text-sm whitespace-nowrap">{guest.category || 'Reguler'}</td> }

                        {/* Informasi */}
                        {visibleCols.informasi && <td className="px-4 py-4 text-sm whitespace-nowrap max-w-[160px] truncate">
                          {guest.info ? (
                            <button
                              type="button"
                              onClick={() => { setSelectedInfo(guest.info as string); setInfoOpen(true); }}
                              title={guest.info}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs shadow-sm"
                            >
                              {guest.info.length > 6 ? guest.info.slice(0, 6) + '…' : guest.info}
                            </button>
                          ) : '-'}
                        </td> }

                        {visibleCols.sesi && <td className="px-4 py-4 text-sm whitespace-nowrap">{guest.session || '-'}</td>}
                        {visibleCols.limit && <td className="px-4 py-4 text-sm whitespace-nowrap">{guest.limit ?? '-'}</td>}
                        {visibleCols.meja && <td className="px-4 py-4 text-sm whitespace-nowrap">{guest.tableNo || '-'}</td>}

                        {/* Teks Pengantar */}
                        {visibleCols.teks && <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <IntroTextCategoryDropdown
                            guestId={guest._id || ''}
                            currentCategory={guest.introTextCategory || 'Formal'}
                            onCategoryChange={handleIntroTextCategoryChange}
                          />
                        </td>}

                        {/* Kolom Kirim */}
                        {visibleCols.kirim && <td className="py-4 text-sm text-center whitespace-nowrap min-w-[200px]">
                          <div className="inline-flex items-center justify-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => { setSelectedGuest(guest); setOpenEdit(true); }}
                              title="Edit"
                              className="p-2 rounded-md bg-yellow-500 text-yellow-700 hover:bg-yellow-200 transition-shadow shadow-sm shrink-0"
                            >
                              <img src={edit} className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleWhatsAppSend(guest)}
                              title="Send WhatsApp"
                              className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-shadow shadow-sm shrink-0"
                            >
                              <img src={Whatsapp} className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareGuest(guest)}
                              title="Share"
                              className="p-2 rounded-md bg-blue-500 hover:bg-blue-200 transition-shadow shadow-sm shrink-0"
                            >
                              <img src={shared} className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyWhatsAppMessage(guest)}
                              title="Copy"
                              className="p-2 rounded-md bg-gray-300 text-blue-700 hover:bg-gray-200 transition-shadow shadow-sm shrink-0"
                            >
                              <img src={Copy} className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(guest._id)}
                              title="Delete"
                              className="p-2 rounded-md bg-red-500 text-red-700 hover:bg-red-00 transition-shadow shadow-sm shrink-0"
                            >
                              <img src={Delete} className="w-4 h-4" />
                            </button>
                          </div>
                        </td>}

                        {/* Status */}
                        {visibleCols.status && <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              checked={guest.status === 'Confirmed' || guest.status === 'scheduled'}
                              onChange={() => handleStatusChange(guest._id, guest.status)}
                              className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
                              title={guest.status === 'Confirmed' ? 'Terkirim' : guest.status === 'scheduled' ? 'Terjadwal' : 'Belum'}
                            />
                            {guest.status === 'scheduled' && (
                              <span className="text-xs text-purple-600 font-medium">Terjadwal</span>
                            )}
                          </div>
                        </td>}

                        {visibleCols.ditambahkan && <td className="px-4 py-4 text-sm whitespace-nowrap">{formatDate(guest.createdAt)}</td> }
                      </tr>
                    ))}

                    {filteredGuests.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-text/60">No guests found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
              <p>Showing {filteredGuests.length} of {guests.length} entries</p>
              <div className="text-text/60">Previous/Next</div>
            </div>
          </div>

          {/* Modals */}
          <ExcelImportModal
            open={openExcelImport}
            onClose={() => setOpenExcelImport(false)}
            onImportComplete={() => {
              refresh();
              setToast({ message: 'Excel import completed successfully', type: 'success' });
            }}
          />
          <IntroTextModal
            open={openIntro}
            onClose={() => setOpenIntro(false)}
            onSave={() => setOpenIntro(false)}
          />
          <AddGuestModal
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            onSave={handleCreateGuest}
          />
          <EditGuestModal
            open={openEdit}
            onClose={() => { setOpenEdit(false); setSelectedGuest(null); }}
            onSave={handleUpdateGuest}
            guest={selectedGuest}
          />
          <NoticeModal
            open={infoOpen}
            onClose={() => { setInfoOpen(false); setSelectedInfo(null); }}
            title="Information"
            confirmLabel="Close"
          >
            <div className="text-sm whitespace-pre-line">{selectedInfo}</div>
          </NoticeModal>

        </div>
      </div>
    </div>
  );
};

export default ManageGuests;
