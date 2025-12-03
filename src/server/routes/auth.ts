/**
 * Authentication API Routes
 * Handles user authentication, registration, and account management
 * Implements account-based data isolation for all wedding event data
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '@shared/types'
import { ObjectId } from 'mongodb'
import { db } from "../db.js";

const authApp = new Hono<AppEnv>()

// Collections with app id prefix
const USERS_COLLECTION = '94884219_users'
const ACCOUNTS_COLLECTION = '94884219_accounts'

/**
 * User registration schema
 */
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  weddingTitle: z.string().optional(),
  weddingDateTime: z.coerce.date().optional(),
  weddingLocation: z.string().optional(),
  weddingPhotoUrl: z.string().url().optional(),
})

/**
 * Login schema
 */
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(1, 'Password is required'),
})

// Helper types (untuk cast hasil c.req.valid('json'))
type RegisterBody = z.infer<typeof registerSchema>
type LoginBody = z.infer<typeof loginSchema>

/**
 * POST /api/register
 * Register a new user and create their account
 */
authApp.post('/register', zValidator('json', registerSchema), async (c: Context<AppEnv>) => {
  try {
    // NOTE: zValidator sudah validasi; masalah typing 'never' kita atasi via cast aman
    const body = (c.req as any).valid('json') as RegisterBody
    const { username, password, phone } = body

    console.log(`[auth] Registering new user: ${username}`)

    // Ensure collections exist
    try {
      const collections = await db.listCollections().toArray()
      console.log(`[auth] Available collections:`, collections.map((col: { name: string }) => col.name))

      const userCollectionExists = collections.some((col: { name: string }) => col.name === USERS_COLLECTION)
      const accountCollectionExists = collections.some((col: { name: string }) => col.name === ACCOUNTS_COLLECTION)

      if (!userCollectionExists) {
        console.log(`[auth] Creating user collection: ${USERS_COLLECTION}`)
        await db.createCollection(USERS_COLLECTION)
      }
      if (!accountCollectionExists) {
        console.log(`[auth] Creating account collection: ${ACCOUNTS_COLLECTION}`)
        await db.createCollection(ACCOUNTS_COLLECTION)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[auth] Failed to list/create collections:`, msg)
    }

    // Check if user already exists
    try {
      const existingUser = await db.collection(USERS_COLLECTION).findOne({ username })
      if (existingUser) {
        console.log(`[auth] User already exists: ${username}`)
        return c.json(
          { success: false, error: 'User already exists with this username' },
          400,
        )
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[auth] Error checking existing user:`, msg)
      throw new Error(`Database error checking user: ${msg}`)
    }

    // Create new account
    let accountId: string
    try {
      const accountResult = await db.collection(ACCOUNTS_COLLECTION).insertOne({
        name: body.weddingTitle ?? `${username}'s Wedding`,
        title: body.weddingTitle ?? `${username}'s Wedding`,
        dateTime: body.weddingDateTime ?? undefined, // Date | undefined
        location: body.weddingLocation ?? undefined,
        photoUrl: body.weddingPhotoUrl ?? undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      if (!accountResult.insertedId) {
        throw new Error('Failed to create account')
      }
      accountId = accountResult.insertedId.toString()
      console.log(`[auth] Account created: ${accountId}`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[auth] Error creating account:`, msg)
      throw new Error(`Database error creating account: ${msg}`)
    }

    // Create user
    let userId: string
    try {
      const userResult = await db.collection(USERS_COLLECTION).insertOne({
        username,
        password, // In production: hash first
        phone,
        accountId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      if (!userResult.insertedId) {
        throw new Error('Failed to create user')
      }
      userId = userResult.insertedId.toString()
      console.log(`[auth] User created: ${userId}`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[auth] Error creating user:`, msg)
      throw new Error(`Database error creating user: ${msg}`)
    }

    console.log(`[auth] User registered successfully: ${username} (account: ${accountId})`)

    return c.json({
      success: true,
      data: {
        user: {
          id: userId,
          username,
          accountId,
          role: 'admin',
        },
        token: `mock_token_${userId}_${Date.now()}`,
      },
      message: 'Registration successful',
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed'
    console.error(`[auth] Registration failed:`, errorMessage)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

/**
 * POST /api/login
 * Authenticate user and return token
 */
authApp.post('/login', zValidator('json', loginSchema), async (c: Context<AppEnv>) => {
  try {
    // NOTE: hindari 'never' via cast
    const { username, password } = (c.req as any).valid('json') as LoginBody

    console.log(`[auth] Login attempt: ${username}`)

    const user = await db.collection(USERS_COLLECTION).findOne({ username })
    if (!user) {
      return c.json({ success: false, error: 'Invalid username or password' }, 401)
    }

    // In production: verify hashed password
    if (user.password !== password) {
      return c.json({ success: false, error: 'Invalid username or password' }, 401)
    }

    const token = `mock_token_${user._id}_${Date.now()}`
    await db.collection(USERS_COLLECTION).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

    let activePermissions: { page: string; canAccess: boolean }[] = []
    if (user.role === 'user' && Array.isArray(user.permissions) && user.permissions.length) {
      activePermissions = user.permissions.map((p: any) => ({ page: p.page, canAccess: p.canAccess }))
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          name: user.name,
          accountId: user.accountId,
          role: user.role,
          permissions: activePermissions
        },
        token,
      },
      message: 'Login successful',
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    console.error(`[auth] Login failed:`, errorMessage)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

/**
 * POST /api/setup-demo
 * Create a demo user for testing
 */
authApp.post('/setup-demo', async (c: Context<AppEnv>) => {
  try {
    const demoUname = 'demo@wedding.com'
    const demoPassword = 'demo123'

    const existingUser = await db.collection(USERS_COLLECTION).findOne({ username: demoUname })
    if (existingUser) {
      return c.json({
        success: true,
        message: 'Demo user already exists',
        data: { username: demoUname, password: demoPassword },
      })
    }

    const accountResult = await db.collection(ACCOUNTS_COLLECTION).insertOne({
      name: 'Demo Wedding',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    if (!accountResult.insertedId) throw new Error('Failed to create demo account')

    const accountId = accountResult.insertedId.toString()

    const userResult = await db.collection(USERS_COLLECTION).insertOne({
      username: demoUname,
      password: demoPassword,
      phone: '+1234567890',
      accountId,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    if (!userResult.insertedId) throw new Error('Failed to create demo user')

    return c.json({
      success: true,
      message: 'Demo user created successfully',
      data: { email: demoUname, password: demoPassword },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Demo setup failed'
    console.error(`[auth] Demo setup failed:`, errorMessage)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

/**
 * GET /api/me
 * Get current user information
 * Requires authentication
 */
authApp.get('/me', async (c: Context<AppEnv>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    const userId = token.split('_')[2]

    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) })
    if (!user) return c.json({ success: false, error: 'User not found' }, 404)

    return c.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          accountId: user.accountId,
          role: user.role,
        },
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get user'
    console.error(`[auth] Get user failed:`, msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * POST /api/logout
 * Logout user
 */
authApp.post('/logout', async (c: Context<AppEnv>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const userId = token.split('_')[2]

      const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) })
    }

    return c.json({ success: true, message: 'Logout successful' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Logout failed'
    console.error(`[auth] Logout failed:`, msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/accounts/:accountId
 * Get account information
 * Requires authentication and account ownership
 */
authApp.get('/accounts/:accountId', async (c: Context<AppEnv>) => {
  try {
    const accountId = c.req.param('accountId')

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    const userId = token.split('_')[2]

    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) })
    if (!user || user.accountId !== accountId) {
      return c.json({ success: false, error: 'Access denied' }, 403)
    }

    const account = await db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectId(accountId) })
    if (!account) return c.json({ success: false, error: 'Account not found' }, 404)

    return c.json({
      success: true,
      data: {
        account: {
          id: account._id.toString(),
          name: account.name,
          linkUndangan: account.linkUndangan,
          title: account.title ?? account.name,
          dateTime: account.dateTime,
          location: account.location,
          welcomeText: account.welcomeText,
          youtubeUrl: account.youtubeUrl,
          guestCategories: account.guestCategories,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get account'
    console.error(`[auth] Get account failed:`, msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/wedding/countdown
 * User-specific countdown
 */
authApp.get('/wedding/countdown', async (c: Context<AppEnv>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    const userId = token.split('_')[2]

    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) })
    if (!user) return c.json({ success: false, error: 'User not found' }, 404)

    const account = await db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectId(user.accountId) })
    if (!account) return c.json({ success: false, error: 'Account not found' }, 404)

    if (!account.dateTime) {
      return c.json({ success: false, error: 'Wedding date not set' }, 400)
    }

    const weddingDate = new Date(account.dateTime)
    const now = new Date()
    const timeDiff = weddingDate.getTime() - now.getTime()

    const countdown = {
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      isPast: false,
      weddingDate: weddingDate.toISOString(),
      currentDate: now.toISOString(),
    }

    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const months = Math.floor(days / 30)
      const remainingDays = days % 30

      countdown.months = months
      countdown.days = remainingDays
      countdown.hours = hours
      countdown.minutes = minutes
    } else {
      countdown.isPast = true
    }

    return c.json({ success: true, data: countdown })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch wedding countdown'
    console.error('Error fetching wedding countdown:', msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

export default authApp
