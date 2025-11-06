/**
 * WhatsApp API Routes (WebSocket via @hono/node-ws)
 */
import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import type { WSContext } from 'hono/ws'


const app = new Hono()

// penting: ambil upgradeWebSocket dari createNodeWebSocket dengan app yang sama
const { upgradeWebSocket } = createNodeWebSocket({ app })

// Simpan state per koneksi
const connState = new WeakMap<WSContext<WebSocket>, { initialized: boolean; connected: boolean }>()

app.get(
  '/api/__ws',
  upgradeWebSocket((_c) => {
    return {
      onOpen(_evt, ws) {
        connState.set(ws, { initialized: true, connected: false })
        try {
          ws.send(JSON.stringify({ type: 'connected', message: 'WhatsApp WebSocket connected' }))
        } catch {}
      },

      onMessage(evt, ws) {
        try {
          const data = JSON.parse(String(evt.data))
          switch (data?.action) {
            case 'start_whatsapp_session':
              handleWhatsAppSession(ws)
              break
            case 'check_status': {
              const st = connState.get(ws)
              ws.send(JSON.stringify({ type: 'status', connected: !!st?.connected }))
              break
            }
            default:
              ws.send(JSON.stringify({ type: 'error', message: 'Unknown action' }))
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
        }
      },

      onClose(_evt, ws) {
        connState.delete(ws)
      },

      onError(_evt, ws) {
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'Connection error occurred' }))
        } catch {}
        connState.delete(ws)
      },
    }
  }),
)

// --- Helpers ---

function handleWhatsAppSession(ws: WSContext<WebSocket>){
  try {
    const qrCodeData = generateQRCode()
    ws.send(JSON.stringify({ type: 'qr_code', qrCode: qrCodeData }))

    // Simulasi tersambung setelah 30 detik
    setTimeout(() => {
      const st = connState.get(ws)
      if (st) st.connected = true
      try {
        ws.send(JSON.stringify({ type: 'connected', message: 'WhatsApp connected successfully' }))
      } catch {}
    }, 30_000)
  } catch {
    try {
      ws.send(JSON.stringify({ type: 'error', error: 'Failed to start WhatsApp session' }))
    } catch {}
  }
}

function generateQRCode(): string {
  // placeholder QR (base64 data URL)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

// REST endpoints (opsional, tetap sama seperti punyamu)
app.get('/status', async (c) => {
  return c.json({
    connected: false,
    status: 'disconnected',
    message: 'WhatsApp not connected',
  })
})

app.post('/disconnect', async (c) => {
  return c.json({ success: true, message: 'WhatsApp disconnected successfully' })
})

app.post('/send', async (c) => {
  try {
    const { phone, message } = await c.req.json()
    if (!phone || !message) {
      return c.json({ success: false, error: 'Phone number and message are required' }, 400)
    }
    // simulasi belum terhubung
    return c.json({ success: false, error: 'WhatsApp not connected' }, 400)
  } catch (error: any) {
    return c.json({ success: false, error: error?.message ?? 'Failed to send' }, 500)
  }
})

export default app
