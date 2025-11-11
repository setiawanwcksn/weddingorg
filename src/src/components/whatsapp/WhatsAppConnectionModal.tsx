/**
 * WhatsApp Connection Modal Component (fixed)
 * - Render QR string -> QR code (react-qr-code)
 * - Sinkron dengan WS backend: /api/whatsapp/ws
 * - Start session via GET /api/whatsapp/connect
 */
import React, { useState, useEffect, useRef } from 'react'
import { X, QrCode, Smartphone, AlertCircle } from 'lucide-react'
import QRCode from 'react-qr-code'
import { getApiUrl, getAuthHeaders, handleApiResponse } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppConnectionModalProps {
  open: boolean
  onClose: () => void
  onConnected: () => void
}

type ConnStatus = 'idle' | 'connecting' | 'qr_ready' | 'connected' | 'failed'

export const WhatsAppConnectionModal: React.FC<WhatsAppConnectionModalProps> = ({
  open,
  onClose,
  onConnected,
}) => {
  const [qrString, setQrString] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<ConnStatus>('idle')
  const [attempts, setAttempts] = useState(0)
  const maxRetries = 3
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null)

  // helper: buat URL WS sesuai origin
  const makeWsUrl = React.useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const params = new URLSearchParams()

    if (user?.id) params.set('userId', String(user.id))   // <— kirim userId ke backend

    // kalau kamu punya token JWT yang tidak ada di cookie dan ingin kirim juga:
    // const token = auth?.token
    // if (token) params.set('access_token', token)

    const qs = params.toString()
    return `${protocol}//${window.location.host}/api/whatsapp/ws${qs ? `?${qs}` : ''}`
  }, [user?.id])

  const connectWs = () => {
    const url = makeWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close()
        setConnectionStatus('failed')
      }
    }, 30000)

    ws.onopen = () => {
      clearTimeout(timeout)
      setConnectionStatus('connecting')
      // (tidak perlu kirim "start_whatsapp_session", backend kita tidak menanganinya)
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        // Backend mengirim: { type: 'qr', value: string } dan { type: 'status', value: ... }
        switch (data.type) {
          case 'qr':
            setQrString(data.value || '')
            setConnectionStatus('qr_ready')
            break
          case 'status': {
            const val = String(data.value || '')
            if (val === 'connected') {
              setConnectionStatus('connected')
              onConnected?.()
              // tutup modal sebentar lagi
              setTimeout(() => onClose?.(), 1200)
            } else if (val === 'connecting' || val.startsWith('disconnected')) {
              setConnectionStatus('connecting')
            } else if (val === 'qr') {
              setConnectionStatus('qr_ready')
            }
            break
          }
          default:
            // no-op
            break
        }
      } catch (err) {
        console.error('[WhatsApp Modal] JSON parse error:', err)
      }
    }

    ws.onerror = (e) => {
      console.error('[WhatsApp Modal] WS error:', e)
      clearTimeout(timeout)
      setConnectionStatus('failed')
      if (open && attempts < maxRetries) {
        const next = attempts + 1
        setAttempts(next)
        setTimeout(() => {
          if (open && ws.readyState === WebSocket.CLOSED) connectWs()
        }, 3000)
      }
    }

    ws.onclose = (ev) => {
      clearTimeout(timeout)
      if (open && !ev.wasClean && ev.code !== 1000) {
        setTimeout(() => {
          if (open) connectWs()
        }, 2000)
      }
    }
  }

  useEffect(() => {
    if (!open) return
    setAttempts(0)
    setConnectionStatus('idle')
    setQrString('')
    connectWs()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnectionStatus('idle')
      setQrString('')
      setAttempts(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleStart = async () => {
    try {
      setConnectionStatus('connecting')
      // panggil endpoint untuk inisialisasi WA + scheduler
      const res = await fetch('/api/whatsapp/connect', {
        headers: getAuthHeaders(user?.id),
      })
      if (!res.ok) throw new Error('connect failed')
      // setelah ini, WS akan mengirim status / qr sendiri
    } catch (e) {
      console.error('[WhatsApp Modal] connect error:', e)
      setConnectionStatus('failed')
    }
  }

  const handleRetry = () => {
    setConnectionStatus('idle')
    setQrString('')
    setAttempts(0)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // biarkan backend kirim update baru; optionally panggil connect lagi
      handleStart()
    } else {
      connectWs()
      handleStart()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Hubungkan WhatsApp</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
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
              <p className="text-text/70 text-sm mb-6">Klik tombol di bawah untuk memulai koneksi WhatsApp</p>
              <button
                onClick={handleStart}
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
              <p className="text-text/70 text-sm">Menyiapkan koneksi WhatsApp, mohon tunggu...</p>
            </div>
          )}

          {connectionStatus === 'qr_ready' && qrString && (
            <div className="text-center">

              {/* render QR dari string, bukan <img src="..."> */}
              <div className="bg-white p-4 rounded-lg border border-border mb-4 inline-block">
                <QRCode value={qrString} size={192} />
              </div>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-lg font-medium text-green-700 mb-2">Berhasil Terhubung!</h3>
              <p className="text-text/70 text-sm">WhatsApp Anda sekarang terhubung dan siap digunakan.</p>
            </div>
          )}

          {connectionStatus === 'failed' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-red-700 mb-2">Koneksi Gagal</h3>
              <p className="text-text/70 text-sm mb-6">Terjadi kesalahan saat menghubungkan WhatsApp. Silakan coba lagi.</p>
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
  )
}
