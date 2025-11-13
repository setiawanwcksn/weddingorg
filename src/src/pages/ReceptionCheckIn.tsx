import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { BottomBar } from '../components/navigation/BottomBar';
import { useGuests } from '../contexts/GuestsContext';
import { LayoutGrid, Filter, Search, Eye, Edit3, Trash2, Bug } from 'lucide-react';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';
import { CheckInModal, RegisteredGuest } from '../components/checkin/CheckInModal';
import { GuestDetailModal } from '../components/checkin/GuestDetailModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { QRTestUtility } from '../components/checkin/QRTestUtility';
import NonInvitedGuestCheckInModal from '../components/checkin/NonInvitedGuestCheckInModal';
import { NonInvitedGuestData } from '../components/checkin/NonInvitedGuestCheckInModal';
import { apiUrl } from '../lib/api';
import { usePhoto } from "../contexts/PhotoProvider";
import ExportTamu from '../assets/xls-file.png';
import Welcome from '../assets/Welcome.png';
import StatsIMG from '../assets/stats.png';
import filter from '../assets/filter.png';
import edit from '../assets/Edit.png';
import Delete from '../assets/Delete.png';

interface DashboardAccountInfo {
  id: string;
  name: string;
  title: string;
  dateTime: Date;
  location: string;
}

const DEFAULT_PHOTO = ' "https://images.unsplash.com/photo-1517244683847-7456b63c5969?q=80&w=1600&auto=format&fit=crop"';

export function ReceptionCheckIn(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { apiRequest, user } = useAuth();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [checkInOpen, setCheckInOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedGuest, setSelectedGuest] = React.useState<RegisteredGuest | null>(null);
  const [pickedAt, setPickedAt] = React.useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showQRTest, setShowQRTest] = React.useState(false);
  const [nonInvitedGuestModalOpen, setNonInvitedGuestModalOpen] = React.useState(false);
  const { photoUrl, dashboardUrl, welcomeUrl } = usePhoto();
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

  // Fetch all guests (both invited and non-invited) for reception table
  const { data: allGuests, error: guestsError, isLoading: guestsLoading, mutate: mutateGuests } = useSWR(
    user ? apiUrl(`/api/guests`) : null,
    async (url: string) => {
      const res = await apiRequest(url);
      if (!res.ok) throw new Error('Failed to fetch guests');
      const json = await res.json();
      return json?.data || [];
    },
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Tambahkan di atas return, sebelum `if (guestsLoading)`
  const [account, setAccount] = useState<DashboardAccountInfo | null>(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await apiRequest(apiUrl(`/api/auth/accounts/${user.accountId}`));
        if (!res.ok) throw new Error('Failed to fetch account');
        const json = await res.json();
        if (json.success && json.data?.account) {
          const a = json.data.account;
          setAccount({
            id: a.id,
            name: a.name,
            title: a.title ?? a.name,
            dateTime: a.dateTime ? new Date(a.dateTime) : new Date(),
            location: a.location ?? '',
          });
        }
      } catch (err) {
        console.error('Error fetching account:', err);
      }
    };
    fetchAccount();
  }, []);


  // Use global guests data for invited guests only
  const { guests: invitedGuests, stats, refresh, loading: invitedLoading, error: invitedError } = useGuests();

  // Update stats to include non-invited guests
  const updatedStats = React.useMemo(() => ({
    ...stats,
    nonInvited: allGuests?.filter(g => g.isInvited === false).length || 0
  }), [stats, allGuests]);
  // Camera state removed - camera functionality moved to CheckInModal only

  // Handle non-invited guest check-in
  const handleNonInvitedGuestCheckIn = async (data: NonInvitedGuestData) => {
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
          guestCount: data.guestCount,
          category: data.category // Include category field
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add non-invited guest');
      }

      const result = await response.json();
      showToast(`Berhasil check-in ${data.name}`, 'success');

      // Refresh guests data to include new non-invited guest
      await mutateGuests();
    } catch (error) {
      console.error('Error adding non-invited guest:', error);
      showToast(`Gagal check-in. ${error.message}`, 'error');
    }
  };

  // Filter and format guests data - only show checked-in guests
  const filteredGuests = React.useMemo(() => {
    if (!allGuests || allGuests.length === 0) return [];

    return allGuests.filter((guest: any) => {
      // Only show guests who have checked in
      if (!guest.checkInDate) return false;

      // Apply search filter if search term exists
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        guest.name?.toLowerCase().includes(searchLower) ||
        guest.code?.toLowerCase().includes(searchLower) ||
        guest.phone?.toLowerCase().includes(searchLower) ||
        guest.invitationCode?.toLowerCase().includes(searchLower)
      );
    });
  }, [allGuests, searchTerm]);

  // Format guests for table display (including non-invited guests)
  const rows = React.useMemo(() => {
    return filteredGuests.map((guest: any, index: number) => ({
      id: guest._id,
      no: String(index + 1).padStart(2, '0'),
      name: guest.name,
      code: guest.code || guest.invitationCode || `GUEST-${String(index + 1).padStart(6, '0')}`,
      category: guest.category || 'Regular',
      info: guest.info || '-',
      sesi: guest.session || '-',
      limit: guest.limit || 2,
      tableNo: guest.tableNo || '-',
      count: guest.guestCount || 1,
      date: guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString('id-ID') : '-',
      time: guest.checkInDate ? new Date(guest.checkInDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      checkedIn: !!guest.checkInDate,
      checkedInAt: guest.checkInDate,
      isNonInvited: guest.isInvited === false
    }));
  }, [filteredGuests]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset ke page 1 saat keyword berubah
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Calculate gift and souvenir stats from checked-in guests only
  const giftStats = React.useMemo(() => {
    const checkedInGuests = allGuests?.filter((g: any) => !!g.checkInDate) || [];
    const totalSouvenirs = checkedInGuests.reduce((sum: number, g: any) => sum + (g.souvenirCount || 0), 0);
    const angpaoCount = checkedInGuests.reduce((sum: number, g: any) => sum + (g.angpaoCount || 0), 0);
    const kadoCount = checkedInGuests.reduce((sum: number, g: any) => sum + (g.kadoCount || 0), 0);

    return {
      totalSouvenirs,
      angpaoCount,
      kadoCount
    };
  }, [allGuests]);

  // Calculate stats based on ALL guests (not just checked-in)
  const allGuestStats = React.useMemo(() => {
    const allGuestList = allGuests || [];
    const regularCount = allGuestList.filter((g: any) => g.category === 'Regular').length;
    const vipCount = allGuestList.filter((g: any) => g.category === 'VIP').length;
    const nonInvitedCount = allGuestList.filter((g: any) => g.isInvited === false).length;
    const checkedInCount = allGuestList.filter((g: any) => !!g.checkInDate).length;
    const totalWithPlusOne = allGuestList.reduce((sum: number, g: any) => {
      const guestCount = g.guestCount || 1;
      return sum + guestCount;
    }, 0);

    return {
      total: allGuestList.length,
      checkedIn: checkedInCount,
      regular: regularCount,
      vip: vipCount,
      nonInvited: nonInvitedCount,
      totalWithPlusOne
    };
  }, [allGuests]);

  const statsLeft = [
    { label: 'Tamu Check-in', value: allGuestStats.checkedIn },
    { label: 'Tamu di Venue', value: allGuestStats.totalWithPlusOne },
    { label: 'Tamu Reguler', value: allGuestStats.regular },
    { label: 'Tamu VIP', value: allGuestStats.vip },
  ];
  const statsRight = [
    { label: 'Tamu Tambahan', value: allGuestStats.nonInvited },
    { label: 'Souvenir Dibagikan', value: giftStats.totalSouvenirs },
    { label: 'Kado Diterima', value: giftStats.kadoCount },
    { label: 'Angpao Diterima', value: giftStats.angpaoCount },
  ];

  const Badge = ({ children, tone = 'secondary' }: { children: React.ReactNode; tone?: 'secondary' | 'accent' | 'warning' | 'success' }) => {
    const bgClass =
      tone === 'secondary'
        ? 'bg-secondary text-text/80'
        : tone === 'accent'
          ? 'bg-accent text-text/80'
          : tone === 'warning'
            ? 'bg-warning/20 text-warning'
            : 'bg-success/20 text-success';
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${bgClass}`}>{children}</span>
    );
  };

  // Loading state - only show loading when explicitly loading, not when guests array is empty
  if (guestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/70">Loading guests...</p>
        </div>
      </div>
    );
  }

  // Error state - show error when there's an actual error, not when data is empty
  if (guestsError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-danger mb-4">Error loading guests</div>
          <div className="text-sm text-text/70 mb-4">{guestsError.message}</div>
          <button
            onClick={() => mutateGuests()}
            className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col">
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* Top grid: hero and statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Hero card */}
              <div className="relative rounded-xl overflow-hidden border border-border bg-background shadow-sm">
                <img
                  src={photoUrl}
                  alt="Wedding hero"
                  className="w-full h-40 sm:h-64 md:h-72 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-text/60 to-transparent"></div>
                <div className="absolute left-4 sm:left-5 bottom-4 sm:bottom-5 text-background">
                  <p className="text-xs font-medium">The Wedding Of</p>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold"> {account ? account.title : 'Loading...'}</h3>
                  <p className="text-xs opacity-90">{account ? account.location : 'Loading...'}</p>
                </div>
              </div>

              {/* Statistic card */}
              <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 bg-primary text-background px-3 sm:px-6 py-3 font-semibold">
                  <img src={StatsIMG} className="w-4 h-4 sm:w-5 sm:h-5" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  Statistik Tamu
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-6">
                  {[statsLeft, statsRight].map((group, i) => (
                    <ul key={i} className="space-y-1 sm:space-y-2">
                      {group.map((row) => (
                        <li key={row.label} className="flex items-center justify-between hover:bg-accent/30 p-1.5 sm:p-2 rounded-lg transition-colors">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary"></span>
                            <span className="text-xs sm:text-sm">{row.label}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-primary">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="rounded-xl border border-border p-3 sm:p-4 shadow-sm bg-white rounded-b-none">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-primary text-background text-sm font-medium border border-primary shadow-sm hover:bg-primary/90 hover:shadow-md transition-all min-h-[44px] touch-manipulation">
                    <img src={ExportTamu} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                    Export Tamu
                  </button>
                  <button
                    onClick={() => navigate('/welcome-display')}
                    className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-primary text-background text-sm font-medium border border-primary shadow-sm hover:bg-primary/90 hover:shadow-md transition-all min-h-[44px] touch-manipulation"
                  >
                    <img src={Welcome} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                    Welcome
                  </button>

                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setFilterOpen(true)}
                      className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-xl bg-primary text-background border border-primary hover:bg-primary/90 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Filter options"
                    >
                      <img src={filter} className="w-4 h-4 sm:w-5 sm:h-5" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                    </button>
                    <TableFilterPopover
                      open={filterOpen}
                      onClose={() => setFilterOpen(false)}
                      options={[
                        { key: 'no', label: 'No', checked: visibleCols.no },
                        { key: 'name', label: 'Nama', checked: visibleCols.name },
                        { key: 'code', label: 'Kode', checked: visibleCols.code },
                        { key: 'category', label: 'Kategori', checked: visibleCols.category },
                        { key: 'info', label: 'Informasi', checked: visibleCols.info },
                        { key: 'sesi', label: 'Sesi', checked: visibleCols.sesi },
                        { key: 'limit', label: 'Limit', checked: visibleCols.limit },
                        { key: 'tableNo', label: 'No. Meja', checked: visibleCols.tableNo },
                        { key: 'count', label: 'Jumlah Tamu', checked: visibleCols.count },
                        { key: 'date', label: 'Tanggal', checked: visibleCols.date },
                        { key: 'time', label: 'Waktu', checked: visibleCols.time },
                        { key: 'edit', label: 'Edit', checked: visibleCols.edit },
                      ]}
                      // visible={visibleCols}
                      onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                      onToggleAll={(checked) => {
                        const allKeys = ['no', 'name', 'code', 'category', 'info', 'sesi', 'limit', 'tableNo', 'count', 'date', 'time', 'edit'];
                        const newState = allKeys.reduce((acc, key) => ({ ...acc, [key]: checked }), {});
                        setVisibleCols(newState);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>



            {/* Table */}
            <div className="rounded-xl border border-border bg-background p-3 sm:p-4 rounded-t-none" style={{ marginTop: '0px' }} >
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
                    <input
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-accent text-text/70">
                      {visibleCols.no && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">No</th>}
                      {visibleCols.name && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Nama</th>}
                      {visibleCols.code && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Kode</th>}
                      {visibleCols.category && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">Kategori</th>}
                      {visibleCols.info && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">Informasi</th>}
                      {visibleCols.sesi && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">Sesi</th>}
                      {visibleCols.limit && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">Limit</th>}
                      {visibleCols.tableNo && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">No. Meja</th>}
                      {visibleCols.count && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Jumlah Tamu</th>}
                      {visibleCols.date && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Tanggal</th>}
                      {visibleCols.time && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Waktu</th>}
                      {visibleCols.edit && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Edit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((r, idx) => (
                      <tr key={r.id} >
                        {visibleCols.no && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{(page - 1) * pageSize + idx + 1}</td>}
                        {visibleCols.name && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.name}</td>}
                        {visibleCols.code && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-primary font-medium">{r.code}</td>}
                        {visibleCols.category && (
                          <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">
                            <Badge tone={r.category === 'VIP' ? 'secondary' : r.isNonInvited ? 'warning' : 'accent'}>{r.category}</Badge>
                          </td>
                        )}
                        {visibleCols.info && (
                          <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">
                            <Badge tone="warning">{r.info}</Badge>
                          </td>
                        )}
                        {visibleCols.sesi && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">{r.sesi}</td>}
                        {visibleCols.limit && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">{r.limit}</td>}
                        {visibleCols.tableNo && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">{r.tableNo}</td>}
                        {visibleCols.count && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.count}</td>}
                        {visibleCols.date && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">{r.date}</td>}
                        {visibleCols.time && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">{r.time}</td>}
                        {visibleCols.edit && (
                          <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md bg-secondary border border-border min-h-[36px] touch-manipulation bg-yellow-500 text-white"
                                aria-label="edit"
                                onClick={() => {
                                  setSelectedGuest({
                                    id: r.id,
                                    name: r.name,
                                    code: r.code,
                                    category: r.category,
                                    isInvited: r.isNonInvited ? false : true
                                  });
                                  setDetailOpen(true);
                                }}
                              ><img src={edit} className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                              <button
                                className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md border border-border min-h-[36px] touch-manipulation bg-red-500 text-white"
                                aria-label="clear check-in"
                                onClick={async () => {
                                  try {

                                    // Use unified guests API for all guest types
                                    const response = await apiRequest(apiUrl(`/api/guests/${r.id}/clear-checkin`), {
                                      method: 'POST'
                                    });

                                    const data = await response.json();

                                    if (!response.ok || !data.success) {
                                      throw new Error(data.error || 'Failed to clear guest check-in');
                                    }
                                    showToast(`Berhasil menghapus check-in data Tamu ${r.name}`, 'success');

                                    // Refresh the guests data to reflect the change
                                    console.log('Refreshing guests data after clearing check-in...');
                                    await mutateGuests();
                                    console.log('Guests data refreshed');
                                  } catch (error) {
                                    console.error('Error clearing guest check-in:', error);
                                    showToast(`Gagal menghapus check-in data. ${error.message}`, 'error');
                                  }
                                }}
                              ><img src={Delete} className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 text-white" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length === 0 && (
                <div className="text-center py-8 md:py-12 px-4">
                  <Eye className="mx-auto h-10 w-10 md:h-12 md:w-12 text-text/40" />
                  <h3 className="mt-2 text-sm font-medium text-text">No checked-in guests found</h3>
                  <p className="mt-1 text-xs md:text-sm text-text/60">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'No guests have checked in yet.'}
                  </p>
                </div>
              )}

              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
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

          {/* Check-in Modal */}
          <CheckInModal
            open={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            onSearch={() => {
              // analytics placeholder
            }}
            onAddGuest={() => {
              // Open regular guest modal
              // This will trigger the 'add' mode in CheckInModal
            }}
            onAddNonInvitedGuest={() => {
              // Open non-invited guest modal when guest search fails
              setNonInvitedGuestModalOpen(true);
            }}
            guests={allGuests?.map((g: any) => ({
              id: g._id,
              name: g.name,
              code: g.code || g.invitationCode,
              category: g.category || 'Regular',
              isInvited: g.isInvited !== false, // Set isInvited based on guest data
              checkInDate: g.checkInDate // Pass check-in status
            })) as RegisteredGuest[]}
            onPickRegisteredGuest={(g) => {
              setSelectedGuest(g);
              setPickedAt(new Date());
              setDetailOpen(true);
            }}
            onQRCodeScanned={(qrData) => {
              try {
                // QR code now contains only the guest name
                const guestName = qrData.trim();

                console.log('[ReceptionCheckIn] QR code data received:', qrData);
                console.log('[ReceptionCheckIn] Trimmed guest name:', guestName);
                console.log('[ReceptionCheckIn] Raw QR data length:', qrData.length);
                console.log('[ReceptionCheckIn] Trimmed guest name length:', guestName.length);

                if (!guestName) {
                  showToast('QR code kosong', 'error');
                  return;
                }

                console.log('[ReceptionCheckIn] Searching for guest with name:', guestName);
                console.log('[ReceptionCheckIn] Total guests in system:', allGuests?.length || 0);
                console.log('[ReceptionCheckIn] First 5 guests:', (allGuests?.slice(0, 5) || []).map((g: any) => ({ name: g.name, _id: g._id })));

                // Find guest by name in the guests list (case-insensitive)
                const foundGuest = allGuests?.find((g: any) => {
                  const guestNameLower = g.name.toLowerCase();
                  const scannedNameLower = guestName.toLowerCase();
                  console.log(`[ReceptionCheckIn] Comparing: "${guestNameLower}" === "${scannedNameLower}"`, guestNameLower === scannedNameLower);
                  return guestNameLower === scannedNameLower;
                });

                if (foundGuest) {
                  console.log('[ReceptionCheckIn] Found matching guest:', foundGuest);
                  setSelectedGuest({
                    id: foundGuest._id,
                    name: foundGuest.name,
                    code: foundGuest.invitationCode
                  });
                  setPickedAt(new Date());
                  setDetailOpen(true);
                  showToast(`Tamu ditemukan: ${foundGuest.name}`, 'success');
                } else {
                  console.log('[ReceptionCheckIn] No matching guest found for name:', guestName);
                  showToast(`Tamu "${guestName}" tidak ada di sistem`, 'error');

                  // Also try searching with a more flexible approach
                  const similarGuests = allGuests?.filter((g: any) =>
                    g.name.toLowerCase().includes(guestName.toLowerCase()) ||
                    guestName.toLowerCase().includes(g.name.toLowerCase())
                  ) || [];

                  if (similarGuests.length > 0) {
                    showToast(`Apakah maksudmu: ${similarGuests[0].name}?`, 'info');
                  }
                }
              } catch (error) {
                showToast('Invalid QR code', 'error');
              }
            }}
            context="reception"
          />

          {/* Non-Invited Guest Check-In Modal */}
          <NonInvitedGuestCheckInModal
            isOpen={nonInvitedGuestModalOpen}
            onClose={() => setNonInvitedGuestModalOpen(false)}
            onSubmit={handleNonInvitedGuestCheckIn}
          />

          {/* Guest Detail Modal */}
          <GuestDetailModal
            open={detailOpen}
            guest={selectedGuest}
            pickedAt={pickedAt}
            onClose={async () => {
              setDetailOpen(false);
              // Refresh guest data when modal closes to ensure latest gift/souvenir data
              await mutateGuests();
            }}
            onCheckIn={(g) => {
              console.info('Checked-in guest:', g.name, 'at', pickedAt);
              showToast(`Berhasil Check-in untuk Tamu: ${g.name}`, 'success');
            }}
          />


        </div>
      </div>
      {/* Bottom navigation - inline at the page bottom */}
      <div className="">
        <BottomBar
          variant="inline"
          active="checkin"
          onSelect={(key) => {
            if (key === 'home') navigate('/dashboard');
            else if (key === 'souvenir') navigate('/souvenirs');
            else if (key === 'gift') navigate('/gifts');
            else if (key === 'doorprize') navigate('/doorprize');
            else if (key === 'checkin') setCheckInOpen(true);
          }}
        />
      </div>
    </div>
  );
}