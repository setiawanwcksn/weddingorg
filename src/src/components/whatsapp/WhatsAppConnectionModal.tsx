/**
 * WhatsApp Connection Modal Component
 * Handles WhatsApp QR code authentication and session management
 */
import React, { useState, useEffect } from 'react';
import { X, QrCode, Smartphone, AlertCircle } from 'lucide-react';

interface WhatsAppConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export const WhatsAppConnectionModal: React.FC<WhatsAppConnectionModalProps> = ({
  open,
  onClose,
  onConnected
}) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'qr_ready' | 'connected' | 'failed'>('idle');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [maxRetries] = useState(3);

  useEffect(() => {
    if (!open) return;

    // Reset connection attempts when modal opens
    setConnectionAttempts(0);

    // Connect to WhatsApp WebSocket
    const connectWebSocket = () => {
      console.log('[WhatsApp Modal] Attempting WebSocket connection...');
      // Use the same protocol as the current page (http/https)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/__ws`;
      console.log(`[WhatsApp Modal] Connecting to: ${wsUrl}`);
      
      const websocket = new WebSocket(wsUrl);
      
      // Connection timeout (30 seconds)
      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          websocket.close();
          setConnectionStatus('failed');
        }
      }, 30000);
      
      websocket.onopen = () => {
        console.log('[WhatsApp Modal] WebSocket connected successfully');
        clearTimeout(connectionTimeout);
        setConnectionStatus('connecting');
        try {
          websocket.send(JSON.stringify({ action: 'start_whatsapp_session' }));
        } catch (error) {
          console.error('[WhatsApp Modal] Failed to send start session message:', error);
          setConnectionStatus('failed');
        }
      };

      websocket.onmessage = (event) => {
        console.log('[WhatsApp Modal] Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'qr_code':
              setQrCode(data.qrCode);
              setConnectionStatus('qr_ready');
              break;
            case 'connected':
              setConnectionStatus('connected');
              onConnected();
          setTimeout(() => {
            onClose();
          }, 2000);
          break;
              break;
            case 'error':
              setConnectionStatus('failed');
              console.error('WhatsApp connection error:', data.error);
              break;
            case 'disconnected':
              setConnectionStatus('idle');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('[WhatsApp Modal] WebSocket error:', error);
        clearTimeout(connectionTimeout);
        setConnectionStatus('failed');
        
        // Auto-retry logic with attempt counter
        if (open && connectionAttempts < maxRetries) {
          const newAttempts = connectionAttempts + 1;
          setConnectionAttempts(newAttempts);
          console.log(`[WhatsApp Modal] Retrying connection (attempt ${newAttempts}/${maxRetries})...`);
          
          setTimeout(() => {
            if (open && websocket.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 3000);
        } else if (connectionAttempts >= maxRetries) {
          console.error('[WhatsApp Modal] Max connection attempts reached');
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        clearTimeout(connectionTimeout);
        setConnectionStatus('idle');
        // Auto-retry if not manually closed and modal is still open
        if (!event.wasClean && event.code !== 1000 && open) {
          setTimeout(() => {
            if (open) {
              connectWebSocket();
            }
          }, 2000);
        }
      };

      setWs(websocket);
    };

    connectWebSocket();

    return () => {
      console.log('[WhatsApp Modal] Cleaning up WebSocket connection...');
      if (ws) {
        ws.close();
        setWs(null);
      }
      setConnectionStatus('idle');
      setQrCode('');
      setConnectionAttempts(0);
    };
  }, [open]);

  const handleRetry = () => {
    console.log('[WhatsApp Modal] Manual retry requested');
    setConnectionStatus('idle');
    setQrCode('');
    setConnectionAttempts(0);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ action: 'start_whatsapp_session' }));
      } catch (error) {
        console.error('[WhatsApp Modal] Failed to send retry message:', error);
        // If current connection is broken, create a new one
        if (ws) {
          ws.close();
        }
        setTimeout(() => {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/api/__ws`;
          const newWs = new WebSocket(wsUrl);
          setWs(newWs);
        }, 1000);
      }
    } else {
      // Create new connection if current one is closed
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/__ws`;
      const newWs = new WebSocket(wsUrl);
      setWs(newWs);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Hubungkan WhatsApp</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5 text-text/70" />
          </button>
        </div>

        <div className="p-6">
          {connectionStatus === 'idle' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text mb-2">Menghubungkan ke WhatsApp</h3>
              <p className="text-text/70 text-sm mb-6">
                Klik tombol di bawah untuk memulai koneksi WhatsApp
              </p>
              <button
                onClick={() => setConnectionStatus('connecting')}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Mulai Koneksi
              </button>
            </div>
          )}

          {connectionStatus === 'connecting' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text mb-2">Menghubungkan...</h3>
              <p className="text-text/70 text-sm">
                Menyiapkan koneksi WhatsApp, mohon tunggu...
              </p>
            </div>
          )}

          {connectionStatus === 'qr_ready' && qrCode && (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text mb-2">Scan QR Code</h3>
              <p className="text-text/70 text-sm mb-6">
                Gunakan WhatsApp Anda untuk memindai kode QR ini
              </p>
              <div className="bg-white p-4 rounded-lg border border-border mb-4">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-xs text-text/50">
                Kode QR akan diperbarui secara otomatis
              </p>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-lg font-medium text-green-700 mb-2">Berhasil Terhubung!</h3>
              <p className="text-text/70 text-sm">
                WhatsApp Anda sekarang terhubung dan siap digunakan.
              </p>
            </div>
          )}

          {connectionStatus === 'failed' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-red-700 mb-2">Koneksi Gagal</h3>
              <p className="text-text/70 text-sm mb-6">
                Terjadi kesalahan saat menghubungkan WhatsApp. Silakan coba lagi.
              </p>
              <button
                onClick={handleRetry}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};