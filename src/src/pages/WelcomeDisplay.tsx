/**
 * Welcome Display Page
 * Full-screen welcome display for wedding guests
 * Shows welcome message and switches to guest-specific welcome when someone checks in
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useRealtimeGuests } from '../hooks/useRealtimeGuests';
import { apiUrl } from '../lib/api';
import { usePhoto } from "../contexts/PhotoProvider";
import { useAccount } from '../hooks/useAccount';

const fetcher = (url: string) => {
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json());
};

function getYoutubeEmbedUrl(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    let videoId: string | null = null;

    if (url.hostname.includes('youtu.be')) {
      // https://youtu.be/VIDEOID
      videoId = url.pathname.slice(1);
    } else if (url.hostname.includes('youtube.com')) {
      // https://www.youtube.com/watch?v=VIDEOID
      videoId = url.searchParams.get('v');

      // https://www.youtube.com/embed/VIDEOID
      if (!videoId && url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2] || null;
      }
    }

    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}


function WelcomeDisplay(): JSX.Element {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const [currentGuest, setCurrentGuest] = useState<{ name: string; checkInDate: string } | null>(null);
  const [mutateKey, setMutateKey] = useState(0);
  const { photoUrl, dashboardUrl, welcomeUrl } = usePhoto();
  const { account } = useAccount();

  const { data: recentCheckinsData, error: checkinsError, mutate: mutateCheckins } = useSWR(
    [apiUrl(`/api/welcome-display/guests/recent-checkins?timeframe=30`), mutateKey],
    ([url]) => fetcher(url),
    { refreshInterval: 2000, revalidateOnFocus: true, revalidateOnReconnect: true }
  );

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
      setIsFullscreen(true);
    };

    // Enter fullscreen after 1 second
    const timer = setTimeout(enterFullscreen, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle guest check-in detection
  useEffect(() => {
    const guests = recentCheckinsData?.guests || [];
    console.log(`[WelcomeDisplay] Checking for recent check-ins: ${guests.length} guests found`);
    console.log(`[WelcomeDisplay] Recent checkins data:`, recentCheckinsData);

    if (guests.length > 0) {
      const recentGuest = guests[0];
      console.log(`[WelcomeDisplay] Most recent guest: ${recentGuest.name}, check-in: ${recentGuest.checkInDate}`);

      // Check if this is a new check-in (within last 5 minutes to account for timezone differences)
      const checkInTime = new Date(recentGuest.checkInDate).getTime();
      const now = Date.now();
      const timeDiff = now - checkInTime;

      console.log(`[WelcomeDisplay] Time difference: ${timeDiff}ms (${Math.floor(timeDiff / 1000)} seconds)`);

      if (timeDiff < 300000) { // Within 5 minutes (increased from 30 seconds)
        console.log(`[WelcomeDisplay] New check-in detected! Showing welcome for ${recentGuest.name}`);
        setCurrentGuest(recentGuest);
        setShowGuestWelcome(true);

        // Hide guest welcome after 5 seconds
        const hideTimer = setTimeout(() => {
          console.log('[WelcomeDisplay] Hiding guest welcome message');
          setShowGuestWelcome(false);
          setCurrentGuest(null);
        }, 5000);

        return () => clearTimeout(hideTimer);
      } else {
        console.log(`[WelcomeDisplay] Check-in is too old (${Math.floor(timeDiff / 1000)} seconds), ignoring`);
      }
    }
  }, [recentCheckinsData]);

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    window.history.back();
  };

  const recentCheckins = recentCheckinsData?.guests || [];

  const youtubeEmbedUrl = React.useMemo(
    () => getYoutubeEmbedUrl(account?.youtubeUrl),
    [account?.youtubeUrl]
  );

  // Add real-time guest updates
  useRealtimeGuests(() => {
    console.log('[WelcomeDisplay] Real-time guest update detected, refreshing data...');
    // Force refresh by updating a key that triggers re-render
    setMutateKey(prev => prev + 1);

    mutateCheckins();
  });


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,247,0.1),transparent_70%)]"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl mx-auto">
        {!showGuestWelcome ? (
          // Default Welcome Message
          <div className="animate-fade-in">
            <div className="mb-8">
              {youtubeEmbedUrl ? (
                <div className="relative w-96 h-64 mx-auto mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
                  <iframe
                    src={`${youtubeEmbedUrl}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0`}
                    title="Wedding video"
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={welcomeUrl}
                  alt="Wedding"
                  className="w-96 h-64 object-cover rounded-2xl shadow-2xl mx-auto mb-8 border-4 border-white/50"
                />
              )}
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-text mb-4">
              {account?.welcomeText || 'Welcome'}
            </h1>

            <h2 className="text-4xl md:text-6xl font-light text-primary mb-6">
              {account?.title || 'Our Wedding'}
            </h2>

            <div className="text-xl md:text-2xl text-text/70 space-y-2">
              <p>{account?.dateTime ? new Date(account.dateTime).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Date TBD'}</p>
              <p>{account?.location || 'Location TBD'}</p>
            </div>
          </div>
        ) : (
          // Guest-Specific Welcome Message
          <div className="animate-fade-in">
            <div className="mb-8">
              {youtubeEmbedUrl ? (
                <div className="relative w-96 h-64 mx-auto mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
                  <iframe
                    src={`${youtubeEmbedUrl}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0`}
                    title="Wedding video"
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={welcomeUrl}
                  alt="Welcome Guest"
                  className="w-96 h-64 object-cover rounded-2xl shadow-2xl mx-auto mb-8 border-4 border-white/50"
                />
              )}
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-text mb-4">
              {account?.welcomeText || 'Welcome'}
            </h1>

            <h2 className="text-4xl md:text-6xl font-light text-primary mb-6">
              {currentGuest?.name}
            </h2>

            <p className="text-xl md:text-2xl text-text/70">
              Thank you for joining us!
            </p>
          </div>
        )}
      </div>

      {/* Exit Button */}
      <button
        onClick={handleExit}
        className="absolute top-8 right-8 z-20 px-6 py-3 bg-white/90 backdrop-blur-sm text-text rounded-full shadow-lg hover:bg-white transition-all duration-300 font-medium"
      >
        Exit Fullscreen
      </button>

      {/* Recent Check-ins Counter (for debugging) */}
      {recentCheckins.length > 0 && (
        <div className="absolute bottom-8 left-8 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-text/70">
          Recent check-ins: {recentCheckins.length}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}

export default WelcomeDisplay;