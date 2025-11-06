/**
 * IntroTextModal component
 * Provides a modal for selecting and composing "Teks Pengantar" (introductory message) used in the Kelola Tamu page.
 * Works alongside AddGuestModal; controlled via props with open/close/save callbacks.
 * Fetches and saves intro text from database with user-specific content.
 */
import React from 'react';
import { X } from 'lucide-react';
import useSWR from 'swr';
import { IntroText, ApiResponse } from '../../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl, getAuthHeaders, handleApiResponse } from '../../utils/api';

export type IntroTemplate = 'Formal' | 'Casual';

export interface IntroTextFormData {
  template: IntroTemplate;
  content: string;
}

export interface IntroTextModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: IntroTextFormData) => void;
}

const fetcher = async (url: string, userId?: string) => {
  console.log('Fetching intro text from URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(userId),
    });
    
    const data = await response.json();
    console.log('Intro text fetch response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to fetch intro text');
    }
    
    return data;
  } catch (error) {
    console.error('Fetcher error:', error);
    throw error;
  }
};

const defaultFormal = `Yth. {nama}

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami.

{mempelai}

Berikut link undangan kami, untuk info lengkap dan akses bisa kunjungi:

{link-undangan}

Mohon maaf apabila undangan dan kehadiran Bapak/Ibu/Saudara/i tidak dapat kami sampaikan secara langsung.

Mohon perihal undangan ini disampaikan pada keluarga yang dalan satu rumah.

Note*: Jika teks tidak bisa diakses, silakan copy link kemudian paste di Chrome atau Browser lainnya.

*Note : Jangan menghapus {nama}/{link-undangan}/{mempelai}`;

const defaultCasual = `Hai {nama}!

Kita mau bagi kabar bahagia nih. Kami mengundang {nama} untuk hadir di acara pernikahan kami.

{mempelai}

Lebih lengkapnya ada di link undangan berikut ya:

{link-undangan}

Sampai jumpa di hari bahagia kami! ❤️`;

export function IntroTextModal({ open, onClose, onSave }: IntroTextModalProps) {
  const { user } = useAuth();
  const [form, setForm] = React.useState<IntroTextFormData>({ template: 'Formal', content: defaultFormal });
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: introTextData, error, isLoading } = useSWR<ApiResponse<IntroText>>(
    user && open ? getApiUrl('/api/intro-text') : null,
    (url) => fetcher(url, user?.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
      errorRetryInterval: 2000,
      onError: (err) => {
        console.error('SWR error loading intro text:', err);
      }
    }
  );

  React.useEffect(() => {
    if (!open) return;
    
    console.log('IntroTextModal opened, introTextData:', introTextData);
    
    if (introTextData && introTextData.success && introTextData.data) {
      // Set form data based on fetched intro text
      const template: IntroTemplate = 'Formal';
      setForm({ 
        template, 
        content: introTextData.data.formalText || defaultFormal 
      });
    } else if (introTextData && !introTextData.success) {
      console.error('API returned error:', introTextData.error);
    }
  }, [open, introTextData]);

  const updateTemplate = (t: IntroTemplate) => {
    const currentData = introTextData?.data;
    const content = t === 'Formal' 
      ? (currentData?.formalText || defaultFormal)
      : (currentData?.casualText || defaultCasual);
    setForm((s) => ({ template: t, content }));
  };

  const updateContent = (v: string) => setForm((s) => ({ ...s, content: v }));

  const saveIntroText = async (data: IntroTextFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const method = introTextData?.data ? 'PUT' : 'POST';
      
      const apiUrl = getApiUrl('/api/intro-text');
      console.log('Saving intro text to:', apiUrl);
      
      // Get current intro text data for fallback
      const currentData = introTextData?.data;
      const currentFormalText = currentData?.formalText || defaultFormal;
      const currentCasualText = currentData?.casualText || defaultCasual;
      
      const response = await fetch(apiUrl, {
        method,
        headers: getAuthHeaders(user?.id),
        body: JSON.stringify({
          formalText: data.template === 'Formal' ? data.content : currentFormalText,
          casualText: data.template === 'Casual' ? data.content : currentCasualText,
          isActive: true
        }),
      });

      const responseData = await handleApiResponse(response);
      console.log('Save response:', responseData);

      onSave(data);
    } catch (error) {
      console.error('Error saving intro text:', error);
      alert(`Failed to save intro text: ${error.message}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const submit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    saveIntroText(form);
  };

  if (!open) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
        <div className="absolute inset-0 bg-text/40" onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-md md:max-w-lg rounded-xl border border-border bg-white shadow-xl p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading intro text...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Intro text loading error:', error);
    return (
      <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
        <div className="absolute inset-0 bg-text/40" onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-md md:max-w-lg rounded-xl border border-border bg-white shadow-xl p-6">
            <div className="text-red-600 text-center">
              <p className="font-semibold mb-2">Failed to load intro text</p>
              <p className="text-sm text-gray-600 mb-4">{error.message || 'Please try again.'}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" style={{ marginTop: 'unset' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <div className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg rounded-xl border border-border bg-white shadow-xl overflow-hidden max-h-[90vh] sm:max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-primary text-white">
            <div className="font-semibold text-sm sm:text-base md:text-lg">TEKS PENGANTAR</div>
            <button aria-label="Close" className="p-2 rounded-lg hover:bg-white/20 transition-colors" onClick={onClose}>
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Pilih Teks Pengantar</label>
              <select
                value={form.template}
                onChange={(e) => updateTemplate(e.target.value as IntroTemplate)}
                className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="Formal">Formal</option>
                <option value="Casual">Casual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Isi Teks Pengantar</label>
              <textarea
                value={form.content}
                onChange={(e) => updateContent(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border px-3 sm:px-4 py-2 sm:py-3 text-sm md:text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                placeholder="Tulis teks pengantar di sini"
              />
              <p className="mt-2 text-xs text-text/60">Note: Jangan menghapus token seperti {`{nama}`}, {`{link-undangan}`}, {`{mempelai}`}</p>
            </div>

            <div className="flex items-center justify-end pt-3 sm:pt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2 sm:py-3 text-white text-sm md:text-base font-medium shadow-sm hover:opacity-90 transition-opacity min-h-[40px] sm:min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
