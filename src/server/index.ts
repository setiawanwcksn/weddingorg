/**
 * Wedding/Event Management System API
 * Consolidated database structure with Auth and Guests collections only
 */
import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ObjectId, type Collection } from 'mongodb'
import authApp from './routes/auth.js'
import guestsApp from './routes/guests.js'
import remindersApp from './routes/reminders.js'
import doorprizeApp from './routes/doorprize.js'
import usersApp from './routes/users.js'
import introTextApp from './routes/intro-text.js'
import bulkImportApp from './routes/bulk-import.js'
import giftDistributionsApp from './routes/gift-distributions.js'
import whatsAppApp from './routes/whatsapp.js'
import welcomeDisplayApp from './routes/welcome-display.js'
import realtimeGuestsApp from './routes/realtime-guests.js'
import uploadApp from './routes/upload.js'
import type { Bindings, Vars } from '@shared/types'

import { connectDb, db } from './db.js'

await connectDb(process.env.MONGO_URI ?? 'mongodb://mongo:27017/app', process.env.MONGO_DB ?? 'app');

// kalau pakai helper:
// const rootApp = new Hono<AppEnv>()

// atau langsung:
const rootApp = new Hono<{ Bindings: Bindings; Variables: Vars }>()

// Middleware
rootApp.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'user-id'],
  }),
)

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

async function findUserFlexible(userId: string) {
  const usersCol = db.collection('94884219_users') as Collection<{ _id: ObjectId }>

  if (isValidObjectId(userId)) {
    return usersCol.findOne({ _id: new ObjectId(userId) })
  }

  // fallback, jika _id disimpan sebagai string
  return db.collection('94884219_users').findOne({ _id: userId } as any)
}

rootApp.use('*', logger())

// Authentication middleware - skip for public routes
rootApp.use('*', async (c, next) => {
  const path = c.req.path

  // Public routes yang murni public
  const publicRoutes = [
    '/api/accounts/current',
    '/api/guests/recent-checkins',
    '/api/health',
    '/api/welcome-display',
  ]

  // Khusus /api/upload: hanya GET yang public
  if (
    publicRoutes.some((route) => path.startsWith(route)) ||
    (path.startsWith('/api/upload') && c.req.method === 'GET')
  ) {
    console.log(`[auth] Skipping auth for public route: ${path} ${c.req.method}`)
    return next()
  }

  const authHeader = c.req.header('Authorization')
  const userIdHeader = c.req.header('user-id')

  console.log(`[auth] Processing request to: ${path}`)
  console.log(`[auth] Authorization header: ${authHeader ? 'Present' : 'Missing'}`)
  console.log(`[auth] user-id header: ${userIdHeader || 'Missing'}`)

  let userId: string | null = null
  let user: any = null

  // Check user-id header first (for intro text routes)
  if (userIdHeader) {
    userId = userIdHeader
    console.log(`[auth] Using user-id header: ${userId}`)

    try {
      user = await findUserFlexible(userId)

      console.log(`[auth] User found via user-id header:`, user ? 'Yes' : 'No')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[auth] Error finding user by user-id header:', msg)
    }
  }

  // If no user found via header, try Authorization header
  if (!user && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    console.log(`[auth] Token received: ${token.substring(0, 20)}...`)

    try {
      // Parse token format: mock_token_${userId}_${timestamp}
      const tokenParts = token.split('_')
      console.log(`[auth] Token parts:`, tokenParts)
      userId = tokenParts[2] // Extract user ID from mock token

      console.log(`[auth] Extracted userId: ${userId}`)

      if (userId) {
         user = await findUserFlexible(userId)

        console.log(`[auth] User found via token:`, user ? 'Yes' : 'No')
      } else {
        console.log(`[auth] Invalid token format - no userId extracted`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[auth] Auth middleware error:', msg)
    }
  }

  // Set user and account info in context if user found
  if (user) {
    c.set('user', {
      id: String(user._id),
      username: user.username,
      accountId: user.accountId,
      role: user.role || 'user',
    })
    c.set('accountId', user.accountId)
    console.log(`[auth] User authenticated: ${user.username} (${user._id})`)
  } else {
    console.log(`[auth] No valid authentication found`)
  }

  await next()
})

// Health check endpoint
rootApp.get('/api/health', async (c) => {
  try {
    // Check database connection
    const collections = (await db.listCollections().toArray()) as Array<{ name: string }>
    const collectionNames = collections.map((col) => col.name)

    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      collections: collectionNames,
      dbConnected: true,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Health check failed:', msg)
    return c.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: msg,
        dbConnected: false,
      },
      500,
    )
  }
})

// Mount route modules
rootApp.route('/api/auth', authApp)
rootApp.route('/api/guests', guestsApp)
rootApp.route('/api/reminders', remindersApp)
rootApp.route('/api/doorprize', doorprizeApp)
rootApp.route('/api/users', usersApp)
rootApp.route('/api/intro-text', introTextApp)
rootApp.route('/api/bulk-import', bulkImportApp)
rootApp.route('/api/gift-distributions', giftDistributionsApp)
rootApp.route('/api/whatsapp', whatsAppApp)
rootApp.route('/api/welcome-display', welcomeDisplayApp)
rootApp.route('/api/realtime-guests', realtimeGuestsApp)
rootApp.route('/api/upload', uploadApp)

// Global error handler
rootApp.onError((err: unknown, c) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('Global error:', msg)
  return c.json(
    {
      success: false,
      error: msg || 'Internal server error',
    },
    500,
  )
})

// 404 handler
rootApp.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Route not found',
    },
    404,
  )
})

export default rootApp
