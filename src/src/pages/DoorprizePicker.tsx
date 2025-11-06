import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSWR from 'swr';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../lib/api';

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

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0); // accumulated rotation degrees
  const [running, setRunning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // responsive wheel size: dynamic based on viewport
  const [wheelSize, setWheelSize] = useState(400);

  useEffect(() => {
    const updateSize = () => {
      const isMobile = window.innerWidth < 768;
      const maxSize = isMobile ? Math.min(window.innerWidth * 0.85, 320) : Math.min(window.innerHeight * 0.65, 500);
      setWheelSize(maxSize);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const count = Math.max(guests.length, 1);
  const anglePer = 360 / count;

  // prepare colors using Lavender Wedding theme
  const palette = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--primary-glow))'
  ];
  const gradient = Array.from({ length: count })
    .map((_, i) => `${palette[i % palette.length]} ${i * anglePer}deg ${(i + 1) * anglePer}deg`)
    .join(', ');

  // compute coordinates for label/ highlight given segment center angle
  const polarToPercent = (angleDeg: number, radiusPercent: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const x = 50 + radiusPercent * Math.cos(rad);
    const y = 50 + radiusPercent * Math.sin(rad);
    return { x, y };
  };

  // start spin: choose random winnerIndex, compute final rotation to align its center to pointer (top)
  const startSpin = () => {
    if (running || guests.length === 0) return;
    setRunning(true);
    setWinnerIdx(null);

    const winnerIndex = Math.floor(Math.random() * guests.length);
    const targetCenter = winnerIndex * anglePer + anglePer / 2; // degrees (0° at right)
    // spins for drama
    const spins = 6 + Math.floor(Math.random() * 6); // 6..11

    // Calculate the rotation needed to bring the target segment center to the top (0°)
    // We want: (currentRotation + additionalRotation + targetCenter) % 360 = 0
    // So: additionalRotation = (360 - targetCenter - currentRotation % 360) % 360
    // Then add full spins for dramatic effect
    const currentRotationMod = rotation % 360;
    const rotationToTarget = (360 - targetCenter - currentRotationMod + 360) % 360;
    const finalRotation = spins * 360 + rotationToTarget;

    // apply transform via style to enable CSS transition with pronounced ease-out deceleration
    requestAnimationFrame(() => {
      if (!wheelRef.current) return;
      wheelRef.current.style.transition = 'transform 5s cubic-bezier(0.05, 0.9, 0.2, 1)';
      wheelRef.current.style.transform = `rotate(${rotation + finalRotation}deg)`;
    });

    // on finish
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const newBase = (rotation + finalRotation) % 360;
      setRotation(newBase);
      setRunning(false);
      setWinnerIdx(winnerIndex);

      // remove transition to let immediate resets be instant
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
        wheelRef.current.style.transform = `rotate(${newBase}deg)`;
      }

      // Debug: log the winner and rotation info
      console.log(`Winner: ${guests[winnerIndex]?.name}, Index: ${winnerIndex}, Target Center: ${targetCenter}°, Final Rotation: ${finalRotation}°, New Base: ${newBase}°`);

      // Verify the winner by checking which segment is at the top
      const normalizedRotation = ((360 - newBase) + 360) % 360; // Ensure positive angle
      const segmentAtTop = Math.floor(normalizedRotation / anglePer) % count;
      console.log(`Segment at top: ${segmentAtTop}, Expected: ${winnerIndex}, Normalized Rotation: ${normalizedRotation}°`);

      // If mismatch, log warning and potentially fix
      if (segmentAtTop !== winnerIndex) {
        console.warn(`WINNER MISMATCH DETECTED! Pointer shows segment ${segmentAtTop} but modal shows ${winnerIndex}`);
      }
    }, 5200);
  };

  const reset = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setRunning(false);
    setWinnerIdx(null);
    setRotation(0);
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 600ms ease';
      wheelRef.current.style.transform = `rotate(0deg)`;
      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'none';
          // Ensure we're at exactly 0 degrees after reset
          wheelRef.current.style.transform = `rotate(0deg)`;
        }
      }, 650);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const maskPhone = (phone?: string) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return 'xxxx' + cleaned;
    return 'x'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center overflow-hidden p-4 md:p-6">
      {/* header */}
      <div className="absolute top-4 left-4 z-30 md:top-6 md:left-6">
        <Link to="/doorprize" className="px-3 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition inline-flex items-center gap-2 shadow-lg text-sm md:text-base">
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>
      <button
        onClick={() => window.history.back()}
        className="absolute top-4 right-4 z-30 px-3 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition shadow-lg text-sm md:text-base md:top-6 md:right-6"
      >
        Exit
      </button>

      <div className="relative z-20 flex flex-col items-center gap-4 md:gap-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800">DOORPRIZE</h1>
          <div className="text-sm md:text-base text-gray-600">Wheel of Fortune</div>
        </div>

        {/* ---------- WHEEL CONTAINER ---------- */}
        <div style={{ width: wheelSize, height: wheelSize }} className="relative">
          {/* POINTER NEEDLE - This indicates the winner */}
          <div className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none" style={{ top: wheelSize < 400 ? '-6px' : '-8px' }}>
            {/* Needle base */}
            <div className="relative">
              {/* Main needle - now points downward */}
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-lg" />

              {/* Needle highlight (lighter color) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[12px] border-l-transparent border-r-transparent border-t-red-400" />

              {/* Needle base circle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-700 rounded-full border-2 border-white shadow-lg" />
            </div>

          </div>

          {/* ROTATING WHEEL */}
          <div
            ref={wheelRef}
            className="rounded-full border-8 border-white shadow-2xl overflow-hidden"
            style={{
              width: '100%',
              height: '100%',
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: '50% 50%',
              willChange: 'transform',
              boxShadow: 'var(--shadow-elegant), inset 0 0 40px rgba(0,0,0,0.1)'
            }}
          >
            {/* CENTER HUB */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-white border-2 md:border-4 border-white"
              style={{
                width: wheelSize * 0.28,
                height: wheelSize * 0.28,
                background: 'hsl(var(--text))',
                boxShadow: '0 8px 30px rgba(0,0,0,0.45), inset 0 2px 10px rgba(255,255,255,0.1)',
              }}
            >
              <div style={{
                width: wheelSize * 0.15,
                height: wheelSize * 0.15,
                background: 'hsl(var(--primary))',
                borderRadius: '50%',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
              }} />
            </div>

            {/* LABELS: now INSIDE the rotating layer so they move with the wheel */}
            {/* Each label is rotated to its segment center, then counter-rotated so text stays upright */}
            {Array.from({ length: count }).map((_, i) => {
              const centerAngle = i * anglePer + anglePer / 2; // segment center angle
              const pos = polarToPercent(centerAngle, 38); // 38% radius
              const name = guests[i]?.name ?? `Option ${i + 1}`;
              const textRotate = centerAngle; // we rotate the wrapper by this
              const labelWidth = Math.min(140, wheelSize * 0.26);

              return (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: labelWidth,
                    transform: `translate(-50%,-50%) rotate(${textRotate}deg)`, // rotate with wheel
                    transformOrigin: 'center center',
                  }}
                >
                  {/* inner div counter-rotated so text upright */}
                  <div
                    style={{ transform: `rotate(${-textRotate}deg)` }}
                    className="text-xs md:text-sm lg:text-base font-bold text-white text-center drop-shadow-lg truncate"
                  >
                    {name.length > (wheelSize < 400 ? 12 : 18) ? name.slice(0, (wheelSize < 400 ? 11 : 17)) + '…' : name}
                  </div>
                </div>
              );
            })}
          </div>


        </div>
/* ---------- END WHEEL BLOCK ---------- */

        {/* controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={startSpin}
            disabled={running || guests.length === 0}
            className="px-6 py-3 md:px-12 md:py-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg md:text-xl shadow-2xl hover:scale-105 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? 'SPINNING...' : 'SPIN THE WHEEL'}
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={reset} className="px-3 py-2 md:px-4 md:py-2 rounded-full bg-gray-100 text-gray-700 border-2 border-gray-300 flex items-center gap-1 md:gap-2 hover:bg-gray-200 transition-colors shadow-md text-sm md:text-base">
              <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
              Reset
            </button>
            <div className="text-gray-600 font-medium text-sm md:text-base">Participants: {guests.length}</div>
          </div>
        </div>
      </div>

      {/* winner modal */}
      {winnerIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-6 pointer-events-none">
          <div className="w-full max-w-sm md:max-w-md mx-auto pointer-events-auto bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl text-center border-4 border-yellow-400">
            <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎉</div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800">Winner!</h3>
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{guests[winnerIdx].name}</div>
            <div className="text-base md:text-lg text-gray-600 mb-4 md:mb-6">{guests[winnerIdx].category ?? ''} {guests[winnerIdx].tableNo ? `• Table ${guests[winnerIdx].tableNo}` : ''}</div>
            <div className="flex gap-2 md:gap-3">
              <button className="flex-1 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors text-sm md:text-base" onClick={() => setWinnerIdx(null)}>Close</button>
              <button className="flex-1 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:scale-105 transition-transform text-sm md:text-base" onClick={() => { setWinnerIdx(null); setTimeout(() => startSpin(), 200); }}>Spin Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
