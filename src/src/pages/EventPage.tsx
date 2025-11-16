import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiUrl } from '../lib/api';
import { useAccount } from '../hooks/useAccount';

const EventPage: React.FC = () => {
    const { account, loading, error, refresh } = useAccount();
    const { user, apiRequest } = useAuth();
    const { showToast } = useToast();

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [invitationLink, setInvitationLink] = useState('');
    // const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasTried, setHasTried] = useState(false);

    const [welcomeText, setWelcomeText] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [guestCategories, setGuestCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');


    useEffect(() => {
        if (!account) return;

        setTitle(account.title || '');
        setLocation(account.location || '');
        setInvitationLink(account.linkUndangan || '');
        setWelcomeText(account.welcomeText || '');
        setYoutubeUrl(account.youtubeUrl || '');
        setGuestCategories(Array.isArray(account.guestCategories) ? account.guestCategories : []);

        if (account.dateTime) {
            const dt = new Date(account.dateTime);
            setEventDate(dt.toISOString().slice(0, 10));

            const hh = String(dt.getHours()).padStart(2, "0");
            const mm = String(dt.getMinutes()).padStart(2, "0");
            setEventTime(`${hh}:${mm}`);
        }
    }, [account]);

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (!trimmed) return;
        if (guestCategories.includes(trimmed)) {
            showToast?.('Kategori sudah ada', 'info');
            return;
        }
        setGuestCategories((prev) => [...prev, trimmed]);
        setNewCategory('');
    };

    const handleRemoveCategory = (cat: string) => {
        setGuestCategories((prev) => prev.filter((c) => c !== cat));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // Gabungkan date + time jadi satu datetime (kalau dibutuhkan backend)
            let eventDateTime: string | null = null;
            if (eventDate && eventTime) {
                eventDateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();
            }

            const res = await apiRequest(apiUrl(`/api/users/accounts/${user?.accountId}`), {
                method: 'PUT', // ganti ke 'POST' kalau API kamu pakai POST
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    title,
                    location,
                    dateTime: eventDateTime,
                    linkUndangan: invitationLink,
                    welcomeText,
                    youtubeUrl,
                    guestCategories,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to save event details');
            }
             await refresh();
            showToast?.('Event details berhasil disimpan', 'success');
        } catch (err: any) {
            console.error('Error saving event details:', err);
            showToast?.(err.message || 'Gagal menyimpan event details', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-accent">
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="bg-background rounded-xl border border-border shadow-sm">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                {/* Header */}
                                <div className="flex items-center justify-between h-16">
                                    <div className="flex items-center space-x-3">
                                        <h1 className="text-xl font-semibold text-text">Update Event Details</h1>
                                    </div>
                                </div>

                                {/* Form */}
                                <form
                                    className="mt-4 pb-6 border-t border-border pt-4"
                                    onSubmit={handleSubmit}
                                >
                                    {loading ? (
                                        <div className="py-8 text-center text-sm text-text/70">
                                            Loading event details...
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                {/* Acara */}
                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        Acara
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="title"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        placeholder="Contoh: The Wedding of Bagas & Naila"
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        Lokasi Acara
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="location"
                                                        value={location}
                                                        onChange={(e) => setLocation(e.target.value)}
                                                        placeholder="Contoh: The Wedding of Bagas & Naila"
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Tanggal */}
                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        Tanggal
                                                    </label>
                                                    <input
                                                        type="date"
                                                        name="eventDate"
                                                        value={eventDate}
                                                        onChange={(e) => setEventDate(e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Jam */}
                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        Jam
                                                    </label>
                                                    <input
                                                        type="time"
                                                        name="eventTime"
                                                        value={eventTime}
                                                        onChange={(e) => setEventTime(e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Link Undangan */}
                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        Link Undangan
                                                    </label>
                                                    <input
                                                        type="url"
                                                        name="invitationLink"
                                                        value={invitationLink}
                                                        onChange={(e) => setInvitationLink(e.target.value)}
                                                        placeholder="https://contoh-undangan.com/bagas-naila"
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                                {/* YouTube Video URL */}
                                                <div>
                                                    <label className="block text-sm font-medium text-text mb-1.5">
                                                        YouTube Video URL
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={youtubeUrl}
                                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                                        placeholder="https://www.youtube.com/watch?v=xxxxxx"
                                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                    <p className="mt-1 text-[11px] sm:text-xs text-text/60">
                                                        Akan digunakan di welcome page (opsional).
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Welcome text */}
                                            <div className="mt-6">
                                                <label className="block text-sm font-medium text-text mb-1.5">
                                                    Welcome Text
                                                </label>
                                                <textarea
                                                    value={welcomeText}
                                                    onChange={(e) => setWelcomeText(e.target.value)}
                                                    rows={3}
                                                    placeholder="Contoh: Selamat datang di acara pernikahan kami..."
                                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                                />
                                                <p className="mt-1 text-[11px] sm:text-xs text-text/60">
                                                    Teks ini digunakan di layar welcome.
                                                </p>
                                            </div>
                                            {/* Kategori Tamu */}
                                            <div className="mt-6">
                                                <label className="block text-sm font-medium text-text mb-1.5 flex items-center gap-2">
                                                    Kategori Tamu
                                                </label>

                                                {/* Input + tombol tambah */}
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                    <input
                                                        type="text"
                                                        value={newCategory}
                                                        onChange={(e) => setNewCategory(e.target.value)}
                                                        placeholder="Contoh: Keluarga, Teman Kantor, VIP"
                                                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddCategory}
                                                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-background text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors"
                                                    >
                                                        Tambah
                                                    </button>
                                                </div>

                                                {/* List kategori */}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {guestCategories.length === 0 && (
                                                        <p className="text-[11px] sm:text-xs text-text/60">
                                                            Belum ada kategori. Tambahkan kategori tamu untuk membantu pengelompokan.
                                                        </p>
                                                    )}

                                                    {guestCategories.map((cat) => (
                                                        <span
                                                            key={cat}
                                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/40 text-xs sm:text-sm text-text border border-accent/60"
                                                        >
                                                            {cat}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCategory(cat)}
                                                                className="text-text/60 hover:text-danger text-[10px]"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Tombol submit */}
                                            <div className="mt-6 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="inline-flex items-center px-4 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </form>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default EventPage;