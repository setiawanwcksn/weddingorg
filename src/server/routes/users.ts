/**
 * User Management API Routes
 * Handles admin user management operations
 * Implements role-based access control for user administration
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { ObjectId } from 'mongodb'
import { db } from '../db.js'
import type { AppEnv } from '@shared/types'

const usersApp = new Hono<AppEnv>()

// ------------------------ consts ------------------------

const USERS_COLLECTION = '94884219_users'
const ACCOUNTS_COLLECTION = '94884219_accounts'
const AUDIT_LOGS_COLLECTION = '94884219_audit_logs'
const USER_PERMISSIONS_COLLECTION = '94884219_user_permissions'

// ------------------------ utils ------------------------

type CtxUser = { id: string; username?: string; email?: string; role?: 'admin' | 'user'; accountId?: string }

function getCtxUser(c: Context<AppEnv>): CtxUser | null {
  const u = c.get('user') as unknown
  if (!u || typeof u !== 'object') return null
  const user = u as Partial<CtxUser>
  if (!user.id) return null
  return user as CtxUser
}

function safeObjectId(id: string): ObjectId | null {
  try {
    if (ObjectId.isValid(id)) return new ObjectId(id)
    return null
  } catch {
    return null
  }
}

async function createAuditLog(
  userId: string,
  userEmailOrName: string | undefined,
  action: string,
  resource: string,
  details?: any,
) {
  try {
    await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
      userId,
      userEmail: userEmailOrName,
      action,
      resource,
      details,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('[audit] Failed to create audit log:', err)
  }
}

// ------------------------ schemas ------------------------

const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user']).default('user'),
  phone: z.string().optional(),

  // Wedding account (required saat create user oleh admin)
  weddingTitle: z.string().min(2, 'Wedding title is required'),
  weddingDateTime: z.string().min(1, 'Wedding date/time is required'), // ISO string
  weddingLocation: z.string().min(2, 'Wedding location is required'),
  weddingPhotoUrl: z.string().url('Wedding photo URL must be a valid URL').or(z.literal('')).optional(),
  weddingPhotoUrl_dashboard: z.string().url('Dashboard photo URL must be a valid URL').or(z.literal('')).optional(),
  weddingPhotoUrl_welcome: z
    .string()
    .url('Welcome photo URL must be a valid URL')
    .or(z.literal(''))
    .optional()
    .refine((val) => !val || !val.includes('undefined/'), {
      message: 'Welcome photo URL contains invalid "undefined" prefix',
    }),

  // Permissions (hanya untuk role user)
  permissions: z
    .array(
      z.object({
        page: z.string(),
        canAccess: z.boolean(),
      }),
    )
    .optional(),
})

const updateUserSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),

  // Wedding updates
  weddingTitle: z.string().min(2, 'Wedding title must be at least 2 characters').optional()
    .or(z.literal('')),
  weddingDateTime: z.string().optional().or(z.literal('')),
  weddingLocation: z.string().min(2, 'Wedding location must be at least 2 characters').optional()
    .or(z.literal('')),
  weddingPhotoUrl: z.string().url('Wedding photo URL must be a valid URL').or(z.literal('')).optional(),
  weddingPhotoUrl_dashboard: z.string().url('Dashboard photo URL must be a valid URL').or(z.literal('')).optional(),
  weddingPhotoUrl_welcome: z
    .string()
    .url('Welcome photo URL must be a valid URL')
    .or(z.literal(''))
    .optional()
    .refine((val) => !val || !val.includes('undefined/'), {
      message: 'Welcome photo URL contains invalid "undefined" prefix',
    }),

  permissions: z
    .array(
      z.object({
        page: z.string(),
        canAccess: z.boolean(),
      }),
    )
    .optional(),
})

// ------------------------ middleware ------------------------

async function requireAdmin(c: Context<AppEnv>, next: () => Promise<void>) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    const parts = token.split('_')
    // token format: mock_token_${userId}_${timestamp}
    if (parts.length < 4 || parts[0] !== 'mock' || parts[1] !== 'token') {
      return c.json({ success: false, error: 'Invalid token format' }, 401)
    }
    const userId = parts.slice(2, -1).join('_')

    let userDoc: any = null
    // coba by ObjectId
    const oid = safeObjectId(userId)
    if (oid) {
      userDoc = await db.collection(USERS_COLLECTION).findOne({ _id: oid } as any)
    }
    // fallback by username (kalau token pakai username)
    if (!userDoc) {
      userDoc = await db.collection(USERS_COLLECTION).findOne({ username: userId } as any)
    }

    if (!userDoc || userDoc.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }

    c.set('user', {
      id: userDoc._id?.toString?.() ?? userId,
      email: userDoc.email,
      username: userDoc.username,
      role: userDoc.role,
      accountId: userDoc.accountId,
    } as CtxUser)

    await next()
  } catch (err) {
    console.error('[users] Admin check failed:', err)
    return c.json({ success: false, error: 'Authentication failed' }, 401)
  }
}

// ------------------------ routes ------------------------

/**
 * GET /api/users
 */
usersApp.get('/', requireAdmin, async (c) => {
  try {
    const users = await db
      .collection(USERS_COLLECTION)
      .find({}, { projection: { password: 0 } })
      .toArray()

    const formatted = await Promise.all(
      users.map(async (u: any) => {
        const perms = await db
          .collection(USER_PERMISSIONS_COLLECTION)
          .find({ userId: u._id.toString() })
          .toArray()

        return {
          id: u._id.toString(),
          username: u.username,
          phone: u.phone ?? '',
          role: (u.role as 'admin' | 'user') ?? 'user',
          status: u.status ?? 'active',
          accountId: u.accountId,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          permissions: perms.map((p: any) => ({ page: p.page, canAccess: !!p.canAccess })),
        }
      }),
    )

    return c.json({ success: true, data: formatted })
  } catch (err: any) {
    console.error('[users] Fetch users failed:', err?.message ?? err)
    return c.json({ success: false, error: err?.message ?? 'Failed to fetch users' }, 500)
  }
})

/**
 * GET /api/users/:id/permissions
 */
usersApp.get('/:id/permissions', async (c) => {
  try {
    const targetId = c.req.param('id')

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }
    const token = authHeader.substring(7)
    const parts = token.split('_')
    if (parts.length < 4 || parts[0] !== 'mock' || parts[1] !== 'token') {
      return c.json({ success: false, error: 'Invalid token format' }, 401)
    }
    const requesterId = parts.slice(2, -1).join('_')

    // load requester
    let requester: any = null
    const reqOid = safeObjectId(requesterId)
    if (reqOid) requester = await db.collection(USERS_COLLECTION).findOne({ _id: reqOid } as any)
    if (!requester) requester = await db.collection(USERS_COLLECTION).findOne({ username: requesterId } as any)

    if (!requester) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    const isAdmin = requester.role === 'admin'
    const isSelf = requester._id?.toString?.() === targetId || requester.username === targetId
    if (!isAdmin && !isSelf) {
      return c.json({ success: false, error: 'Access denied' }, 403)
    }

    const perms = await db.collection(USER_PERMISSIONS_COLLECTION).find({ userId: targetId }).toArray()

    return c.json({
      success: true,
      data: perms.map((p: any) => ({ page: p.page, canAccess: !!p.canAccess })),
    })
  } catch (err: any) {
    console.error('[users] Fetch user permissions failed:', err?.message ?? err)
    return c.json({ success: false, error: err?.message ?? 'Failed to fetch user permissions' }, 500)
  }
})

/**
 * POST /api/users
 */
usersApp.post('/', requireAdmin, async (c) => {
  try {
    const currentUser = getCtxUser(c)!

    // Validasi body via zod (biar tidak "never")
    const rawBody = await c.req.json()
    const body = createUserSchema.parse(rawBody)

    const {
      username,
      password,
      role,
      phone,
      weddingTitle,
      weddingDateTime,
      weddingLocation,
      weddingPhotoUrl,
      weddingPhotoUrl_dashboard,
      weddingPhotoUrl_welcome,
      permissions,
    } = body

    // validate weddingDateTime
    const weddingDate = new Date(weddingDateTime)
    if (Number.isNaN(weddingDate.getTime())) {
      return c.json({ success: false, error: 'Invalid wedding date/time format' }, 400)
    }

    // photo URLs cleanup
    const defaultPhoto =
      weddingPhotoUrl ||
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'

    const cleanDashboard =
      (weddingPhotoUrl_dashboard || defaultPhoto).includes('undefined/')
        ? (weddingPhotoUrl_dashboard || defaultPhoto).replace('undefined/', '')
        : weddingPhotoUrl_dashboard || defaultPhoto

    const dashboardUrl =
      cleanDashboard.startsWith('/api/upload/')
        ? 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
        : cleanDashboard

    const cleanWelcome =
      (weddingPhotoUrl_welcome || defaultPhoto).includes('undefined/')
        ? (weddingPhotoUrl_welcome || defaultPhoto).replace('undefined/', '')
        : weddingPhotoUrl_welcome || defaultPhoto

    const welcomeUrl =
      cleanWelcome.startsWith('/api/upload/')
        ? 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
        : cleanWelcome

    // username unique
    const existing = await db.collection(USERS_COLLECTION).findOne({ username })
    if (existing) {
      return c.json({ success: false, error: 'User already exists with this username' }, 400)
    }

    // create account
    const accountDoc = {
      name: weddingTitle,
      title: weddingTitle,
      dateTime: weddingDate,
      location: weddingLocation,
      photoUrl: defaultPhoto,
      photoUrl_dashboard: dashboardUrl,
      photoUrl_welcome: welcomeUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const accountRes = await db.collection(ACCOUNTS_COLLECTION).insertOne(accountDoc)
    const accountId = accountRes.insertedId.toString()

    // create user
    const userRes = await db.collection(USERS_COLLECTION).insertOne({
      username,
      password, // NOTE: hash in production
      phone,
      accountId,
      role,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // set permissions (only truthy canAccess)
    if (role === 'user' && Array.isArray(permissions) && permissions.length) {
      const active = permissions.filter((p) => p.canAccess === true)
      if (active.length) {
        await db.collection(USER_PERMISSIONS_COLLECTION).insertMany(
          active.map((p) => ({
            userId: userRes.insertedId.toString(),
            page: p.page,
            canAccess: p.canAccess,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        )
      }
    }

    await createAuditLog(currentUser.id, currentUser.username, 'user_created', 'users', {
      newUserUsername: username,
      role,
      account: {
        ...accountDoc,
        photoUrl: defaultPhoto,
        photoUrl_dashboard: dashboardUrl,
        photoUrl_welcome: welcomeUrl,
      },
      permissions,
    })

    return c.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userRes.insertedId.toString(),
        username,
        role,
        accountId,
      },
    })
  } catch (err: any) {
    // kalau zod error
    if (err?.issues) {
      return c.json({ success: false, error: 'Validation failed', issues: err.issues }, 400)
    }
    console.error('[users] Create user failed:', err?.message ?? err)
    return c.json({ success: false, error: err?.message ?? 'Failed to create user' }, 500)
  }
})

/**
 * DELETE /api/users/:id
 */
usersApp.delete('/:id', requireAdmin, async (c) => {
  try {
    const currentUser = getCtxUser(c)!
    const paramId = c.req.param('id')
    const oid = safeObjectId(paramId)
    if (!oid) return c.json({ success: false, error: 'Invalid user id' }, 400)

    const userDoc = await db.collection(USERS_COLLECTION).findOne({ _id: oid } as any)
    if (!userDoc) return c.json({ success: false, error: 'User not found' }, 404)

    if (userDoc._id.toString() === currentUser.id) {
      return c.json({ success: false, error: 'Cannot delete your own account' }, 400)
    }

    const delRes = await db.collection(USERS_COLLECTION).deleteOne({ _id: oid } as any)
    if (!delRes.deletedCount) {
      return c.json({ success: false, error: 'Failed to delete user' }, 500)
    }

    // Delete associated account
    const accOid = safeObjectId(userDoc.accountId)
    if (accOid) {
      await db.collection(ACCOUNTS_COLLECTION).deleteOne({ _id: accOid } as any)
    }

    // Delete permissions
    await db.collection(USER_PERMISSIONS_COLLECTION).deleteMany({ userId: paramId } as any)

    // Delete guests & files belonging to that user
    const guestsCollection = '94884219_guests'
    const uploadedFilesCollection = '94884219_uploaded_files'

    const guestDel = await db.collection(guestsCollection).deleteMany({ userId: paramId } as any)
    const filesDel = await db.collection(uploadedFilesCollection).deleteMany({ userId: paramId } as any)

    await createAuditLog(currentUser.id, currentUser.username, 'user_deleted', 'users', {
      deletedUserUsername: userDoc.username,
      deletedGuestCount: guestDel.deletedCount,
      deletedFileCount: filesDel.deletedCount,
    })

    return c.json({
      success: true,
      message: 'User deleted successfully',
      data: { deletedGuestCount: guestDel.deletedCount, deletedFileCount: filesDel.deletedCount },
    })
  } catch (err: any) {
    console.error('[users] Delete user failed:', err?.message ?? err)
    return c.json({ success: false, error: err?.message ?? 'Failed to delete user' }, 500)
  }
})

/**
 * GET /api/users/:id/account
 */
usersApp.get('/:id/account', requireAdmin, async (c) => {
  try {
    const paramId = c.req.param('id')
    const oid = safeObjectId(paramId)
    if (!oid) return c.json({ success: false, error: 'Invalid user id' }, 400)

    const userDoc = await db.collection(USERS_COLLECTION).findOne({ _id: oid } as any)
    if (!userDoc) return c.json({ success: false, error: 'User not found' }, 404)

    const accOid = safeObjectId(userDoc.accountId)
    if (!accOid) return c.json({ success: false, error: 'Account not found' }, 404)

    const account = await db.collection(ACCOUNTS_COLLECTION).findOne({ _id: accOid } as any)
    if (!account) return c.json({ success: false, error: 'Account not found' }, 404)

    return c.json({
      success: true,
      data: {
        id: account._id.toString(),
        name: account.name,
        title: account.title,
        dateTime: account.dateTime,
        location: account.location,
        photoUrl: account.photoUrl,
        photoUrl_dashboard: account.photoUrl_dashboard,
        photoUrl_welcome: account.photoUrl_welcome,
      },
    })
  } catch (err: any) {
    console.error('[users] Fetch user account failed:', err?.message ?? err)
    return c.json({ success: false, error: err?.message ?? 'Failed to fetch user account' }, 500)
  }
})

/**
 * PATCH /api/users/:id
 */
usersApp.patch(
  '/:id',
  requireAdmin,
  zValidator('json', updateUserSchema),
  async (c: Context<AppEnv>) => {
    try {
      const currentUser = getCtxUser(c)!
      const paramId = c.req.param('id')
      const oid = safeObjectId(paramId)
      if (!oid) return c.json({ success: false, error: 'Invalid user id' }, 400)

      const updates = (c.req as any).valid('json') as z.infer<typeof updateUserSchema>

      const userDoc = await db.collection(USERS_COLLECTION).findOne({ _id: oid } as any)
      if (!userDoc) return c.json({ success: false, error: 'User not found' }, 404)

      if (userDoc._id.toString() === currentUser.id && updates.role && updates.role !== 'admin') {
        return c.json({ success: false, error: 'Cannot change your own admin role' }, 400)
      }

      // permissions
      if (updates.permissions) {
        await db.collection(USER_PERMISSIONS_COLLECTION).deleteMany({ userId: paramId } as any)
        if (updates.permissions.length) {
          await db.collection(USER_PERMISSIONS_COLLECTION).insertMany(
            updates.permissions.map((p) => ({
              userId: paramId,
              page: p.page,
              canAccess: p.canAccess,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          )
        }
        delete (updates as any).permissions
      }

      // wedding account updates
      if (
        updates.weddingTitle !== undefined ||
        updates.weddingDateTime !== undefined ||
        updates.weddingLocation !== undefined ||
        updates.weddingPhotoUrl !== undefined ||
        updates.weddingPhotoUrl_dashboard !== undefined ||
        updates.weddingPhotoUrl_welcome !== undefined
      ) {
        const accOid = safeObjectId(userDoc.accountId)
        if (!accOid) return c.json({ success: false, error: 'Account not found' }, 404)

        const accountUpdates: any = {}

        if (updates.weddingTitle !== undefined) {
          accountUpdates.name = updates.weddingTitle || ''
          accountUpdates.title = updates.weddingTitle || ''
        }

        if (updates.weddingDateTime !== undefined) {
          if (updates.weddingDateTime) {
            const d = new Date(updates.weddingDateTime)
            if (Number.isNaN(d.getTime())) {
              return c.json({ success: false, error: 'Invalid wedding date/time format' }, 400)
            }
            accountUpdates.dateTime = d
          } else {
            accountUpdates.dateTime = null
          }
        }

        if (updates.weddingLocation !== undefined) {
          accountUpdates.location = updates.weddingLocation || ''
        }

        if (updates.weddingPhotoUrl !== undefined) {
          accountUpdates.photoUrl =
            updates.weddingPhotoUrl ||
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
        }

        if (updates.weddingPhotoUrl_dashboard !== undefined) {
          let url =
            updates.weddingPhotoUrl_dashboard ||
            accountUpdates.photoUrl ||
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
          if (url.includes('undefined/')) url = url.replace('undefined/', '')
          if (url.startsWith('/api/upload/')) {
            url =
              'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
          }
          accountUpdates.photoUrl_dashboard = url
        }

        if (updates.weddingPhotoUrl_welcome !== undefined) {
          let url =
            updates.weddingPhotoUrl_welcome ||
            accountUpdates.photoUrl ||
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
          if (url.includes('undefined/')) url = url.replace('undefined/', '')
          if (url.startsWith('/api/upload/')) {
            url =
              'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop'
          }
          accountUpdates.photoUrl_welcome = url
        }

        await db.collection(ACCOUNTS_COLLECTION).updateOne(
          { _id: accOid } as any,
          { $set: { ...accountUpdates, updatedAt: new Date() } },
        )

        // bersihkan field dari updates user
        delete (updates as any).weddingTitle
        delete (updates as any).weddingDateTime
        delete (updates as any).weddingLocation
        delete (updates as any).weddingPhotoUrl
        delete (updates as any).weddingPhotoUrl_dashboard
        delete (updates as any).weddingPhotoUrl_welcome
      }

      if (Object.keys(updates).length) {
        await db.collection(USERS_COLLECTION).updateOne(
          { _id: oid } as any,
          { $set: { ...updates, updatedAt: new Date() } },
        )
      }

      await createAuditLog(currentUser.id, currentUser.username, 'user_updated', 'users', {
        updatedUserUsername: userDoc.username,
        updates,
      })

      return c.json({ success: true, message: 'User updated successfully' })
    } catch (err: any) {
      if (err?.issues) {
        return c.json({ success: false, error: 'Validation failed', issues: err.issues }, 400)
      }
      console.error('[users] Update user failed:', err?.message ?? err)
      return c.json({ success: false, error: err?.message ?? 'Failed to update user' }, 500)
    }
  },
)

export default usersApp
