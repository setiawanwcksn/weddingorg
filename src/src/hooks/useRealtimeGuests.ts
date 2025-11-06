/**
 * Real-time Guest Updates Hook
 * Uses WebSocket to provide instant guest data synchronization across devices
 * Works independently without requiring GuestsContext
 */

import { useEffect, useRef } from 'react';

export const useRealtimeGuests = (onGuestUpdate?: () => void) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Use dedicated real-time guests WebSocket endpoint
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/__ws/guests`;
        
        console.log(`[useRealtimeGuests] Connecting to WebSocket (attempt ${reconnectAttemptsRef.current + 1}):`, wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useRealtimeGuests] WebSocket connected successfully');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
          
          // Subscribe to guest updates
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'guests' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[useRealtimeGuests] Received message:', data);
            
            if (data.type === 'guest_updated' || data.type === 'guest_checked_in' || data.type === 'guest_checkin_cleared') {
              console.log('[useRealtimeGuests] Guest update detected, triggering callback...');
              if (onGuestUpdate) {
                onGuestUpdate();
              }
            }
          } catch (error) {
            console.error('[useRealtimeGuests] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[useRealtimeGuests] WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log('[useRealtimeGuests] WebSocket disconnected:', event.code, event.reason);
          wsRef.current = null;
          
          // Attempt to reconnect after 5 seconds, but limit attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[useRealtimeGuests] Attempting to reconnect...');
              connectWebSocket();
            }, 5000);
          } else {
            console.warn('[useRealtimeGuests] Max reconnection attempts reached, giving up');
          }
        };

      } catch (error) {
        console.error('[useRealtimeGuests] Error connecting WebSocket:', error);
        reconnectAttemptsRef.current++;
        
        // Retry connection after delay
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('[useRealtimeGuests] Cleaning up WebSocket connection');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onGuestUpdate]);

  return null; // This hook doesn't return anything, it just handles real-time updates
};