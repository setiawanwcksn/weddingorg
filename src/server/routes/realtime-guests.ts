/**
 * Real-time Guest Synchronization API (Node.js)
 * WebSocket endpoint for broadcasting guest updates across devices
 */
import { Hono, type Context } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'

const app = new Hono()

// penting: app harus sudah ada sebelum createNodeWebSocket
const { upgradeWebSocket } = createNodeWebSocket({ app })

// Simpan koneksi aktif per userId
const guestConnections = new Map<string, Set<any>>() // pakai any agar aman lintas impl WS

function getUserId(c: Context): string {
  const u = c.get('user') as any
  return u?.id ?? 'anonymous'
}

app.get(
  '/api/__ws/guests',
  upgradeWebSocket((c) => {
    const userId = getUserId(c)

    return {
      onOpen(_evt, ws) {
        const set = guestConnections.get(userId) ?? new Set<any>()
        set.add(ws)
        guestConnections.set(userId, set)

        try {
          ws.send(
            JSON.stringify({
              type: 'connected',
              message: 'Real-time guest updates connected',
            }),
          )
        } catch (_) {}
      },

      onMessage(evt, ws) {
        try {
          const data = JSON.parse(String(evt.data))
          if (data?.type === 'unsubscribe') {
            const set = guestConnections.get(userId)
            set?.delete(ws)
            if (set && set.size === 0) guestConnections.delete(userId)
            ws.send(JSON.stringify({ type: 'unsubscribed' }))
          } else if (data?.type === 'subscribe' && data?.channel === 'guests') {
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                channel: 'guests',
                message: 'Successfully subscribed to guest updates',
              }),
            )
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
        }
      },

      onClose(_evt, ws) {
        const set = guestConnections.get(userId)
        set?.delete(ws)
        if (set && set.size === 0) guestConnections.delete(userId)
      },

      onError(_evt, ws) {
        const set = guestConnections.get(userId)
        set?.delete(ws)
        if (set && set.size === 0) guestConnections.delete(userId)
      },
    }
  }),
)

// Helper untuk broadcast ke semua client milik user tertentu
export function broadcastGuestUpdate(
  type: 'guest_updated' | 'guest_checked_in' | 'guest_checkin_cleared',
  guestId: string,
  userId?: string,
) {
  const uid = userId ?? 'anonymous'
  const set = guestConnections.get(uid)
  if (!set) return

  const msg = JSON.stringify({ type, guestId, timestamp: new Date().toISOString() })
  let sent = 0

  for (const ws of Array.from(set)) {
    try {
      // OPEN bisa berbeda tergantung impl; fallback ke 1
      // @ts-ignore
      const OPEN = ws?.OPEN ?? 1
      if (ws?.readyState === OPEN || ws?.readyState === 1) {
        ws.send(msg)
        sent++
      } else {
        set.delete(ws)
      }
    } catch {
      set.delete(ws)
    }
  }

  if (set.size === 0) guestConnections.delete(uid)
  console.log(`[WS] broadcast ${type} guest=${guestId} user=${uid} sent=${sent}`)
}

export default app
