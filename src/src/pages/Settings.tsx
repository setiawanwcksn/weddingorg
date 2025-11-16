import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiUrl, getAuthHeaders } from '../utils/api';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';

type PhotoField =
    | 'weddingPhotoUrl'
    | 'weddingPhotoUrl_dashboard'
    | 'weddingPhotoUrl_welcome';

export default function Settings(): JSX.Element {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingDashboardPhoto, setUploadingDashboardPhoto] = useState(false);
    const [uploadingWelcomePhoto, setUploadingWelcomePhoto] = useState(false);

    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [previewDashboardPhoto, setPreviewDashboardPhoto] = useState<string | null>(null);
    const [previewWelcomePhoto, setPreviewWelcomePhoto] = useState<string | null>(null);

    const fileInputMainRef = useRef<HTMLInputElement | null>(null);
    const fileInputDashboardRef = useRef<HTMLInputElement | null>(null);
    const fileInputWelcomeRef = useRef<HTMLInputElement | null>(null);

    if (!user) {
        return
    }

    const handlePhotoUpload = async (
        file: File,
        userId: string,
        fieldName: PhotoField
    ): Promise<boolean> => {
        const setUploading =
            fieldName === 'weddingPhotoUrl'
                ? setUploadingPhoto
                : fieldName === 'weddingPhotoUrl_dashboard'
                    ? setUploadingDashboardPhoto
                    : setUploadingWelcomePhoto;

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            fd.append('type', 'user');
            fd.append('userId', userId);       // prefix filename di server
            fd.append('fieldType', fieldName); // “weddingPhotoUrl” | “..._dashboard” | “..._welcome”

            const headers = getAuthHeaders(); // pastikan TIDAK set 'Content-Type'
            delete (headers as any)['Content-Type'];
            delete (headers as any)['content-type'];

            const res = await fetch(getApiUrl('/api/upload'), {
                method: 'POST',
                headers,
                body: fd,
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                throw new Error(txt || 'Upload failed');
            }

            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || 'Upload failed');

            const filename: string | undefined = json?.data?.filename;
            const imageUrl = filename ? getApiUrl(`/api/upload/${filename}`) : URL.createObjectURL(file);

            if (fieldName === 'weddingPhotoUrl') {
                setPreviewPhoto(imageUrl);
            } else if (fieldName === 'weddingPhotoUrl_dashboard') {
                setPreviewDashboardPhoto(imageUrl);
            } else {
                setPreviewWelcomePhoto(imageUrl);
            }

            showToast('Foto berhasil di-upload', 'success');
            return true;
        } catch (err: any) {
            console.error(`[upload ${fieldName}]`, err);
            showToast(err?.message ?? 'Gagal untuk upload photo', 'error');
            return false;
        } finally {
            setUploading(false);
        }
    };

    const handlePickFile = (ref: React.RefObject<HTMLInputElement>) => {
        if (ref.current) {
            ref.current.click();
        }
    };

    const renderUploadBlock = (opts: {
        title: string;
        description: string;
        field: PhotoField;
        uploading: boolean;
        previewUrl: string | null;
        inputRef: React.RefObject<HTMLInputElement>;
    }) => {
        const { title, description, field, uploading, previewUrl, inputRef } = opts;

        return (
            <div className="rounded-xl border border-border bg-background p-4 sm:p-5 flex flex-col gap-3">
                <div>
                    <h3 className="text-sm sm:text-base font-semibold text-text">{title}</h3>
                    <p className="text-xs sm:text-sm text-text/70 mt-1">{description}</p>
                </div>

                {/* Preview */}
                <div className="flex items-center gap-4">
                    <div className="w-28 h-20 sm:w-32 sm:h-24 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-accent/30">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt={title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-text/50 text-[11px] sm:text-xs">
                                <ImageIcon className="w-6 h-6 mb-1" />
                                <span>No preview</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handlePhotoUpload(file, user.id, field);
                                // reset input agar event onChange bisa terpanggil lagi dengan file sama
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => handlePickFile(inputRef)}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs sm:text-sm font-medium text-text bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <UploadCloud className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Pilih & Upload Foto'}
                        </button>
                        <p className="text-[11px] sm:text-xs text-text/60">
                            Rekomendasi: rasio 16:9, ukuran &lt; 1MB, format JPG/PNG.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-accent">
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="bg-background rounded-xl border border-border shadow-sm">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-xl font-semibold text-text">Settings</h1>
                                        <p className="text-xs sm:text-sm text-text/70 mt-1">
                                            Atur foto utama, foto dashboard, dan foto welcome display.
                                        </p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-5">
                                    {renderUploadBlock({
                                        title: 'Foto Utama (Wedding Photo)',
                                        description: 'Digunakan di berbagai bagian aplikasi sebagai foto utama.',
                                        field: 'weddingPhotoUrl',
                                        uploading: uploadingPhoto,
                                        previewUrl: previewPhoto,
                                        inputRef: fileInputMainRef,
                                    })}

                                    {renderUploadBlock({
                                        title: 'Foto Dashboard',
                                        description: 'Ditampilkan di halaman Dashboard admin.',
                                        field: 'weddingPhotoUrl_dashboard',
                                        uploading: uploadingDashboardPhoto,
                                        previewUrl: previewDashboardPhoto,
                                        inputRef: fileInputDashboardRef,
                                    })}

                                    {renderUploadBlock({
                                        title: 'Foto Welcome Screen',
                                        description: 'Digunakan pada tampilan Welcome Display di resepsi.',
                                        field: 'weddingPhotoUrl_welcome',
                                        uploading: uploadingWelcomePhoto,
                                        previewUrl: previewWelcomePhoto,
                                        inputRef: fileInputWelcomeRef,
                                    })}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
