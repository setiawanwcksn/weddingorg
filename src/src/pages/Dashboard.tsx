import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGuests } from '../contexts/GuestsContext';
import { UserPlus, Play, Filter, Search as SearchIcon, Eye, Edit3, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { apiUrl } from '../lib/api';

interface DashboardAccountInfo {
  id: string;
  name: string;
  title: string;
  dateTime: Date;
  location: string;
  photoUrl_dashboard: string;
  photoUrl: string;
}

const DEFAULT_PHOTO = 'https://cdn-tos-cn.bytedance.net/obj/aipa-tos/e076dab9-d4e2-49fa-810a-5cfdc56d223e/image.png';

// Convert Google Drive sharing links to direct image URLs
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return DEFAULT_PHOTO;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  if (url.includes('drive.google.com/uc?export=view')) {
    return url;
  }
  return url || DEFAULT_PHOTO;
};

interface WeddingCountdown {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
  weddingDate: string;
  currentDate: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, apiRequest, hasPermission } = useAuth();
  const [account, setAccount] = useState<DashboardAccountInfo | null>(null);
  const [countdown, setCountdown] = useState<WeddingCountdown | null>(null);

  // Use shared guests and stats from context (loaded once globally)
  const { stats: sharedStats } = useGuests();

  // Fetch wedding countdown
  const { data: weddingCountdown } = useSWR<WeddingCountdown>(
    user ? apiUrl(`/api/auth/wedding/countdown`) : null,
      (url) => apiRequest(url).then(res => res.json()).then(data => data.data)
    );

  useEffect(() => {
    const loadAccount = async () => {
      if (!user) return;
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
            photoUrl: a.photoUrl ?? DEFAULT_PHOTO,
            photoUrl_dashboard: a.photoUrl ?? DEFAULT_PHOTO,
          });
        }
      } catch (e) {
        console.error('Dashboard loadAccount error:', (e as Error).message);
      }
    };
    loadAccount();
  }, [user]);

  useEffect(() => {
    if (weddingCountdown) {
      setCountdown(weddingCountdown);
      if (!weddingCountdown.isPast) {
        const interval = setInterval(() => {
          // if you want, revalidate via SWR; keeping placeholder for now
        }, 60000);
        return () => clearInterval(interval);
      }
    }
  }, [weddingCountdown]);

  const title = account?.title ?? 'Your Wedding';
  const dateText = account?.dateTime ? account.dateTime.toLocaleString() : '';
  const location = account?.location ?? '';

  // Use dashboard-specific photo if available, otherwise use account photoUrl or default
  const [photoUrl, setPhotoUrl] = useState<string>(DEFAULT_PHOTO);

  useEffect(() => {
    const loadPhoto = async () => {
      if (!user?.id) {
        // Use dashboard-specific photo if available, otherwise fallback to regular photo
        const dashboardPhoto = account?.photoUrl_dashboard || account?.photoUrl;
        setPhotoUrl(convertGoogleDriveUrl(dashboardPhoto || ''));
        return;
      }

      // Try to load uploaded photo first using authenticated request
      // Now we can check without specifying extension - server will find any matching file
      try {
        const response = await apiRequest(apiUrl(`/api/upload/${user.id}/exists`));
        const result = await response.json();

        if (response.ok && result.success && result.exists) {
          // Use the actual filename returned by the server (includes extension)
          const uploadedPhotoUrl = apiUrl(`/api/upload/${result.filename}`);
          setPhotoUrl(uploadedPhotoUrl);
        } else {
          // Fallback to dashboard-specific photo, then regular photo, then default
          const dashboardPhoto = account?.photoUrl_dashboard || account?.photoUrl;
          setPhotoUrl(convertGoogleDriveUrl(dashboardPhoto || ''));
        }
      } catch (error) {
        console.log('Uploaded photo not found, using account photo or default');
        // Fallback to dashboard-specific photo, then regular photo, then default
        const dashboardPhoto = account?.photoUrl_dashboard || account?.photoUrl;
        setPhotoUrl(convertGoogleDriveUrl(dashboardPhoto || ''));
      }
    };

    loadPhoto();
  }, [user?.id, account?.photoUrl, account?.photoUrl_dashboard, apiRequest]);

  const displayStats = [
    { label: 'Total Tamu', value: sharedStats.totalWithPlusOne + sharedStats.tamuTambahan },
    { label: 'Tamu Undangan', value: sharedStats.invitedGuests },
    { label: 'Tamu VIP', value: sharedStats.vip },
    { label: 'Tamu Tambahan', value: sharedStats.tamuTambahan },
  ];

  return (
    // page bg: very light gray like reference
    <div className="bg-accent text-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Hero image card */}
          <div className="rounded-xl overflow-hidden border border-border/60 bg-white shadow-sm">
            <img
              src={photoUrl}
              alt="hero"
              className="w-full h-48 sm:h-[260px] md:h-64 lg:h-72 object-cover"
            />
            {/* optional caption area could go here */}
          </div>

          {/* Data Tamu card with purple header */}
          <div className="rounded-xl overflow-hidden border border-border/60 bg-white shadow-sm" style={{ height: '100%' }}>
            <div className="bg-primary text-white px-5 py-4 font-semibold text-sm sm:text-base rounded-t-xl">
              Data Tamu
            </div>

            <ul className="divide-y divide-gray-100">
              {displayStats.map((row, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between px-5 py-4 bg-white"
                >
                  <div className="flex items-center gap-3">
                    {/* purple soft square */}
                    <span className="w-3 h-3 rounded-sm bg-primary/20 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lower grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mt-6">
          {/* Left: Countdown & CTA */}
          <div className="rounded-xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm">
            <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{dateText}</p>
            <p className="text-sm text-gray-500">{location}</p>

            <div className="mt-6 grid grid-cols-4 gap-3 max-w-md">
              {countdown ? (
                countdown.isPast ? (
                  <>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">00</div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Bulan</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">00</div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Hari</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">00</div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Jam</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">00</div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Menit</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">
                        {String(countdown.months).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Bulan</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">
                        {String(countdown.days).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Hari</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1  font-semibold">Jam</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                      <div className="text-lg sm:text-2xl font-semibold">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">Menit</div>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                    <div className="text-lg sm:text-2xl font-semibold ">--</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold">Bulan</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                    <div className="text-lg sm:text-2xl font-semibold ">--</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold">Hari</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                    <div className="text-lg sm:text-2xl font-semibold ">--</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold">Jam</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-accent p-3 text-center">
                    <div className="text-lg sm:text-2xl font-semibold ">--</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold">Menit</div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-border/60 mt-6 pt-6">
              <button
                className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-5 py-3 rounded-full bg-primary text-white text-sm font-medium shadow-md hover:opacity-95 transition"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> Lihat Preview Undangan
              </button>
            </div>
          </div>

          {/* Right stacked panels */}
          <div className="space-y-4 sm:space-y-6">
            {[
              {
                title: 'Kelola Tamu',
                desc: 'Kelola daftar tamu, kirim reminder, dan atur kursi.',
                permission: 'guests',
                onClick: () => navigate('/guests')
              },
              {
                title: 'Penerima Tamu',
                desc: 'Atur penerima tamu dan proses check-in.',
                permission: 'reception',
                onClick: () => navigate('/reception')
              },
              {
                title: 'Tanya Customer Care',
                desc: 'Hubungi customer care untuk bantuan lebih lanjut.'
              }
            ].map((card, idx) => {
              const hasAccess = card.permission ? hasPermission(card.permission) : true;
              const isDisabled = !hasAccess;

              return (
                <button
                  key={idx}
                  onClick={isDisabled ? undefined : (card.onClick as any)}
                  disabled={isDisabled}
                  className={`w-full text-left rounded-xl border border-border/60 bg-white p-4 sm:p-5 flex items-start gap-3 shadow-sm transition hover:shadow-md ${isDisabled ? 'opacity-60 cursor-not-allowed bg-accent' : 'cursor-pointer'
                    }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-primary/20"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-900">{card.title}</div>
                    <div className="text-xs text-gray-500 mt-1 max-w-md">{card.desc}</div>
                  </div>
                  {isDisabled && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
