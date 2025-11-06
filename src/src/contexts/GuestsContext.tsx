/**
 * Guests Context
 * Preloads and shares guests data across the app to avoid repeated backend calls.
 * - Fetches once after authentication
 * - Exposes guests list, derived stats, and a refresh method
 * - Designed to be consumed by Dashboard, Reception, and other pages
 */
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from './AuthContext';

import { Guest } from '../../shared/types';
import { apiUrl } from '../lib/api';

export type GuestDoc = Guest;

interface GuestsStats {
  total: number;
  vip: number;
  regular: number;
  nonRegular: number;
  plusOne: number;
  totalWithPlusOne: number;
  checkedIn: number;
  tamuTambahan: number; // Non-invited guests
  invitedGuests: number; // Invited guests only
}

interface GuestsContextValue {
  guests: GuestDoc[];
  allGuests: GuestDoc[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setGuests: (updater: (prev: GuestDoc[]) => GuestDoc[]) => void;
  stats: GuestsStats;
}

const GuestsContext = createContext<GuestsContextValue | undefined>(undefined);

export const GuestsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, apiRequest } = useAuth();

  // Fetch invited guests
  const { data: invitedGuestsData, error: invitedError, isLoading: invitedLoading, mutate: mutateInvited } = useSWR(
    user ? apiUrl(`/api/guests?isInvited=true`) : null,
      async (url: string) => {
        const res = await apiRequest(url);
        if (!res.ok) throw new Error('Failed to fetch invited guests');
        const json = await res.json();
        return json?.data || [];
      },
      {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        keepPreviousData: false,
        dedupingInterval: 2000,
        revalidateOnMount: true,
        refreshInterval: 3000,
      }
    );

  // Fetch non-invited guests (tamu tambahan)
  const { data: nonInvitedGuestsData, error: nonInvitedError, isLoading: nonInvitedLoading, mutate: mutateNonInvited } = useSWR(
    user ? apiUrl(`/api/guests?isInvited=false`) : null,
      async (url: string) => {
        const res = await apiRequest(url);
        if (!res.ok) throw new Error('Failed to fetch non-invited guests');
        const json = await res.json();
        return json?.data || [];
      },
      {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        keepPreviousData: false,
        dedupingInterval: 2000,
        revalidateOnMount: true,
        refreshInterval: 3000,
      }
    );



  // Ensure initial load once after login and refresh when user changes
  useEffect(() => {
    if (user && !invitedLoading && !nonInvitedLoading) {
      console.log(`[GuestsContext] User changed to ${user.id}, refreshing guests data`);
      mutateInvited();
      mutateNonInvited();
    }
  }, [user?.id, invitedLoading, nonInvitedLoading, mutateInvited, mutateNonInvited]);

  // Listen for refresh events from check-in operations
  useEffect(() => {
    const handleRefreshGuests = () => {
      console.log('Refreshing guests data due to check-in event');
      // Force immediate refresh for both invited and non-invited guests
      mutateInvited(undefined, { revalidate: true });
      mutateNonInvited(undefined, { revalidate: true });
    };

    window.addEventListener('refreshGuests', handleRefreshGuests);
    return () => window.removeEventListener('refreshGuests', handleRefreshGuests);
  }, [mutateInvited, mutateNonInvited]);

  // Enable real-time updates via WebSocket
  useEffect(() => {
    if (!user) {
      console.log('[GuestsContext] No user found, skipping WebSocket connection');
      return;
    }

    console.log('[GuestsContext] Setting up WebSocket connection for user:', user.id);

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isConnecting = false;

    const connectWebSocket = () => {
      if (isConnecting || ws?.readyState === WebSocket.OPEN) {
        console.log('[GuestsContext] WebSocket already connected or connecting, skipping');
        return;
      }

      try {
        isConnecting = true;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/__ws/guests`;

        console.log('[GuestsContext] Creating WebSocket connection to:', wsUrl);

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[GuestsContext] WebSocket connected successfully');
          isConnecting = false;
          ws?.send(JSON.stringify({ type: 'subscribe', channel: 'guests' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[GuestsContext] WebSocket message received:', data);

            if (data.type === 'guest_updated' || data.type === 'guest_checked_in' || data.type === 'guest_checkin_cleared') {
              console.log('[GuestsContext] Guest update detected, refreshing data...');
              // Force immediate refresh for both invited and non-invited guests
              mutateInvited(undefined, { revalidate: true });
              mutateNonInvited(undefined, { revalidate: true });
            }
          } catch (error) {
            console.error('[GuestsContext] Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[GuestsContext] WebSocket error:', error);
          isConnecting = false;
        };

        ws.onclose = () => {
          console.log('[GuestsContext] WebSocket disconnected');
          ws = null;
          isConnecting = false;

          // Attempt to reconnect after 3 seconds
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = setTimeout(() => {
            console.log('[GuestsContext] Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        };

      } catch (error) {
        console.error('[GuestsContext] Error connecting WebSocket:', error);
        isConnecting = false;
      }
    };

    // Initial connection with delay
    const initialTimeout = setTimeout(() => {
      console.log('[GuestsContext] Starting initial WebSocket connection...');
      connectWebSocket();
    }, 1000);

    return () => {
      console.log('[GuestsContext] Cleaning up WebSocket connection');

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }

      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [user?.id, mutateInvited, mutateNonInvited]);

  // Combine invited and non-invited guests
  const invitedGuests = useMemo(() => invitedGuestsData || [], [invitedGuestsData]);
  const nonInvitedGuests = useMemo(() => nonInvitedGuestsData || [], [nonInvitedGuestsData]);
  const allGuests = useMemo(() => [...invitedGuests, ...nonInvitedGuests], [invitedGuests, nonInvitedGuests]);

  // For manage guests page, only show invited guests
  const guests: GuestDoc[] = invitedGuests;

  const stats: GuestsStats = useMemo(() => {
    const invitedGuestsCount = invitedGuests.length;
    const tamuTambahanCount = nonInvitedGuests.length;
    const total = invitedGuestsCount + tamuTambahanCount;

    const vip = invitedGuests.filter(g => (g.category || '').toLowerCase() === 'vip').length;
    const nonRegular = invitedGuests.filter(g => (g.category || '').toLowerCase() === 'non-regular').length;
    const regular = Math.max(0, invitedGuestsCount - vip - nonRegular);
    const plusOne = invitedGuests.filter(g => !!g.plusOne).length;
    const checkedIn = allGuests.filter(g => !!g.checkInDate).length;

    return {
      total,
      vip,
      regular,
      nonRegular,
      plusOne,
      totalWithPlusOne: invitedGuestsCount + plusOne,
      checkedIn,
      tamuTambahan: tamuTambahanCount,
      invitedGuests: invitedGuestsCount,
    };
  }, [invitedGuests, nonInvitedGuests, allGuests]);

  const refresh = async () => {
    console.log('Refreshing guests data...');
    await Promise.all([mutateInvited(), mutateNonInvited()]);
    // Force a small delay to ensure data is updated
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const setGuests = (updater: (prev: GuestDoc[]) => GuestDoc[]) => {
    // Update both invited and non-invited guests
    const updatedGuests = updater(allGuests);
    const invited = updatedGuests.filter(g => g.isInvited !== false);
    const nonInvited = updatedGuests.filter(g => g.isInvited === false);

    mutateInvited(invited, { revalidate: false });
    mutateNonInvited(nonInvited, { revalidate: false });
  };

  const value: GuestsContextValue = {
    guests, // Invited guests only (for manage guests page)
    allGuests, // All guests including non-invited (for reception and other pages)
    loading: !!user && ((invitedLoading || nonInvitedLoading) && !guests),
    error: invitedError || nonInvitedError ? ((invitedError?.message || nonInvitedError?.message) || 'Failed to load guests') : null,
    refresh,
    setGuests,
    stats,
  };

  return <GuestsContext.Provider value={value}>{children}</GuestsContext.Provider>;
};

export const useGuests = (): GuestsContextValue => {
  const ctx = useContext(GuestsContext);
  if (!ctx) throw new Error('useGuests must be used within GuestsProvider');
  return ctx;
};