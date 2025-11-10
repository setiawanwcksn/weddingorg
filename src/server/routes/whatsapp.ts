// src/server/routes/whatsapp.ts
import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  type ConnectionState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'node:fs'
import { db } from '../db.js'
import { renderMessage } from '../utils/renderMessage.js'

type UpgradeWS = ReturnType<typeof createNodeWebSocket>['upgradeWebSocket']

// ───────────────────────────────
// Global state (level atas file) ✔
// ───────────────────────────────
const AUTH_DIR = process.env.WA_AUTH_DIR ?? '/app/auth'
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' })

let sockRef: ReturnType<typeof makeWASocket> | null = null
let waReady = false
let latestQR: string | null = null
let latestStatus = 'idle'
let _sendText: ((phoneE164: string, text: string) => Promise<void>) | null = null
let _ensuring = false

// WS clients (untuk broadcast status/QR)
const wsClients = new Set<any>()
const broadcast = (payload: any) => {
  const msg = JSON.stringify(payload)
  for (const ws of wsClients) {
    try { ws.send(msg) } catch { }
  }
}
const setStatus = (s: string) => {
  latestStatus = s
  broadcast({ type: 'status', value: s })
}

// Helpers
function wipeAuthFolder() {
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    fs.mkdirSync(AUTH_DIR, { recursive: true })
    logger.warn({ AUTH_DIR }, '[wa] wiped auth folder and recreated it')
  } catch (e) {
    logger.error({ e }, '[wa] failed wiping auth')
  }
}

// ───────────────────────────────
// ensureWA(): inisialisasi Baileys ✔
// ───────────────────────────────
async function ensureWA() {
  if (_ensuring) return
  _ensuring = true
  try {
    if (sockRef && _sendText) return

    fs.mkdirSync(AUTH_DIR, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()
    logger.info({ version }, '[wa] using WA Web version')

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: process.env.NODE_ENV !== 'production',
      logger,
      getMessage: async () => undefined,
      browser: Browsers.macOS('Google Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    })
    sockRef = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (u: Partial<ConnectionState> & { qr?: string }) => {
      const { connection, lastDisconnect, qr } = u

      if (qr) {
        latestQR = qr
        setStatus('qr')
        broadcast({ type: 'qr', value: qr })
      }
      if (connection === 'connecting') setStatus('connecting')
      if (connection === 'open') {
        waReady = true
        latestQR = null
        setStatus('connected')
      }
      if (connection === 'close') {
        waReady = false
        const code = (lastDisconnect as any)?.error?.output?.statusCode
        const msg = (lastDisconnect as any)?.error?.message
        const isLoggedOut = code === DisconnectReason.loggedOut
        setStatus('disconnected' + (code ? `:${code}` : ''))
        logger.warn({ code, msg }, '[wa] connection closed')

        if (isLoggedOut) wipeAuthFolder()

        setTimeout(() => {
          sockRef = null
          _sendText = null
          ensureWA().catch(() => { })
        }, isLoggedOut ? 1500 : 2500)
      }
    })

    _sendText = async (phoneE164: string, text: string) => {
      const numeric = phoneE164.replace(/[^\d]/g, '')
      const jid = `${numeric}@s.whatsapp.net`
      await sock.sendMessage(jid, { text })
    }
  } finally {
    _ensuring = false
  }
}

// ───────────────────────────────
// Scheduler untuk 94884219_reminders ✔
//  - tahan dua tipe scheduledAt: string ISO & Date
// ───────────────────────────────
let schedulerStarted = false
let isTicking = false
let schedulerTimer: NodeJS.Timeout | null = null
const workerId = `${process.env.HOSTNAME || 'host'}-pid${process.pid}-${Math.random().toString(36).slice(2, 8)}`

function dueFilter(now: Date) {
  return {
    status: 'pending',
    $or: [
      // scheduledAt bertipe Date
      { scheduledAt: { $type: 'date', $lte: now } },
      // scheduledAt string ISO → cast ke Date lalu bandingkan
      {
        $and: [
          { scheduledAt: { $type: 'string' } },
          { $expr: { $lte: [{ $toDate: '$scheduledAt' }, now] } },
        ],
      },
    ],
  }
}

async function claimOneDue() {
  const now = new Date()
  const job = await db.collection('94884219_reminders').findOneAndUpdate(
    dueFilter(now),
    { $set: { status: 'processing', updatedAt: now, claimedBy: workerId }, $inc: { attempts: 1 } },
    { sort: { scheduledAt: 1 }, returnDocument: 'after' } // v6: returns doc directly
  )
  return job || null
}

async function markSent(id: any) {
  await db.collection('94884219_reminders').updateOne(
    { _id: id },
    { $set: { status: 'sent', updatedAt: new Date() } }
  )
}

async function markFailed(id: any, err: string) {
  await db.collection('94884219_reminders').updateOne(
    { _id: id },
    { $set: { status: 'failed', lastError: String(err).slice(0, 500), updatedAt: new Date() } }
  )
}

async function startScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  if (schedulerTimer) clearInterval(schedulerTimer)
  console.log('[scheduler] started (94884219_reminders) worker:', workerId)

  schedulerTimer = setInterval(async () => {
    if (isTicking) return
    isTicking = true
    try {
      // cek readiness TANPA keluar dari try/finally
      if (!waReady || !_sendText) {
        // optional: log tipis agar kelihatan hidup
        console.log('[scheduler] waiting: waReady=%s', waReady)
        return
      }

      // Requeue stuck (>5 menit)
      const cutoff = new Date(Date.now() - 5 * 60 * 1000)
      const requeued = await db.collection('94884219_reminders').updateMany(
        { status: 'processing', updatedAt: { $lte: cutoff } },
        { $set: { status: 'pending' } }
      )
      if (requeued.modifiedCount > 0) {
        console.log('[scheduler] requeued stuck jobs:', requeued.modifiedCount)
      }

      // Hitung due
      const now = new Date()
      const dueCount = await db.collection('94884219_reminders').countDocuments(dueFilter(now))
      if (dueCount > 0) console.log('[scheduler] due pending:', dueCount)

      // Proses batch
      for (let i = 0; i < 15; i++) {
        const job = await claimOneDue()
        if (!job) break

        try {
          const text = await renderMessage(job.message, job)
          await _sendText!(job.phone, text)
          await markSent(job._id)
          console.log('[scheduler] sent', job.phone, job.type)
          await new Promise(r => setTimeout(r, 500 + Math.random() * 800))
        } catch (e: any) {
          console.error('[scheduler] failed', job.phone, e?.message)
          await markFailed(job._id, e?.message ?? String(e))
        }
      }
    } catch (err) {
      console.error('[scheduler] error:', err)
    } finally {
      isTicking = false          // ✅ selalu dilepas
    }
  }, 3000)

}

// ───────────────────────────────
// 🔥 Export untuk auto-start di server.ts
// ───────────────────────────────
export async function startWhatsApp() {
  console.log('[boot] initializing WhatsApp...')
  try {
    await ensureWA()
    await startScheduler()
    console.log('[boot] WhatsApp connected & scheduler started ✅')
  } catch (err) {
    console.error('[boot] Failed starting WhatsApp:', err)
  }
}

// ───────────────────────────────
// Router builder (default export) ✔
// ───────────────────────────────
export default function whatsAppRoutes({ upgradeWebSocket }: { upgradeWebSocket: UpgradeWS }) {
  const app = new Hono()

  // HTTP
  app.get('/status', (c) => c.json({ status: latestStatus, ready: waReady, hasQR: !!latestQR }))

  app.get('/connect', async (c) => {
    await ensureWA()
    await startScheduler()
    return c.json({ ok: true })
  })

  app.post('/send-now', async (c) => {
    try {
      if (!waReady || !_sendText) return c.json({ ok: false, error: 'wa not ready' }, 400)
      const { phoneE164, message } = await c.req.json()
      await _sendText(phoneE164, message)
      return c.json({ ok: true })
    } catch (e: any) {
      return c.json({ ok: false, error: e?.message ?? String(e) }, 500)
    }
  })

  // (Opsional) create reminder dari API ini (langsung ke 94884219_reminders)
  app.post('/schedule', async (c) => {
    const body = await c.req.json()
    await db.collection('94884219_reminders').insertOne({
      guestId: body.guestId ?? null,
      guestName: body.guestName ?? body.name ?? '',
      phone: body.phone,
      message: body.message,
      scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : new Date(body.scheduledAt).toISOString(),
      type: body.type ?? 'reminder',
      accountId: body.accountId ?? null,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return c.json({ ok: true })
  })

  app.get('/pair', async (c) => {
    const phone = c.req.query('phone') // 628xx tanpa '+'
    if (!phone) return c.json({ ok: false, error: 'phone required' }, 400)
    await ensureWA()
    if (!sockRef) return c.json({ ok: false, error: 'socket not ready' }, 500)
    try {
      const code = await sockRef.requestPairingCode(phone)
      broadcast({ type: 'pairingCode', value: code })
      return c.json({ ok: true, code })
    } catch (e: any) {
      logger.error({ e }, '[wa] pairing code error')
      return c.json({ ok: false, error: e?.message ?? String(e) }, 500)
    }
  })

  // WebSocket: kirim status & QR
  app.get(
    '/ws',
    upgradeWebSocket((_c) => ({
      onOpen: async (_evt: any, ws: any) => {
        wsClients.add(ws)
        try {
          ws.send(JSON.stringify({ type: 'status', value: latestStatus }))
          if (latestQR) ws.send(JSON.stringify({ type: 'qr', value: latestQR }))
          if (!waReady && !_ensuring) await ensureWA()
        } catch { }
      },
      onClose: (_evt: any, ws: any) => {
        wsClients.delete(ws)
      },
      onMessage: (_evt: any, _ws: any) => {
        // no-op
      },
    }))
  )

  return app
}
