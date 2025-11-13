/**
 * Souvenirs Page - Souvenir Distribution Management
 * Integrates with consolidated guest data for souvenir tracking
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Edit3, QrCode, Trash2, UserPlus, Filter, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
import NonInvitedSouvenirAssignmentModal, { NonInvitedGuestData } from '../components/souvenirs/NonInvitedSouvenirAssignmentModal';
import { useToast } from '../contexts/ToastContext';
import SouvenirAssignmentModal from '../components/souvenirs/SouvenirAssignmentModal';
import { Guest } from '../../shared/types';
import { BottomBar } from '../components/navigation/BottomBar';
import { useNavigate } from 'react-router-dom';
import { AddGuestModal, AddGuestFormData } from '../components/guests/AddGuestModal';
import { CheckInModal } from '../components/checkin/CheckInModal';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';
import { ConfirmModal } from "../components/common/DeleteModal";
import { NoticeModal } from '../components/common/NoticeModal';
import { apiUrl } from '../lib/api';
import edit from '../assets/Edit.png';
import Delete from '../assets/Delete.png';
import QRimg from '../assets/qr-code.png';
import Welcome from '../assets/Welcome.png';
import Excel from '../assets/xls-file.png';
import Souvenir from '../assets/Souvenir.png';

export const Souvenirs: React.FC = () => {
  const { apiRequest, token } = useAuth();
  const { guests, allGuests, loading, error, refresh } = useGuests();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSouvenirStatus, setSelectedSouvenirStatus] = useState('All');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [nonInvitedGuestModalOpen, setNonInvitedGuestModalOpen] = React.useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [visibleCols, setVisibleCols] = React.useState<Record<string, boolean>>({
    no: true,
    name: true,
    kategori: true,
    informasi: true,
    souvenir: true,
    tanggal: true,
    waktu: true,
    status: true,
    edit: true,
  });

  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // Handle souvenir assignment completion
  const handleAssignmentComplete = async (guestId: string, count: number, kado: number, angpao: number) => {
    try {
      const response = await apiRequest(apiUrl(`/api/guests/${guestId}/souvenirs`), {
        method: 'POST',
        body: JSON.stringify({ count, kado, angpao })
      });
      const responseData = await response.json();
      if (responseData.success) {
        await refresh();
      } else {
        throw new Error(responseData.error || 'Failed to assign souvenir');
      }
    } catch (error: any) {
      console.error('[Souvenirs] Error assigning souvenir:', error?.message || error);
      throw error;
    }
  };

  const handleQRCodeScanned = (qrData: string) => {
    try {
      const guestName = qrData.trim();

      if (!guestName) {
        alert('Empty QR code data');
        return;
      }

      // Find guest by name (case-insensitive) - now searches all guests
      const foundGuest = allGuests.find((g) =>
        g.name.toLowerCase() === guestName.toLowerCase()
      );

      if (foundGuest) {
        setSelectedGuest(foundGuest);
        setIsAssignmentModalOpen(true);
        setIsQRScannerOpen(false);
      } else {
        alert(`Guest "${guestName}" not found`);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      alert('Invalid QR code format');
    }
  };


  const handleDeleteSouvenir = async (guestId: string) => {
    setSelectedGuestId(guestId);
    setConfirmOpen(true);
  };

  const confirmDeleteSouvenir = async () => {
    if (!selectedGuestId) return;

    try {
      const response = await apiRequest(
        apiUrl(`/api/guests/${selectedGuestId}/souvenirs`),
        { method: "DELETE" }
      );
      const responseData = await response.json();

      if (responseData.success) {
        await refresh();
      } else {
        throw new Error(responseData.error || "Failed to delete souvenir data");
      }
    } catch (error: any) {
      console.error("[Souvenirs] Error deleting souvenir:", error?.message || error);
      alert(error?.message || "Failed to delete souvenir data");
    } finally {
      setConfirmOpen(false);
    }
  };

  // Handle souvenir assignment
  const handleAssignSouvenir = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsAssignmentModalOpen(true);
  };

  // Export guests to CSV
  const exportGuestsToCSV = () => {
    const headers = ['No', 'Guest Name', 'Category', 'Guest Info', 'Souvenir Count', 'Souvenir Recorded Date', 'Souvenir Recorded Time'];
    const rows = filteredGuests.map((g, idx) => [
      String(idx + 1),
      g.name || '',
      g.category || '',
      g.info || '',
      String(g.souvenirCount || 0),
      g.souvenirRecordedAt ? new Date(g.souvenirRecordedAt).toLocaleDateString('id-ID') : '-',
      g.souvenirRecordedAt ? new Date(g.souvenirRecordedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '"')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'guests-souvenirs-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle search modal actions
  const handleSearchModalClose = () => {
    setIsSearchModalOpen(false);
  };

  const handleSearchGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsAssignmentModalOpen(true);
    setIsSearchModalOpen(false);
  };

  // Add guest save
  const handleAddGuestSave = async (data: NonInvitedGuestData) => {
    try {
      // Use the new unified guests API for non-invited guests
      const response = await apiRequest(apiUrl(`/api/guests/non-invited`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          info: data.info,
          souvenir: data.souvenir,
          category: data.category // Include category field
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add non-invited guest');
      }

      const result = await response.json();
      showToast(`Berhasil menambahkan data Tamu: ${data.name}`, 'success');
      setIsAddGuestOpen(false);
    } catch (error) {
      console.error('Error adding non-invited guest:', error);
      showToast(`Gagal menambahkan data Tamu. ${error.message}`, 'error');
    }
  };

  // Get souvenir status
  const getSouvenirStatus = (guest: Guest) => {
    if (guest.souvenirCount && guest.souvenirCount > 0) {
      return {
        label: 'Diterima',
        type: 'success' as const,
        details: `${guest.souvenirCount} souvenirs`
      };
    }
    return {
      label: 'Belum Diterima',
      type: 'warning' as const,
      details: 'No souvenirs assigned'
    };
  };

  // Filter guests based on search and status - only show guests with souvenirs
  const filteredGuests = useMemo(() => {
    return allGuests.filter(guest => {
      // Only show guests who have received souvenirs (souvenirCount > 0)
      if (!guest.souvenirCount || guest.souvenirCount === 0) {
        return false;
      }

      const matchesSearch = searchTerm === '' ||
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm) ||
        guest.invitationCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || guest.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allGuests, searchTerm, selectedCategory]);// pagination

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10/25/50/100

  // derived untuk pagination
  const totalItems = filteredGuests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageRows = filteredGuests.slice(pageStart, pageStart + pageSize);

  // jaga page tetap valid saat filter/data berubah
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset ke page 1 saat keyword berubah
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(guests.map(guest => guest.category)));
    return ['All', ...cats];
  }, [guests]);

  // Get statistics - only count guests with souvenirs
  const stats = useMemo(() => {
    const guestsWithSouvenirs = guests.filter(g => g.souvenirCount && g.souvenirCount > 0);
    const total = guestsWithSouvenirs.length;
    const totalSouvenirs = guestsWithSouvenirs.reduce((sum, g) => sum + (g.souvenirCount || 0), 0);

    return { total, totalSouvenirs };
  }, [guests]);

  if (loading && guests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/70">Loading guests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button
          onClick={refresh}
          className="bg-danger text-background px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="space-y-4 md:space-y-6">
          {/* Top Actions bar */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-3 md:p-5 rounded-b-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-3 md:gap-4">
                <button onClick={() => setIsQRScannerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background text-sm font-medium border border-border px-4 py-3 transition min-h-[48px] hover:opacity-90 active:scale-95" >
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <img src={QRimg} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </span>
                  <span className="font-medium text-sm">Scan QR</span>
                </button>
                <button onClick={() => setIsSearchModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background text-sm font-medium border border-border px-3 py-2 md:px-5 md:py-3 transition min-h-[44px]" >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <img src={Welcome} className="w-3 h-3 md:w-4 md:h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </span>
                  <span className="font-medium text-sm md:text-base">Cari Tamu</span>
                </button>
                <button onClick={() => setIsAddGuestOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary border border-border px-3 py-2 md:px-5 md:py-3 bg-primary text-background text-sm font-medium transition min-h-[44px]" >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <img src={Souvenir} className="w-3 h-3 md:w-4 md:h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </span>
                  <span className="font-medium text-sm md:text-base">Tambah Tamu</span>
                </button>
                <button onClick={exportGuestsToCSV} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary border border-border px-3 py-2 md:px-5 md:py-3 bg-primary text-background text-sm font-medium transition min-h-[44px]">
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <img src={Excel} className="w-3 h-3 md:w-4 md:h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </span>
                  <span className="font-medium text-sm md:text-base">Export Tamu</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setFilterOpen(true)} className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-xl bg-primary text-background border border-primary hover:bg-primary/90 transition-colors min-h-[44px] touch-manipulation"
                    aria-label="Filter options" >
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <TableFilterPopover open={filterOpen} onClose={() => setFilterOpen(false)} options={[
                    { key: 'no', label: 'No', checked: visibleCols.no },
                    { key: 'name', label: 'Nama', checked: visibleCols.name },
                    { key: 'kategori', label: 'Kategori', checked: visibleCols.kategori },
                    { key: 'informasi', label: 'Informasi', checked: visibleCols.informasi },
                    { key: 'souvenir', label: 'Jumlah Souvenir', checked: visibleCols.souvenir },
                    {
                      key: 'tanggal', label: 'Tangggal', checked: visibleCols.tanggal
                    },
                    { key: 'waktu', label: 'Waktu', checked: visibleCols.waktu },
                    { key: 'status', label: 'Status', checked: visibleCols.status },
                    { key: 'edit', label: 'Edit', checked: visibleCols.edit },
                  ]}
                    onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))} onToggleAll={(checked) => {
                      const allKeys = ['no', 'name',
                        'kategori', 'informasi', 'souvenir', 'tanggal', 'waktu', 'status', 'edit']; const newState = allKeys.reduce((acc, key) => ({ ...acc, [key]: checked }), {}); setVisibleCols(newState);
                    }} />
                </div>
              </div>
            </div>
          </div>

          {/* Guest Table - Mobile Optimized */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm px-4 sm:px-6 lg:px-8 py-6  rounded-t-none" style={{ marginTop: '0px' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-sm mb-6">
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
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text/50" />
                  <input placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    {visibleCols.no && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">No</th>}
                    {visibleCols.name && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider sticky left-0 bg-accent">Nama</th>}
                    {visibleCols.kategori && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Kategori</th>}
                    {visibleCols.informasi && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Informasi</th>}
                    {visibleCols.souvenir && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Jumlah Souvenir</th>}
                    {visibleCols.tanggal && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Tanggal</th>}
                    {visibleCols.waktu && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">waktu</th>}
                    {visibleCols.status && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Status</th>}
                    {visibleCols.edit && <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Edit</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border">
                  {pageRows.map((guest, index) => {
                    const souvenirStatus = getSouvenirStatus(guest); return (
                      <tr key={guest._id} className="hover:bg-accent">
                        {visibleCols.no && <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text/70">
                          {(page - 1) * pageSize + index + 1}
                        </td>}
                        {visibleCols.name && <td className="px-4 lg:px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 hover:bg-accent">
                          <div>
                            <div className="text-sm font-medium text-text">{guest.name}</div>
                          </div>
                        </td>}
                        {visibleCols.kategori && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                            {guest.category}
                          </span>
                        </td>}
                        {visibleCols.informasi && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80 max-w-xs truncate">
                            {guest.info ? (
                              <button type="button" onClick={() => { setSelectedInfo(guest.info as string); setInfoOpen(true); }} title={guest.info} className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs shadow-sm max-w-[9rem] truncate"
                              > {guest.info.length > 6 ? guest.info.slice(0, 6) + '…' : guest.info}
                              </button>
                            ) : '-'}
                          </div>
                        </td>}
                        {visibleCols.souvenir && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-text">
                            {guest.souvenirCount || 0}
                          </span>
                        </td>}
                        {visibleCols.tanggal && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleDateString('id-ID') : '-'}
                          </div>
                        </td>}
                        {visibleCols.waktu && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </div>
                        </td>}
                        {visibleCols.status && <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              checked={guest.souvenirCount > 0}
                              disabled={true}
                              className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
                            />
                            <span className='text-xs text-gray-600 font-medium'>{guest.souvenirCount > 0 ? 'Diterima' : 'Belum Menerima'}</span>
                          </div>
                        </td>}
                        {visibleCols.edit && <td className="py-4 text-sm text-center whitespace-nowrap ">
                          <div className="flex items-center justify-start gap-3">
                            <button
                              onClick={() => handleAssignSouvenir(guest)}
                              className="inline-flex items-center justify-center p-2 rounded-md bg-yellow-500 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                              title="Edit"
                            >
                              <img
                                src={edit}
                                className="h-4 w-4"
                                style={{ filter: 'brightness(0) saturate(100%) invert(1)' }}
                              />
                            </button>

                            <button
                              onClick={() => handleDeleteSouvenir(guest._id)}
                              className="inline-flex items-center justify-center p-2 rounded-md bg-red-500 hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger transition-colors"
                              title="Delete"
                            >
                              <img
                                src={Delete}
                                className="h-4 w-4"
                                style={{ filter: 'brightness(0) saturate(100%) invert(1)' }}
                              />
                            </button>
                          </div>
                        </td>}
                      </tr>
                    );
                  })}
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

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {filteredGuests.map((guest, index) => {
                const souvenirStatus = getSouvenirStatus(guest); return (
                  <div key={guest._id} className="p-4 hover:bg-accent transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text/70">#{index + 1}</span>
                          <h3 className="text-sm font-medium text-text">{guest.name}</h3>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                          {guest.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-text/60 block mb-1">Guest Info</span>
                          <span className="text-text">{guest.info || '-'}</span>
                        </div>
                        <div>
                          <span className="text-text/60 block mb-1">Souvenir Count</span>
                          <span className="text-text font-medium">{guest.souvenirCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-text/60 block mb-1">Souvenir Recorded Date</span>
                          <span className="text-text">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text/60 block mb-1">Souvenir Recorded Time</span>
                          <span className="text-text">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-text/60 block mb-1">Status</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${souvenirStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-warning/20 text-warning'}`}>
                            {souvenirStatus.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => handleAssignSouvenir(guest)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-background bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2
                                      focus:ring-primary transition-colors" >
                          <Edit3 className="h-3 w-3 mr-1" />
                        </button>
                        <button onClick={() => {/* Edit functionality */ }} className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-text bg-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                      transition-colors" > Edit
                        </button>
                        <button onClick={() => handleDeleteSouvenir(guest._id)} className="inline-flex items-center px-3 py-1.5 border border-danger text-xs font-medium rounded-md text-danger bg-white hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-offset-2
                                      focus:ring-danger transition-colors" >
                          <Trash2 className="h-3 w-3 mr-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGuests.length === 0 && (
              <div className="text-center py-8 md:py-12 px-4">
                <Edit3 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-text/40" />
                <h3 className="mt-2 text-sm font-medium text-text">No guests with souvenirs found</h3>
                <p className="mt-1 text-xs md:text-sm text-text/60">
                  {searchTerm || selectedCategory !== 'All' ? 'Try adjusting your search or filter criteria.' : 'No guests have received souvenirs yet.'}
                </p>
              </div>
            )}
          </div>

          {selectedGuest && (
            <SouvenirAssignmentModal isOpen={isAssignmentModalOpen} onClose={() => { setIsAssignmentModalOpen(false); setSelectedGuest(null); }} guest={selectedGuest} onAssign={handleAssignmentComplete} />)} {isAddGuestOpen && (
              <NonInvitedSouvenirAssignmentModal isOpen={isAddGuestOpen} onClose={() => setIsAddGuestOpen(false)} onSubmit={handleAddGuestSave} />)}
          {/* Search Modal - Similar to Check-in modal */}
          <CheckInModal open={isSearchModalOpen} onClose={handleSearchModalClose} guests={allGuests.map(g => ({ id: g._id, name: g.name, code: g.invitationCode, extra: g.info }))} onPickRegisteredGuest={(registeredGuest) => { const guest = allGuests.find(g => g._id === registeredGuest.id); if (guest) { handleSearchGuest(guest); } }} mode="search" context="souvenir"
          />
          <ConfirmModal open={confirmOpen} title="Hapus Souvenir" message="Apakah kamu yakin ingin menghapus data souvenir untuk tamu ini?" onConfirm={confirmDeleteSouvenir} onCancel={() => setConfirmOpen(false)} loading={loading} />
          <NoticeModal open={infoOpen} onClose={() => { setInfoOpen(false); setSelectedInfo(null); }} title="Information" confirmLabel="Close" >
            <div className="text-sm whitespace-pre-line">{selectedInfo}</div>
          </NoticeModal>
          {/* QR Scanner Modal - now includes all guests */}
          <CheckInModal
            open={isQRScannerOpen}
            onClose={() => setIsQRScannerOpen(false)}
            guests={allGuests.map(g => ({ id: g._id, name: g.name, code: g.invitationCode }))}
            onQRCodeScanned={handleQRCodeScanned}
            mode="scan"
            context="souvenir"
          />

        </div>
      </div>
      {/* Bottom Navigation */}
      <div className="mt-auto pt-6">
        <BottomBar variant="inline" active="souvenir" onSelect={(key) => { switch (key) { case 'home': navigate('/dashboard'); break; case 'checkin': navigate('/reception'); break; case 'gift': navigate('/gifts'); break; case 'doorprize': navigate('/doorprize'); break; } }} />
      </div>
    </div>
  );
};