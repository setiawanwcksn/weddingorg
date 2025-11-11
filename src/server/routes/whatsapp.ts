// src/server/routes/whatsapp.ts
import { Hono, type Context } from 'hono'
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
import path from 'node:path'
import { db } from '../db.js'
import { renderMessage } from '../utils/renderMessage.js'

type UpgradeWS = ReturnType<typeof createNodeWebSocket>['upgradeWebSocket']

// ───────────────────────────────
// Helpers: user context
// ───────────────────────────────
type CtxUser = { id: string; accountId?: string; role?: string; username?: string }

function requireUser(c: Context): CtxUser | null {
  const u = c.get('user') as unknown
  if (!u || typeof u !== 'object') return null
  const user = u as Partial<CtxUser>
  if (!user.id) return null
  return user as CtxUser
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

// ───────────────────────────────
// Global
// ───────────────────────────────
const AUTH_ROOT = process.env.WA_AUTH_DIR ?? '/app/auth'
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' })

type Session = {
  userId: string
  authDir: string
  sock: ReturnType<typeof makeWASocket> | null
  ready: boolean
  status: string
  latestQR: string | null
  ensuring: boolean
  lastQrAt?: number
  lastStatusAt?: number
  sendText: ((phoneE164: string, text: string) => Promise<void>) | null
}
const sessions = new Map<string, Session>()

// WebSocket clients per user
const wsClients = new Map<string, Set<any>>() // userId -> Set<ws>

function getSession(userId: string): Session {
  let sess = sessions.get(userId)
  if (!sess) {
    const authDir = path.join(AUTH_ROOT, sanitize(userId))
    sess = {
      userId,
      authDir,
      sock: null,
      ready: false,
      status: 'idle',
      latestQR: null,
      ensuring: false,
      sendText: null,
    }
    sessions.set(userId, sess)
  }
  return sess
}

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function broadcast(userId: string, payload: any) {
  const set = wsClients.get(userId)
  if (!set || set.size === 0) return
  const msg = JSON.stringify(payload)
  for (const ws of set) {
    try { ws.send(msg) } catch { }
  }
}

function setStatus(sess: Session, s: string) {
  const now = Date.now()
  if (sess.status === s && (sess.lastStatusAt && now - sess.lastStatusAt < 1000)) {
    return
  }
  sess.status = s
  sess.lastStatusAt = now
  broadcast(sess.userId, { type: 'status', value: s })
}

function wipeAuthFolder(sess: Session) {
  try {
    fs.rmSync(sess.authDir, { recursive: true, force: true })
    fs.mkdirSync(sess.authDir, { recursive: true })
    logger.warn({ authDir: sess.authDir }, `[wa:${sess.userId}] wiped auth folder and recreated it`)
  } catch (e) {
    logger.error({ e }, `[wa:${sess.userId}] failed wiping auth`)
  }
}

// ───────────────────────────────
// ensureWA(userId): init / re-init per user
// ───────────────────────────────
async function ensureWA(userId: string) {
  const sess = getSession(userId)
  if (sess.ensuring) return
  sess.ensuring = true
  try {
    // hanya early-return jika benar-benar siap
    if (sess.sock && sess.sendText && sess.ready) return

    fs.mkdirSync(sess.authDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sess.authDir)
    const { version } = await fetchLatestBaileysVersion()
    logger.info({ version, userId }, `[wa:${userId}] using WA Web version`)

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
    sess.sock = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (u: Partial<ConnectionState> & { qr?: string }) => {
      const { connection, lastDisconnect, qr } = u

      if (qr) {
        const now = Date.now()
        const isNew = qr !== sess.latestQR
        const tooSoon = !!sess.lastQrAt && now - sess.lastQrAt < 2000 // 2s

        if (isNew && !tooSoon) {
          sess.latestQR = qr
          sess.lastQrAt = now
          setStatus(sess, 'qr')
          broadcast(sess.userId, { type: 'qr', value: qr })
        }
      }
      if (connection === 'connecting') setStatus(sess, 'connecting')
      if (connection === 'open') {
        sess.ready = true
        sess.latestQR = null
        setStatus(sess, 'connected')
      }
      if (connection === 'close') {
        sess.ready = false

        const err: any = (lastDisconnect as any)?.error
        const code: number | undefined =
          err?.output?.statusCode ??
          err?.output?.payload?.statusCode ??
          err?.statusCode ??
          err?.code
        const msg: string | undefined = err?.message ?? String(err)

        const logoutLikeCodes = new Set<number | string>([
          DisconnectReason.loggedOut,          // 401
          DisconnectReason.badSession,         // 500 on some variants
          DisconnectReason.connectionReplaced, // 440/409
          401, 403, 409, 440, 500,
        ])
        const isLogoutLike =
          code === DisconnectReason.loggedOut ||
          code === DisconnectReason.connectionReplaced ||
          /logged.?out|connection.?replaced/i.test(msg || '')

        setStatus(sess, `disconnected${code ? `:${code}` : ''}`)
        logger.warn({ userId: sess.userId, code, msg }, `[wa:${sess.userId}] connection closed`)

        if (isLogoutLike) {
          (async () => {
            try {
              await (sock as any).logout?.()
            } catch { }
            wipeAuthFolder(sess)
          })()
        }


        setTimeout(() => {
          sess.sock = null
          sess.sendText = null
          ensureWA(sess.userId).catch(() => { })
        }, isLogoutLike ? 1200 : 2200)
      }
    })

    sess.sendText = async (phoneE164: string, text: string) => {
      const numeric = phoneE164.replace(/[^\d]/g, '')
      const jid = `${numeric}@s.whatsapp.net`
      await sock.sendMessage(jid, { text })
    }
  } finally {
    sess.ensuring = false
  }
}

// ───────────────────────────────
// Scheduler untuk 94884219_reminders (global, multi-user)
// ───────────────────────────────
let schedulerStarted = false
let isTicking = false
let schedulerTimer: NodeJS.Timeout | null = null
const workerId = `${process.env.HOSTNAME || 'host'}-pid${process.pid}-${Math.random().toString(36).slice(2, 8)}`

function dueFilter(now: Date) {
  return {
    status: 'pending',
    $or: [
      { scheduledAt: { $type: 'date', $lte: now } },
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
  const result = await db.collection('94884219_reminders').findOneAndUpdate(
    dueFilter(now),
    { $set: { status: 'processing', updatedAt: now, claimedBy: workerId }, $inc: { attempts: 1 } },
    { sort: { scheduledAt: 1 }, returnDocument: 'after' }
  )
  const job = (result as any)?.value ?? result
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

async function markPending(id: any, note?: string) {
  await db.collection('94884219_reminders').updateOne(
    { _id: id },
    { $set: { status: 'pending', lastError: note ?? null, updatedAt: new Date() } }
  )
}

/** Resolve pengirim (session pemilik):
 * 1) Gunakan job.userId bila tersedia (paling akurat).
 * 2) Jika tidak ada, gunakan job.accountId -> pilih user tertua di account tsb (deterministik).
 * 3) Terakhir, fallback dari job.guestId -> ambil guest.userId (kompat lama).
 */
async function resolveUserIdForJob(job: any): Promise<string | null> {
  try {
    if (job.userId) return String(job.userId)
    if (job.accountId) {
      const cursor = db.collection('94884219_users')
        .find({ accountId: job.accountId })
        .project({ _id: 1, createdAt: 1 })
        .sort({ createdAt: 1, _id: 1 })
        .limit(1)
      const u = await cursor.next()
      if (u?._id) return String(u._id)
    }
    if (job.guestId) {
      const g = await db.collection('94884219_guests').findOne(
        { _id: job.guestId as any },
        { projection: { userId: 1 } }
      )
      if (g?.userId) return String(g.userId)
    }
  } catch { /* ignore */ }
  return null
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
      // requeue stuck (>5 menit)
      const cutoff = new Date(Date.now() - 5 * 60 * 1000)
      const requeued = await db.collection('94884219_reminders').updateMany(
        { status: 'processing', updatedAt: { $lte: cutoff } },
        { $set: { status: 'pending' } }
      )
      if (requeued.modifiedCount > 0) {
        console.log('[scheduler] requeued stuck jobs:', requeued.modifiedCount)
      }

      // due count
      const now = new Date()
      const dueCount = await db.collection('94884219_reminders').countDocuments(dueFilter(now))
      if (dueCount > 0) console.log('[scheduler] due pending:', dueCount)

      for (let i = 0; i < 20; i++) {
        const job = await claimOneDue()
        if (!job) break

        try {
          const userId = await resolveUserIdForJob(job)
          if (!userId) {
            await markFailed(job._id, 'No user session resolved for job')
            continue
          }

          await ensureWA(userId)
          const sess = getSession(userId)

          if (!sess.ready || !sess.sendText) {
            await markPending(job._id, 'WA not ready; will retry')
            continue
          }

          const text = await renderMessage(job.message, job)
          await sess.sendText(job.phone, text)
          await markSent(job._id)
          console.log('[scheduler] sent', job.phone, job.type, 'by', userId)
          await new Promise(r => setTimeout(r, 500 + Math.random() * 800))
        } catch (e: any) {
          console.error('[scheduler] failed', job?.phone, e?.message)
          await markFailed(job._id, e?.message ?? String(e))
        }
      }
    } catch (err) {
      console.error('[scheduler] error:', err)
    } finally {
      isTicking = false
    }
  }, 3000)
}

// ───────────────────────────────
// Export untuk auto-start di server.ts
// ───────────────────────────────
export async function startWhatsApp() {
  console.log('[boot] initializing WhatsApp (multi-user)...')
  try {
    // Tidak memaksa buka sesi apa pun di boot.
    // Sesi dibuat saat user memanggil /connect atau membuka WS.
    await startScheduler()
    console.log('[boot] scheduler started ✅')
  } catch (err) {
    console.error('[boot] Failed starting WhatsApp:', err)
  }
}

// ───────────────────────────────
// Router builder (default export)
// ───────────────────────────────
export default function whatsAppRoutes({ upgradeWebSocket }: { upgradeWebSocket: UpgradeWS }) {
  const app = new Hono()

  // Status per user
  app.get('/status', (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ ok: false, error: 'No token' }, 401)
    const sess = getSession(user.id)
    return c.json({ ok: true, status: sess.status, ready: sess.ready, hasQR: !!sess.latestQR })
  })

  // Connect per user
  app.get('/connect', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ ok: false, error: 'No token' }, 401)
    await ensureWA(user.id)
    await startScheduler()
    return c.json({ ok: true })
  })

  // Kirim langsung per user
  app.post('/send-now', async (c) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ ok: false, error: 'No token' }, 401)
      const sess = getSession(user.id)
      if (!sess.ready || !sess.sendText) return c.json({ ok: false, error: 'wa not ready' }, 400)
      const { phoneE164, message } = await c.req.json()
      await sess.sendText(phoneE164, message)
      return c.json({ ok: true })
    } catch (e: any) {
      return c.json({ ok: false, error: e?.message ?? String(e) }, 500)
    }
  })

  // Jadwalkan reminder (menyimpan userId & accountId)
  app.post('/schedule', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ ok: false, error: 'No token' }, 401)
    const body = await c.req.json()
    await db.collection('94884219_reminders').insertOne({
      guestId: body.guestId ?? null,
      guestName: body.guestName ?? body.name ?? '',
      phone: body.phone,
      message: body.message,
      scheduledAt: typeof body.scheduledAt === 'string'
        ? body.scheduledAt
        : new Date(body.scheduledAt).toISOString(),
      type: body.type ?? 'reminder',
      userId: body.userId ?? user.id,
      accountId: body.accountId ?? user.accountId ?? null,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return c.json({ ok: true })
  })

  // Pairing code per user
  app.get('/pair', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ ok: false, error: 'No token' }, 401)
    await ensureWA(user.id)
    const sess = getSession(user.id)
    if (!sess.sock) return c.json({ ok: false, error: 'socket not ready' }, 500)
    try {
      const phone = c.req.query('phone') ?? ''
      if (!phone) return c.json({ ok: false, error: 'phone required' }, 400)
      const code = await sess.sock.requestPairingCode(phone)
      broadcast(user.id, { type: 'pairingCode', value: code })
      return c.json({ ok: true, code })
    } catch (e: any) {
      logger.error({ e, userId: user.id }, `[wa:${user.id}] pairing code error`)
      return c.json({ ok: false, error: e?.message ?? String(e) }, 500)
    }
  })

  // Reset/panic button per user
  app.post('/reset', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ ok: false, error: 'No token' }, 401)
    const sess = getSession(user.id)
    try {
      if (sess.sock) {
        try { await (sess.sock as any).logout?.() } catch { }
        try { (sess.sock as any).end?.(true) } catch { }
      }
      sess.sock = null
      sess.sendText = null
      sess.ready = false
      sess.latestQR = null
      wipeAuthFolder(sess)
      await ensureWA(user.id)
      return c.json({ ok: true, reset: true })
    } catch (e: any) {
      return c.json({ ok: false, error: e?.message ?? String(e) }, 500)
    }
  })

  // WebSocket per user: status & QR
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const user = requireUser(c)
      const userId = user?.id ?? c.req.query('userId')
      if (!userId) throw new Error('Unauthorized WS: missing userId')

      return {
        onOpen: async (_evt: any, ws: any) => {
          if (!wsClients.has(userId)) wsClients.set(userId, new Set())
          wsClients.get(userId)!.add(ws)

          const sess = getSession(userId)
          try {
            ws.send(JSON.stringify({ type: 'status', value: sess.status }))
            if (sess.latestQR) ws.send(JSON.stringify({ type: 'qr', value: sess.latestQR }))
            // if (!sess.ready && !sess.ensuring) await ensureWA(userId)
          } catch { }
        },
        onClose: (_evt: any, ws: any) => {
          const set = wsClients.get(userId)
          if (set) {
            set.delete(ws)
            if (set.size === 0) wsClients.delete(userId)
          }
        },
        onMessage: (_evt: any, _ws: any) => {
          // no-op
        },
      }
    })
  )

  return app
}
