import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSWR from 'swr';
import { apiUrl } from '../lib/api';
import Confetti from 'react-confetti';
import { usePhoto } from "../contexts/PhotoProvider";

type CheckedInGuest = {
  id: string;
  name: string;
  code?: string;
  category?: string;
  session?: string;
  tableNo?: string;
  phone?: string;
};

const fetcher = (url: string, apiRequest: (url: string) => Promise<Response>) =>
  apiRequest(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

export function DoorprizePicker(): JSX.Element {
  const { apiRequest } = useAuth();
  const { data } = useSWR<{ items: CheckedInGuest[] }>(
    'doorprize-checked-in',
    () => fetcher(apiUrl(`/api/doorprize/checked-in`), apiRequest)
  );
  const guests = data?.items ?? [];

  const [running, setRunning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const spinTimeoutRef = useRef<number | null>(null);
  const modalTimeoutRef = useRef<number | null>(null);
  const { photoUrl, dashboardUrl, welcomeUrl } = usePhoto();

  // ukuran window untuk confetti
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (typeof window === 'undefined') return;
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle fullscreen mode
  useEffect(() => {
    const enterFullscreen = () => {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    };

    // Enter fullscreen after 1 second
    const timer = setTimeout(enterFullscreen, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    window.history.back();
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    const last4 = cleaned.slice(-4);
    return `•••• ${last4}`; // hanya 4 digit terakhir yg kelihatan
  };

  // --------- RANDOM PICKER DENGAN PERLAMBATAN ---------
  const startSpin = () => {
    if (running || guests.length === 0) return;

    setRunning(true);
    setWinnerIdx(null);
    setShowWinnerModal(false); // pastikan modal lama tertutup

    const winnerIndex = Math.floor(Math.random() * guests.length);

    const totalSteps = 50 + Math.floor(Math.random() * 40); // 50–89 pergantian
    const minDelay = 90;
    const maxDelay = 320;

    let step = 0;

    const runStep = () => {
      const progress = step / totalSteps;
      const delay =
        minDelay + (maxDelay - minDelay) * Math.pow(progress, 2); // ease-out

      const idx =
        step < totalSteps
          ? Math.floor(Math.random() * guests.length)
          : winnerIndex;

      setCurrentIdx(idx);
      step++;

      if (step <= totalSteps) {
        spinTimeoutRef.current = window.setTimeout(runStep, delay);
      } else {
        setRunning(false);
        setWinnerIdx(winnerIndex);

        // beberapa detik setelah confetti, baru tampil modal
        modalTimeoutRef.current = window.setTimeout(() => {
          setShowWinnerModal(true);
        }, 2500); // 2.5 detik
      }
    };

    runStep();
  };

  const reset = () => {
    if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    if (modalTimeoutRef.current) window.clearTimeout(modalTimeoutRef.current);
    setRunning(false);
    setWinnerIdx(null);
    setCurrentIdx(null);
    setShowWinnerModal(false);
  };

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
      if (modalTimeoutRef.current) window.clearTimeout(modalTimeoutRef.current);
    };
  }, []);

  let displayedGuest: CheckedInGuest | null = null;
  if (running && currentIdx !== null) {
    displayedGuest = guests[currentIdx] ?? null;
  } else if (!running && winnerIdx !== null) {
    displayedGuest = guests[winnerIdx] ?? null;
  }

  const title = 'DOORPRIZE PICKER';
  const description =
    'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy.';

  const buttonLabel =
    guests.length === 0
      ? 'No guests'
      : running
        ? 'Picking...'
        : winnerIdx === null
          ? 'Start to play!'
          : 'Repeat';

  const buttonDisabled = running || guests.length === 0;

  const winner = winnerIdx !== null ? guests[winnerIdx] : null;

  return (
    <>
      {/* layer utama fullscreen */}
      <div className="absolute inset-0 w-screen h-screen flex items-center justify-center bg-black text-white">
        {/* background image */}
        <div className="absolute inset-0">
          <img
            src={photoUrl} // ganti dengan gambar kamu
            alt="Doorprize background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* konten tengah */}
        <div className="relative z-10 text-center px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-wide mb-4 md:mb-5">
            {title}
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base text-gray-100/90 leading-relaxed mb-10 md:mb-12">
            {description}
          </p>

          <div className="mb-3 md:mb-4 text-sm md:text-base tracking-wide text-gray-100">
            Congratulations,
          </div>

          <div className="mb-2 md:mb-3 text-3xl md:text-5xl lg:text-6xl font-extrabold">
            {displayedGuest ? `${displayedGuest.name}` : 'Guest Name'}
          </div>

          <div className="mb-10 md:mb-12 text-sm md:text-base text-gray-100/90">
            {displayedGuest ? (
              <>
                {displayedGuest.category && `| Kategori ${displayedGuest.category}`}
                {displayedGuest.session && ` | Sesi ${displayedGuest.session}`}
                {displayedGuest.tableNo && ` | No. Meja ${displayedGuest.tableNo}`}
              </>
            ) : (
              'Kategori | Sesi | No. Meja'
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={startSpin}
                disabled={buttonDisabled}
                className={`px-10 py-3 md:px-14 md:py-4 rounded-full text-sm md:text-lg font-semibold shadow-lg transition
                ${buttonDisabled
                    ? 'bg-blue-400/70 cursor-not-allowed'
                    : 'bg-blue-600'
                  }`}
              >
                {buttonLabel}
              </button>
              {
                winnerIdx !== null && (
                  <button
                    onClick={handleExit}
                    disabled={buttonDisabled}
                    className={`px-10 py-3 md:px-14 md:py-4 rounded-full text-sm md:text-lg font-semibold shadow-lg transition
                ${buttonDisabled
                        ? 'bg-blue-400/70 cursor-not-allowed'
                        : 'bg-white text-black'
                      }`}
                  >
                    Done
                  </button>
                )}
            </div>

            <button
              onClick={reset}
              className="text-xs md:text-sm text-gray-100/80 underline underline-offset-4 mt-1"
            >
              Reset
            </button>

            <div className="text-[11px] md:text-xs text-gray-100/80 mt-2">
              Participants: {guests.length}
            </div>
          </div>
        </div>
        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="absolute top-8 right-8 z-20 px-6 py-3 bg-white/90 backdrop-blur-sm text-text rounded-full shadow-lg hover:bg-white transition-all duration-300 font-medium"
        >
          Exit Fullscreen
        </button>
      </div>

      {/* CONFETTI: muncul ketika sudah ada pemenang */}
      {winnerIdx !== null && windowSize.width > 0 && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={600}
            gravity={0.3}
          />
        </div>
      )}

      {/* MODAL INFO PEMENANG */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 md:p-8 text-gray-900">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="text-xl md:text-2xl font-bold">
                Pemenang Doorprize
              </h2>
            </div>

            <div className="space-y-3 text-sm md:text-base">
              <div className="flex justify-between gap-4">
                <span className="font-medium">Nama</span>
                <span className="text-right">{winner.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">Kategori</span>
                <span className="text-right">
                  {winner.category ?? '-'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">Sesi</span>
                <span className="text-right">
                  {winner.session ?? '-'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">No. Meja</span>
                <span className="text-right">
                  {winner.tableNo ?? '-'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">No. HP</span>
                <span className="text-right">
                  {maskPhone(winner.phone)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                onClick={() => setShowWinnerModal(false)}
              >
                Tutup
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                onClick={() => {
                  setShowWinnerModal(false);
                  startSpin();
                }}
              >
                Spin lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
