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
import { link } from 'fs'

const usersApp = new Hono<AppEnv>()

// ------------------------ consts ------------------------

const USERS_COLLECTION = '94884219_users'
const ACCOUNTS_COLLECTION = '94884219_accounts'

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
  linkUndangan: z.string().optional(),
  title: z.string().optional(),
  dateTime: z.string().optional(),
  weddingLocation: z.string().optional(),
  welcomeText: z.string().optional(),
  guestCategories: z.array(z.string()).optional(),
  youtubeUrl: z.string().optional(),

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

interface IntroTextDoc {
  _id?: any
  userId: string
  formalText: string
  casualText: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const updateUserSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),

  // Wedding updates
  linkUndangan: z.string().optional(),
  title: z.string().optional(),
  dateTime: z.string().optional(),
  weddingLocation: z.string().optional(),
  welcomeText: z.string().optional(),
  guestCategories: z.array(z.string()).optional(),
  youtubeUrl: z.string().optional(),
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

        let activePermissions: { page: string; canAccess: boolean }[] = []
        if (u.role === 'user' && Array.isArray(u.permissions) && u.permissions.length) {
          activePermissions = u.permissions.map((p: any) => ({ page: p.page, canAccess: !!p.canAccess }))
        }
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
          permissions: activePermissions
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
      permissions,
    } = body

    // username unique
    const existing = await db.collection(USERS_COLLECTION).findOne({ username })
    if (existing) {
      return c.json({ success: false, error: 'User already exists with this username' }, 400)
    }

    // create account
    const accountDoc = {
      title: '',
      linkUndangan: '',
      dateTime: null,
      location: '',
      welcomeText: 'Selamat Datang ',
      youtubeUrl: '',
      guestCategories: ["reguler", "vip"],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const accountRes = await db.collection(ACCOUNTS_COLLECTION).insertOne(accountDoc)
    const accountId = accountRes.insertedId.toString()
    // siapkan permissions aktif (hanya yang canAccess = true)
    let activePermissions: { page: string; canAccess: boolean }[] = []

    if (role === 'user' && Array.isArray(permissions) && permissions.length) {
      activePermissions = permissions.filter((p) => p.canAccess === true)
    }

    // create user
    const userRes = await db.collection(USERS_COLLECTION).insertOne({
      username,
      password, // NOTE: hash in production
      phone,
      accountId,
      role,
      status: 'active',
      permissions: activePermissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const defaultIntro: IntroTextDoc = {
      userId: userRes.insertedId.toString(),
      formalText: `Yth. [nama]

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami :

*[mempelai]*

Berikut link undangan kami, untuk info lengkap dari acara bisa kunjungi :

[link-undangan]

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.

Mohon maaf perihal undangan hanya di bagikan melalui pesan ini.

*Note :*
_Jika link tidak bisa dibuka, silahkan copy link kemudian paste di Chrome atau Browser lainnya._
_Untuk tampilan terbaik, silahkan akses melalui Browser Chrome / Safari dan non-aktifkan Dark Mode / Mode Gelap._

Terima kasih banyak atas perhatiannya.`,
      casualText: `Halo [nama]!

Kami sangat berharap kamu bisa hadir di hari spesial kami. Kehadiranmu akan membuat hari kami lebih sempurna.
*[mempelai]*
[link-undangan]

Datang yaa dan rayakan bersama kami!`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("94884219_intro_texts").insertOne(defaultIntro)

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
      return c.json({ success: false, error: `Validation failed: ${err.issues}`, issues: err.issues }, 400)
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

    // Delete guests & files belonging to that user
    const guestsCollection = '94884219_guests'
    const uploadedFilesCollection = '94884219_uploaded_files'

    const guestDel = await db.collection(guestsCollection).deleteMany({ userId: paramId } as any)
    const filesDel = await db.collection(uploadedFilesCollection).deleteMany({ userId: paramId } as any)

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
        title: account.title,
        linkUndangan: account.linkUndangan,
        dateTime: account.dateTime,
        location: account.location,
        welcomeText: account.welcomeText,
        youtubeUrl: account.youtubeUrl,
        guestCategories: account.guestCategories,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
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

      if (Object.keys(updates).length) {
        await db.collection(USERS_COLLECTION).updateOne(
          { _id: oid } as any,
          { $set: { ...updates, updatedAt: new Date() } },
        )
      }

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

usersApp.put('/accounts/:accountId', async (c: Context<AppEnv>) => {
  try {
    const accountId = c.req.param('accountId');

    // Validate auth token
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = token.split('_')[2];

    const user = await db.collection(USERS_COLLECTION).findOne({
      _id: new ObjectId(userId),
    });

    if (!user || user.accountId !== accountId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    console.log(`[auth] accounts ${user.username} is updating account ${accountId}`);
    // Parse body JSON
    const body = await c.req.json().catch(() => null);

    if (!body) {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const updateData: any = {};

    // Optional fields — update only if sent
    if (typeof body.linkUndangan === 'string') updateData.linkUndangan = body.linkUndangan;
    if (typeof body.title === 'string') updateData.title = body.title;
    if (typeof body.location === 'string') updateData.location = body.location;
    // Optional fields — update only if sent
    if (typeof body.linkUndangan === 'string') updateData.linkUndangan = body.linkUndangan;
    if (typeof body.title === 'string') updateData.title = body.title;
    if (typeof body.location === 'string') updateData.location = body.location;
    if (typeof body.welcomeText === 'string') updateData.welcomeText = body.welcomeText;
    if (Array.isArray(body.guestCategories)) {
      updateData.guestCategories = body.guestCategories;
    }
    if (typeof body.youtubeUrl === 'string') updateData.youtubeUrl = body.youtubeUrl;


    // dateTime handler (optional)
    if (body.dateTime) {
      const dt = new Date(body.dateTime);

      if (!Number.isNaN(dt.getTime())) {
        updateData.dateTime = dt;
      } else {
        return c.json({ success: false, error: 'Invalid dateTime format' }, 400);
      }
    }

    updateData.updatedAt = new Date();

    const result = await db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(accountId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    const updated = (result && (result as any).value) || result
    if (!updated) {
      return c.json({ success: false, error: 'Account not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        account: {
          id: updated._id.toString(),
          name: updated.name,
          linkUndangan: updated.linkUndangan,
          title: updated.title ?? updated.name,
          dateTime: updated.dateTime,
          location: updated.location,
          welcomeText: updated.welcomeText,
          youtubeUrl: updated.youtubeUrl,
          guestCategories: updated.guestCategories,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update account';
    console.error('[auth] Update account failed:', msg);
    return c.json({ success: false, error: msg }, 500);
  }
});


export default usersApp
