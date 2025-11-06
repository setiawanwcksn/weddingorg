/**
 * Souvenirs Page - Souvenir Distribution Management
 * Integrates with consolidated guest data for souvenir tracking
 */

import React, { useState, useMemo, useRef } from 'react';
import { Search, Edit3, Trash2, UserPlus, Filter, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
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

export const Souvenirs: React.FC = () => {
  const { apiRequest, token } = useAuth();
  const { guests, allGuests, loading, error, refresh } = useGuests();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSouvenirStatus, setSelectedSouvenirStatus] = useState('All');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [visibleCols, setVisibleCols] = React.useState<Record<string, boolean>>({
    no: true,
    name: true,
    code: true,
    category: true,
    info: true,
    sesi: true,
    limit: true,
    tableNo: true,
    count: true,
    date: true,
    time: true,
    edit: true,
  });

  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // Handle souvenir assignment completion
  const handleAssignmentComplete = async (guestId: string, count: number) => {
    try {
      const response = await apiRequest(apiUrl(`/api/guests/${guestId}/souvenirs`), {
        method: 'POST',
        body: JSON.stringify({ count })
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
  const handleAddGuestSave = async (data: AddGuestFormData) => {
    try {
      const response = await apiRequest(apiUrl(`/api/guests`), {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          info: data.info,
          phone: data.phone,
          session: data.session,
          limit: data.limit,
          tableNo: data.tableNo,
          category: data.category,
          guestCount: data.guestCount || 1
        })
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Failed to add guest');
      setIsAddGuestOpen(false);
      await refresh();
    } catch (error: any) {
      console.error('[Souvenirs] Add guest error:', error?.message || error);
      alert(error?.message || 'Failed to add guest');
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
  }, [allGuests, searchTerm, selectedCategory]);

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
                <button onClick={() => setIsSearchModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background text-sm font-medium border border-border px-3 py-2 md:px-5 md:py-3 transition min-h-[44px]" >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Search className="w-3 h-3 md:w-4 md:h-4" />
                  </span>
                  <span className="font-medium text-sm md:text-base">Cari Tamu</span>
                </button>
                <button onClick={() => setIsAddGuestOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary border border-border px-3 py-2 md:px-5 md:py-3 bg-primary text-background text-sm font-medium transition min-h-[44px]" >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                  </span>
                  <span className="font-medium text-sm md:text-base">Tambah Tamu</span>
                </button>
                <button onClick={exportGuestsToCSV} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary border border-border px-3 py-2 md:px-5 md:py-3 bg-primary text-background text-sm font-medium transition min-h-[44px]">
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4" />
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
                  <TableFilterPopover open={filterOpen} onClose={() => setFilterOpen(false)} options={[{ key: 'no', label: 'No' }, { key: 'name', label: 'Nama' }, { key: 'phone', label: 'WhatsApp' }, { key: 'status', label: 'Status' }, { key: 'terjadwal', label: 'Terjadwal' }, {
                    key: 'reminder',
                    label: 'Set Reminder'
                  }, { key: 'share', label: 'Bagikan' },]} visible={visibleCols} onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))} onToggleAll={(checked) => {
                    const allKeys = ['no', 'name',
                      'phone', 'status', 'terjadwal', 'reminder', 'share']; const newState = allKeys.reduce((acc, key) => ({ ...acc, [key]: checked }), {}); setVisibleCols(newState);
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Guest Table - Mobile Optimized */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm px-4 sm:px-6 lg:px-8 py-6  rounded-t-none" style={{ marginTop: '0px' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-sm mb-6">
              <div className="text-sm text-text/70">
                Show [ {filteredGuests.length} ] entries
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
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">No</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider sticky left-0 bg-accent">Nama</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Kategori</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Informasi</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Jumlah Souvenir</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Jam</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Edit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border">
                  {filteredGuests.map((guest, index) => {
                    const souvenirStatus = getSouvenirStatus(guest); return (
                      <tr key={guest._id} className="hover:bg-accent">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text/70">
                          {index + 1}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 hover:bg-accent">
                          <div>
                            <div className="text-sm font-medium text-text">{guest.name}</div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                            {guest.category}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80 max-w-xs truncate">
                            {guest.info ? (
                              <button type="button" onClick={() => { setSelectedInfo(guest.info as string); setInfoOpen(true); }} title={guest.info} className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs shadow-sm max-w-[9rem] truncate"
                              > {guest.info.length > 6 ? guest.info.slice(0, 6) + '…' : guest.info}
                              </button>
                            ) : '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-text">
                            {guest.souvenirCount || 0}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleDateString('id-ID') : '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text/80">
                            {guest.souvenirRecordedAt ? new Date(guest.souvenirRecordedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleAssignSouvenir(guest)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-background bg-yellow-500 hover:opacity-90 focus:outline-none focus:ring-2
                                              focus:ring-offset-2 focus:ring-primary transition-colors" >
                              <Edit3 className="h-3 w-3 mr-1" />
                            </button>
                            <button onClick={() => handleDeleteSouvenir(guest._id)} className="inline-flex items-center px-3 py-1.5 border border-danger text-xs font-medium rounded-md text-danger bg-red-500 hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-offset-2
                                              focus:ring-danger transition-colors" >
                              <Trash2 className="h-3 w-3 mr-1" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

          {/* Modals */} {selectedGuest && (
            <SouvenirAssignmentModal isOpen={isAssignmentModalOpen} onClose={() => { setIsAssignmentModalOpen(false); setSelectedGuest(null); }} guest={selectedGuest} onAssign={handleAssignmentComplete} />)} {isAddGuestOpen && (
              <AddGuestModal open={isAddGuestOpen} onClose={() => setIsAddGuestOpen(false)} onSave={handleAddGuestSave} />)} {/* Search Modal - Similar to Check-in modal */}
          <CheckInModal open={isSearchModalOpen} onClose={handleSearchModalClose} guests={allGuests.map(g => ({ id: g._id, name: g.name, code: g.invitationCode, extra: g.info }))} onPickRegisteredGuest={(registeredGuest) => { const guest = allGuests.find(g => g._id === registeredGuest.id); if (guest) { handleSearchGuest(guest); } }} mode="search" context="souvenir"
          />
          <ConfirmModal open={confirmOpen} title="Hapus Souvenir" message="Apakah kamu yakin ingin menghapus data souvenir untuk tamu ini?" onConfirm={confirmDeleteSouvenir} onCancel={() => setConfirmOpen(false)} loading={loading} />
          <NoticeModal open={infoOpen} onClose={() => { setInfoOpen(false); setSelectedInfo(null); }} title="Information" confirmLabel="Close" >
            <div className="text-sm whitespace-pre-line">{selectedInfo}</div>
          </NoticeModal>

        </div>
      </div>
      {/* Bottom Navigation */}
      <div className="mt-auto pt-6">
        <BottomBar variant="inline" active="souvenir" onSelect={(key) => { switch (key) { case 'home': navigate('/dashboard'); break; case 'checkin': navigate('/reception'); break; case 'gift': navigate('/gifts'); break; case 'doorprize': navigate('/doorprize'); break; } }} />
      </div>
    </div>
  );
};