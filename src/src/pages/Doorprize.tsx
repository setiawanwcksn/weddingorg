import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Play, Filter, Search as SearchIcon, Eye, Edit3, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { Toast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { swrGuestConfig } from '../utils/swrConfig';
import { useNavigate } from 'react-router-dom';
import { TableFilterPopover } from '../components/guests/TableFilterPopover';
import { BottomBar } from '../components/navigation/BottomBar';
import { apiUrl } from '../lib/api';
import filter from '../assets/filter.png';

export type CheckedInGuest = {
  id: string;
  name: string;
  code?: string;
  category?: string;
  info?: string;
  session?: string;
  limit?: number;
  tableNo?: string;
  guestCount?: number;
  checkedInAt?: string; // ISO string
};

/**
 * Data fetcher for SWR with authentication
 */
const fetcher = (url: string, apiRequest: (url: string) => Promise<Response>) => {
  console.log(`[Doorprize Fetcher] Fetching URL: ${url}`);
  return apiRequest(url).then(res => {
    console.log(`[Doorprize Fetcher] Response status: ${res.status}`);
    if (!res.ok) {
      console.error(`[Doorprize Fetcher] Response not OK: ${res.status} ${res.statusText}`);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }).then(data => {
    console.log(`[Doorprize Fetcher] Data received:`, data);
    return data;
  }).catch(error => {
    console.error(`[Doorprize Fetcher] Fetch error:`, error);
    throw error;
  });
};

function ActionButton({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-primary text-background text-sm font-medium shadow min-h-[44px] touch-manipulation">
      <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5">{icon}</span>
      <span className="inline whitespace-nowrap">{children}</span>
    </button>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-accent text-text/80">{children}</span>;
}

function RowActions() {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md bg-secondary border border-border min-h-[36px] touch-manipulation" aria-label="view"><Eye className="w-3 h-3 sm:w-4 sm:h-4" /></button>
      <button className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md bg-secondary border border-border min-h-[36px] touch-manipulation" aria-label="edit"><Edit3 className="w-3 h-3 sm:w-4 sm:h-4" /></button>
      <button className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md bg-secondary border border-border min-h-[36px] touch-manipulation" aria-label="delete"><Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /></button>
    </div>
  );
}

export function Doorprize(): JSX.Element {
  const { apiRequest, user, token } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [toast, setToast] = React.useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });
  const [manualData, setManualData] = React.useState<any>(null);
  const [manualError, setManualError] = React.useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [visibleCols, setVisibleCols] = React.useState<Record<string, boolean>>({
    no: true,
    name: true,
    kode: true,
    kategori: true,
    informasi: true,
    sesi: true,
    limit: true,
    meja: true,
    tamu: true,
    tanggal: true,
    waktu: true,
  });

  // Fetch checked-in guests with standardized SWR configuration
  // Include user ID in cache key to ensure isolation between accounts
  const { data, error, isLoading } = useSWR<{ items: CheckedInGuest[] }>(
    user ? 'doorprize-checked-in' : null,
    () => fetcher(apiUrl(`/api/doorprize/checked-in`), apiRequest),
    {
      ...swrGuestConfig,
      revalidateOnMount: true, // Force revalidation on mount to ensure data is fetched
    }
  );

  // Add detailed request logging
  React.useEffect(() => {
    if (user) {
      console.log(`[Doorprize] Fetching checked-in guests for user:`, user);
      console.log(`[Doorprize] Token available: ${token ? 'Yes' : 'No'}`);
      if (token) {
        console.log(`[Doorprize] Token preview: ${token.substring(0, 20)}...`);
      }

      // Debug: Check if SWR is actually making the request
      console.log(`[Doorprize] SWR should be triggered with key: 'doorprize-checked-in'`);
      console.log(`[Doorprize] User authenticated: ${user ? 'Yes' : 'No'}`);
    }
  }, [user, token]);

  // Debug SWR state changes
  React.useEffect(() => {
    console.log(`[Doorprize] SWR State - isLoading: ${isLoading}, error: ${error}, data:`, data);
  }, [isLoading, error, data]);

  // Direct API test to debug the issue
  React.useEffect(() => {
    if (user && token) {
      const testApiCall = async () => {
        try {
          console.log(`[Doorprize] Testing direct API call...`);
          const response = await apiRequest(apiUrl(`/api/doorprize/checked-in`));
          console.log(`[Doorprize] Direct API response status: ${response.status}`);
          const responseData = await response.json();
          console.log(`[Doorprize] Direct API response data:`, responseData);
        } catch (error) {
          console.error(`[Doorprize] Direct API call failed:`, error);
        }
      };

      // Test after a short delay to ensure auth is ready
      setTimeout(testApiCall, 1000);
    }
  }, [user, token, apiRequest]);

  React.useEffect(() => {
    if (error) {
      console.error('Doorprize fetch error:', error);
      setToast({
        show: true,
        message: `Failed to load checked-in guests: ${error.message}`,
        type: 'error'
      });
    }
  }, [error]);

  const guests = (data?.items ?? []).map((g, idx) => {
    console.log(`[Doorprize] Processing guest ${idx}:`, g);
    return {
      no: String(idx + 1).padStart(2, '0'),
      name: g.name,
      code: g.code ?? '-',
      category: g.category ?? '-',
      info: g.info ?? '-',
      session: g.session ?? '-',
      limit: g.limit ?? 2,
      tableNo: g.tableNo ?? '-',
      guestCount: g.guestCount ?? 1,
      date: g.checkedInAt ? new Date(g.checkedInAt).toLocaleDateString() : '-',
      time: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    };
  });

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter(r => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term));
  }, [q, guests]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset ke page 1 saat keyword berubah
  useEffect(() => {
    setPage(1);
  }, [q]);

  return (
    <div className="flex flex-col flex-1">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4 md:space-y-6">
          {/* Top Actions bar */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-3 md:p-5 rounded-b-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <ActionButton icon={<UserPlus className="w-4 h-4" />}>Tambah Peserta</ActionButton>
                <ActionButton icon={<Play className="w-4 h-4" />} onClick={() => navigate('/doorprize/picker')}>Start To Play</ActionButton>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-primary text-background border border-primary transition-colors min-h-[48px] touch-manipulation"
                    title="Filter columns"
                  >
                    <img src={filter} className="w-5 h-5" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
                  </button>
                  <TableFilterPopover
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    options={[
                      { key: 'no', label: 'No', checked: visibleCols.no },
                      { key: 'name', label: 'Nama', checked: visibleCols.name },
                      { key: 'kode', label: 'kode', checked: visibleCols.kode },
                      { key: 'kategori', label: 'kategori', checked: visibleCols.kategori },
                      { key: 'informasi', label: 'informasi', checked: visibleCols.informasi },
                      { key: 'sesi', label: 'Sesi', checked: visibleCols.sesi },
                      { key: 'limit', label: 'Limit Tamu', checked: visibleCols.limit },
                      { key: 'meja', label: 'No. Meja', checked: visibleCols.meja },
                      { key: 'tamu', label: 'Jumlah Tamu', checked: visibleCols.tamu },
                      { key: 'tanggal', label: 'Tanggal', checked: visibleCols.tanggal },
                      { key: 'waktu', label: 'Waktu', checked: visibleCols.waktu },
                    ]}
                    onToggle={(key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                    onToggleAll={(checked) => {
                      const keys = ['no', 'name', 'kode', 'kategori', 'informasi', 'sesi', 'limit', 'meja', 'tamu', 'tanggal', 'waktu'];
                      setVisibleCols(keys.reduce((acc, k) => ({ ...acc, [k]: checked }), {} as typeof visibleCols));
                    }}
                  />

                </div>
              </div>
            </div>
          </div>

          {/* Table controls */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm px-4 sm:px-6 lg:px-8 py-6 rounded-t-none" style={{ marginTop: '0px' }}>
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
              <div className="flex items-center gap-2 w-full sm:w-64 order-1 sm:order-2 mb-3 sm:mb-0">
                <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text/70 flex-shrink-0" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm outline-none focus:border-primary hover:border-primary/50 transition-colors" placeholder="Search participants..." />
              </div>
            </div>

            {/* Error state */} {error && (
              <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                Failed to load checked-in guests. Please try again.
                <br />
                <code className="text-xs mt-1 block">{error.message}</code>
              </div>
            )} {/* Manual API test results */} {manualData && (
              <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
                <div className="font-medium mb-2">Manual API Test Results:</div>
                <div>Success: {manualData.success ? 'Yes' : 'No'}</div>
                <div>Items found: {manualData.items?.length || 0}</div>
                {manualData.items && manualData.items.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs">First guest: {manualData.items[0]?.name}</div>
                  </div>
                )}
              </div>
            )} {manualError && (
              <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                <div className="font-medium mb-2">Manual API Test Error:</div>
                <div>{manualError}</div>
              </div>
            )} {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent text-text/70">
                    {visibleCols.no && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">No</th>}
                    {visibleCols.name && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Nama</th>}
                    {visibleCols.kode && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Kode</th>}
                    {visibleCols.kategori && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Kategori</th>}
                    {visibleCols.inf && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Informasi</th>}
                    {visibleCols.sesi && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Sesi</th>}
                    {visibleCols.limit && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Limit</th>}
                    {visibleCols.meja && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">No. Meja</th>}
                    {visibleCols.tamu && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Jumlah Tamu</th>}
                    {visibleCols.tanggal && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Tanggal</th>}
                    {visibleCols.waktu && <th className="text-left font-medium px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">Waktu</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-2 sm:px-3 py-8 text-center text-text/60">
                        Loading checked-in guests...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-2 sm:px-3 py-8 text-center text-text/60">
                        {data?.items?.length === 0 ? 'No checked-in guests found' : 'No matching guests found'}
                      </td>
                    </tr>
                  ) : (pageRows.map((r, idx) => (
                    <tr key={idx}>
                      {visibleCols.no && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.no}</td>}
                      {visibleCols.name && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.name}</td>}
                      {visibleCols.kode && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-primary font-medium">{r.code}</td>}
                      {visibleCols.kategori && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        <InfoPill>{r.category}</InfoPill>
                      </td>}
                      {visibleCols.info && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        <InfoPill>{r.info}</InfoPill>
                      </td>}
                      {visibleCols.sesi && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.session}</td>}
                      {visibleCols.limit && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.limit}</td>}
                      {visibleCols.meja && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.tableNo}</td>}
                      {visibleCols.tamu && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.guestCount}</td>}
                      {visibleCols.tanggal && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.date}</td>}
                      {visibleCols.waktu && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{r.time}</td>}
                      {/* <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        <RowActions />
                      </td> */}
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden mt-3 space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-text/60">
                  Loading checked-in guests...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-text/60">
                  {data?.items?.length === 0 ? 'No checked-in guests found' : 'No matching guests found'}
                </div>
              ) : (filtered.map((r, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text/60">#{r.no}</span>
                      <span className="text-primary font-medium">{r.code}</span>
                    </div>
                    <RowActions />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-text">{r.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <InfoPill>{r.category}</InfoPill>
                        <InfoPill>{r.info}</InfoPill>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text/60">Sesi:</span>
                        <span className="ml-1">{r.session}</span>
                      </div>
                      <div>
                        <span className="text-text/60">Limit:</span>
                        <span className="ml-1">{r.limit}</span>
                      </div>
                      <div>
                        <span className="text-text/60">Meja:</span>
                        <span className="ml-1">{r.tableNo}</span>
                      </div>
                      <div>
                        <span className="text-text/60">Tamu:</span>
                        <span className="ml-1">{r.guestCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text/60 pt-2 border-t border-border">
                      <span>{r.date}</span>
                      <span>{r.time}</span>
                    </div>
                  </div>
                </div>
              )))}
            </div>

            {/* Footer */}
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

          {/* Toast */} {toast.show && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'success' })} duration={4000} />)}
        </div>
      </div>
      {/* Bottom Navigation - Fixed at bottom without floating */}
      <div className="mt-auto pt-6 py-6">
        <BottomBar variant="inline" active="doorprize" onSelect={(key) => { switch (key) { case 'home': navigate('/dashboard'); break; case 'checkin': navigate('/reception'); break; case 'souvenir': navigate('/souvenirs'); break; case 'gift': navigate('/gifts'); break; } }} />
      </div>
    </div>
  );
}
