/**
 * Gifts Page - Gift and Angpao Distribution Management
 * Now uses unified guests collection for all gift assignments
 * Works with both invited and non-invited guests
 * Uses Lavender Wedding design tokens via Tailwind.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Gift, DollarSign, UserPlus, Filter, FileSpreadsheet, QrCode, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
import GiftAssignmentModal from '../components/gifts/GiftAssignmentModal';
import { Guest, GiftType } from '../../shared/types';
import { BottomBar } from '../components/navigation/BottomBar';
import { useNavigate } from 'react-router-dom';
import { CheckInModal } from '../components/checkin/CheckInModal';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';

export const Gifts: React.FC = () => {
  const { apiRequest, token } = useAuth();
  const { guests, allGuests, loading, error, refresh } = useGuests();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGiftStatus, setSelectedGiftStatus] = useState('All');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
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

  // Handle gift assignment completion
  const handleAssignmentComplete = async (guestId: string, giftType: GiftType, count: number) => {
    try {
      console.log(`[Gifts] Gift assignment completed for guest ${guestId}: ${count} ${giftType}`);
      
      // Refresh guests list to ensure consistency
      await refresh();
    } catch (error: any) {
      console.error('[Gifts] Error refreshing gift data:', error?.message || error);
      throw error;
    }
  };

  // Handle gift assignment
  const handleAssignGift = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsAssignmentModalOpen(true);
  };

  // Filter guests to only show those with gift data
  const filteredGuests = useMemo(() => {
    return allGuests.filter(guest => {
      // Only show guests who have gift data (giftType and giftCount > 0)
      const hasGiftData = !!(guest.giftType && guest.giftCount && guest.giftCount > 0);
      if (!hasGiftData) return false;
      
      const matchesSearch = searchTerm === '' || 
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm) ||
        guest.invitationCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || guest.category === selectedCategory;
      
      // Gift status filtering - check if guest has gifts assigned
      let matchesGiftStatus = selectedGiftStatus === 'All';
      
      if (selectedGiftStatus === 'Received') {
        matchesGiftStatus = !!(guest.giftType && guest.giftCount && guest.giftCount > 0);
      } else if (selectedGiftStatus === 'Pending') {
        matchesGiftStatus = !(guest.giftType && guest.giftCount && guest.giftCount > 0);
      }
      
      return matchesSearch && matchesCategory && matchesGiftStatus;
    });
  }, [allGuests, searchTerm, selectedCategory, selectedGiftStatus]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(allGuests.map(guest => guest.category)));
    return ['All', ...cats];
  }, [allGuests]);

  // Export guests to CSV - only exports guests with gift data
  const exportGuestsToCSV = () => {
    const headers = ['No', 'Name', 'Phone', 'Code', 'Category', 'Gift Type', 'Gift Count', 'Gift Note', 'Gift Received Date', 'Guest Type'];
    
    const csvData = filteredGuests.map((guest, index) => [
      String(index + 1),
      guest.name || '',
      guest.phone || '',
      guest.invitationCode || '',
      guest.category || '',
      guest.giftType || '',
      String(guest.giftCount || 0),
      guest.giftNote || '',
      guest.updatedAt ? new Date(guest.updatedAt).toLocaleDateString() : '-',
      guest.isInvited === false ? 'Non-Invited' : 'Invited'
    ]);
    
    const csv = [headers, ...csvData].map(r => r.map(v => `"${String(v).replace(/"/g, '"')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gift-givers-export.csv';
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

  // Handle QR code scanning
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

  if (loading && guests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/70 text-sm">Loading gift data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center mx-4">
        <p className="text-danger mb-4 text-sm">{error}</p>
        <button 
          onClick={refresh}
          className="bg-danger text-background px-6 py-3 rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-accent/20">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Top Actions bar */}
              <div className="bg-white rounded-xl border border-border shadow-sm p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button onClick={()=> setIsQRScannerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background text-sm font-medium border border-border px-4 py-3 transition min-h-[48px] hover:opacity-90 active:scale-95" >
                              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </span>
                              <span className="font-medium text-sm">Scan QR</span>
                          </button>
                          <button onClick={()=> setIsSearchModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background text-sm font-medium border border-border px-4 py-3 transition min-h-[48px] hover:opacity-90 active:scale-95" >
                              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </span>
                              <span className="font-medium text-sm">Search Guest</span>
                          </button>
                          <button onClick={exportGuestsToCSV} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary border border-border px-4 py-3 bg-primary text-background text-sm font-medium transition min-h-[48px] hover:opacity-90 active:scale-95">
                              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                              <span className="font-medium text-sm">Export</span>
                          </button>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="relative">
                              <button onClick={()=> setFilterOpen(true)} className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-primary text-background border border-primary hover:bg-primary/90 transition-colors min-h-[48px] touch-manipulation"
                                  aria-label="Filter options" >
                                  <Filter className="w-5 h-5" />
                              </button>
                              <TableFilterPopover open={filterOpen} onClose={()=> setFilterOpen(false)} options={[ { key: 'no', label: 'No' }, { key: 'name', label: 'Nama' }, { key: 'phone', label: 'WhatsApp' }, { key: 'status', label: 'Status' }, { key: 'terjadwal', label: 'Terjadwal' }, { key: 'reminder',
                                  label: 'Set Reminder' }, { key: 'share', label: 'Bagikan' }, ]} visible={visibleCols} onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))} onToggleAll={(checked) => { const allKeys = ['no', 'name',
                                  'phone', 'status', 'terjadwal', 'reminder', 'share']; const newState = allKeys.reduce((acc, key) => ({ ...acc, [key]: checked }), {}); setVisibleCols(newState); }} />
                          </div>
                      </div>
                  </div>
              </div>

              {/* Guest Table - Mobile Optimized */}
              <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="text-sm text-text/70 order-2 sm:order-1">
                            Show [ {filteredGuests.length} ] entries
                        </div>
                        <div className="w-full sm:w-auto order-1 sm:order-2">
                            <div className="relative w-full sm:w-80">
                                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text/50" />
                                <input 
                                  placeholder="Search by name, phone, or code..." 
                                  value={searchTerm} 
                                  onChange={(e)=> setSearchTerm(e.target.value)} 
                                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>
                        </div>
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                          <thead className="bg-accent">
                              <tr>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">No</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Guest Name</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Guest Code</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Guest Category</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Guest Info</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Gift Type</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Gift Count</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Gift Note</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Gift Received Date</th>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-border">
                              {/* Guest gift givers */}
                              {filteredGuests.map((guest, index) => (
                              <tr key={guest._id} className="hover:bg-accent">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-text">{index + 1}</td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                      <div>
                                          <div className="text-sm font-medium text-text">{guest.name}</div>
                                          <div className="text-sm text-text/60">{guest.phone}</div>
                                      </div>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text">{guest.invitationCode}</td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                              {guest.category}
                            </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text">{guest.info || '-'}</td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text">{guest.giftType || '-'}</td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text">{guest.giftCount || 0}</td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text max-w-xs truncate">
                                      {guest.giftNote || '-'}
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-text">
                                      {guest.updatedAt ? new Date(guest.updatedAt).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                      <div className="flex gap-2">
                                          <button onClick={()=> handleAssignGift(guest)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-background bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2
                                              focus:ring-primary transition-colors active:scale-95" >
                                              <Gift className="h-4 w-4 mr-2" /> Edit
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                      {/* Guest gift givers */}
                      {filteredGuests.map((guest, index) => (
                      <div key={guest._id} className="bg-white border border-border rounded-xl p-4 hover:shadow-md transition-all">
                          <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-medium text-text/60 bg-accent px-2 py-1 rounded-full">#{index + 1}</span>
                                      <h3 className="text-sm font-semibold text-text truncate">{guest.name}</h3>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-primary">
                                      {guest.category}
                                  </span>
                              </div>
                              
                              {/* Contact Info */}
                              <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-text/70">
                                      <span className="font-medium">Code:</span>
                                      <span className="font-mono">{guest.invitationCode}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-text/70">
                                      <span className="font-medium">Phone:</span>
                                      <span>{guest.phone}</span>
                                  </div>
                                  {guest.info && (
                                      <div className="flex items-center gap-2 text-xs text-text/70">
                                          <span className="font-medium">Info:</span>
                                          <span className="truncate">{guest.info}</span>
                                      </div>
                                  )}
                              </div>
                              
                              {/* Gift Info */}
                              <div className="grid grid-cols-2 gap-3 bg-accent/30 rounded-lg p-3">
                                  <div className="text-center">
                                      <div className="text-xs text-text/60 mb-1">Gift Type</div>
                                      <div className="text-sm font-semibold text-text">{guest.giftType || '-'}</div>
                                  </div>
                                  <div className="text-center">
                                      <div className="text-xs text-text/60 mb-1">Gift Count</div>
                                      <div className="text-sm font-semibold text-text">{guest.giftCount || 0}</div>
                                  </div>
                              </div>
                              
                              {/* Additional Info */}
                              {guest.giftNote && (
                                  <div className="bg-primary/5 rounded-lg p-3">
                                      <div className="text-xs text-text/60 mb-1">Note</div>
                                      <div className="text-sm text-text">{guest.giftNote}</div>
                                  </div>
                              )}
                              
                              {guest.updatedAt && (
                                  <div className="text-xs text-text/60 text-center">
                                      Last updated: {new Date(guest.updatedAt).toLocaleDateString()}
                                  </div>
                              )}
                              
                              {/* Action Button */}
                              <div className="pt-2">
                                  <button onClick={()=> handleAssignGift(guest)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-background bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2
                                      focus:ring-primary transition-colors active:scale-95" >
                                      <Gift className="h-4 w-4" /> Edit Gift
                                  </button>
                              </div>
                          </div>
                      </div>
                      ))}
                  </div>

                  {filteredGuests.length === 0 && (
                  <div className="text-center py-8 md:py-12 px-4">
                      <div className="bg-accent/30 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Gift className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-text mb-2">No gift givers found</h3>
                      <p className="text-sm text-text/60 max-w-md mx-auto">
                          {searchTerm || selectedCategory !== 'All' || selectedGiftStatus !== 'All' ? 'Try adjusting your search or filter criteria to find gift givers.' : 'No guests have received gifts yet. Gift records will appear here when guests receive gifts.'}
                      </p>
                  </div>
                  )}
              </div>

              {/* Modals */} {selectedGuest && (
              <GiftAssignmentModal isOpen={isAssignmentModalOpen} onClose={()=> { setIsAssignmentModalOpen(false); setSelectedGuest(null); }} guest={selectedGuest} onAssign={handleAssignmentComplete} /> )} 
              
              {/* Search Modal - Direct to CARI TAMU TERDAFTAR - now includes all guests */}
              <CheckInModal open={isSearchModalOpen} onClose={handleSearchModalClose} guests={allGuests.map(g=> ({ id: g._id, name: g.name, code: g.invitationCode, extra: g.info }))} onPickRegisteredGuest={(registeredGuest) => { const guest = allGuests.find(g => g._id === registeredGuest.id); if (guest) { handleSearchGuest(guest); } }} mode="search"  context="gift"
                  /> 
              {/* QR Scanner Modal - now includes all guests */}
              <CheckInModal 
                open={isQRScannerOpen} 
                onClose={() => setIsQRScannerOpen(false)} 
                guests={allGuests.map(g => ({ id: g._id, name: g.name, code: g.invitationCode }))}
                onQRCodeScanned={handleQRCodeScanned}
                mode="scan"
                context="gift"
              />
              
              {/* Bottom Navigation - Fixed at bottom without floating */}              
              <div className="mt-auto pt-6">
                              <BottomBar variant="inline" active="gift" onSelect={(key)=> { switch (key) { case 'home': navigate('/dashboard'); break; case 'checkin': navigate('/reception'); break; case 'souvenir': navigate('/souvenirs'); break; case 'doorprize': navigate('/doorprize'); break; } }} />
                          </div>
          </div>
      </div>
    </div>   
  );
};