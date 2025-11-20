/**
 * Guest routes with consolidated check-in, souvenir, gift, and reminder data
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { broadcastGuestUpdate } from './realtime-guests.js'
import type { AppEnv } from '@shared/types'
import { ObjectId } from 'mongodb'
import { db } from "../db.js";

const guestsApp = new Hono<AppEnv>()

// ------------------------ utils ------------------------

type CtxUser = { id: string; accountId?: string; username?: string; role?: string }

function requireUser(c: Context<AppEnv>): CtxUser | null {
  const u = c.get('user') as unknown
  if (!u || typeof u !== 'object') return null
  const user = u as Partial<CtxUser>
  if (!user.id) return null
  return user as CtxUser
}

function isAdmin(user: CtxUser | null): boolean {
  return !!user && user.role === 'admin'
}

function ownerFilter(user: CtxUser, base: any = {}) {
  // Admin melihat semua data; non-admin dibatasi oleh userId
  if (isAdmin(user)) return { ...base }
  return { ...base, userId: user.id }
}

function byIdFilter(user: CtxUser, id: string) {
  const f: any = { _id: new ObjectId(id) }
  if (!isAdmin(user)) f.userId = user.id
  return f
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// ------------------------ schemas ------------------------

const guestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  invitationCode: z.string().min(1, 'Invitation code is required'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['Pending', 'Confirmed', 'Declined', 'Checked-In']).optional().default('Pending'),
  isInvited: z.boolean().optional().default(true),
  plusOne: z.boolean().optional().default(false),
  checkInDate: z.string().datetime().optional(),
  souvenirCount: z.number().min(0).optional(),
  souvenirRecordedAt: z.string().datetime().optional(),
  kadoCount: z.number().min(0).optional(),
  angpaoCount: z.number().min(0).optional(),
  giftNote: z.string().optional(),
  giftRecordedAt: z.string().datetime().optional(),
  reminderScheduledAt: z.string().datetime().optional(),
  reminderSentAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  // Frontend display fields
  code: z.string().optional(),
  session: z.string().optional(),
  limit: z.number().min(1).optional(),
  tableNo: z.string().optional(),
  info: z.string().optional(),
  introTextCategory: z.string().optional(),
  // Additional fields
  guestCount: z.number().min(0).optional(),
})
type GuestBody = z.infer<typeof guestSchema>

const updateGuestSchema = guestSchema.partial()
type UpdateGuestBody = z.infer<typeof updateGuestSchema>

// ------------------------ routes ------------------------

// Get all guests (admin: semua, user: miliknya)
guestsApp.get('/', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const isInvitedParam = c.req.query('isInvited')
    const isInvited =
      isInvitedParam === 'true' ? true : isInvitedParam === 'false' ? false : undefined

    const collection = db.collection('94884219_guests')
    const query: any = ownerFilter(user)
    if (isInvited !== undefined) query.isInvited = isInvited

    const guests = await collection.find(query).toArray()
    return c.json({ success: true, data: guests })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Search guests (admin: semua, user: miliknya)
guestsApp.get('/search', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const q = c.req.query('q') || ''
    const collection = db.collection('94884219_guests')
    const searchRegex = new RegExp(q, 'i')

    const guests = await collection
      .find({
        ...ownerFilter(user),
        $or: [{ name: searchRegex }, { phone: searchRegex }, { invitationCode: searchRegex }],
      })
      .toArray()

    return c.json({ success: true, data: guests })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Get guest by ID (admin: semua, user: miliknya)
guestsApp.get('/:id', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const guest = await collection.findOne(byIdFilter(user, id))

    if (!guest) return c.json({ success: false, error: 'Guest not found' }, 404)
    return c.json({ success: true, data: guest })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Create new guest (tetap tersimpan pada user yang membuat — admin pun ke user.id admin)
guestsApp.post('/', zValidator('json', guestSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const guestData = (c.req as any).valid('json') as GuestBody
    const collection = db.collection('94884219_guests')

    // unique (name, user) check — admin: unik terhadap akun admin sendiri
    const existingGuestByName = await collection.findOne({ userId: user.id, name: guestData.name })
    if (existingGuestByName) {
      return c.json(
        {
          success: false,
          error: 'Guest name already exists. Please use a different name.',
        },
        400,
      )
    }

    const result = await collection.insertOne({
      ...guestData,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return c.json({
      success: true,
      data: { _id: result.insertedId, ...guestData, userId: user.id },
    })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Create non-invited guest (walk-in)
guestsApp.post(
  '/non-invited',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().optional(),
      tableNo: z.string().optional(),
      guestCount: z.number().min(1).optional(),
      info: z.string().optional(),
      session: z.string().optional(),
      limit: z.number().min(1).optional(),
      kado: z.number().min(0).optional(),
      angpao: z.number().min(0).optional(),
      giftNote: z.string().optional(),
      souvenir: z.number().min(0).optional(),
      category: z.string().optional().default('Regular'),
    }),
  ),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c);
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401);

      const data = (c.req as any).valid('json') as {
        name: string;
        phone?: string;
        info?: string;
        tableNo?: string;
        guestCount?: number;
        kado?: number;
        angpao?: number;
        souvenir?: number;
        session?: string;
        giftNote?: string;
        limit?: number;
        category?: string;
      };

      const collection = db.collection('94884219_guests');

      const invitationCode = Date.now().toString(36).toUpperCase().slice(-7);
      const displayCode = `NI${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const now = new Date();

      const newGuest: any = {
        userId: user.id,
        name: data.name,
        phone: data.phone ?? '',
        invitationCode: invitationCode,
        code: invitationCode,
        category: data.category ?? 'Regular',
        isInvited: false,

        tableNo: data.tableNo ?? '',
        info: data.info ?? '',
        session: data.session ?? '',

        guestCount: data.guestCount ?? 0,
        limit: data.limit ?? 0,

        // hadiah & souvenir (konsisten dengan endpoint /souvenirs)
        kadoCount: 0,
        angpaoCount: 0,
        souvenirCount: 0,
        souvenirRecordedAt: null,

        // status check-in opsional
        status: null,
        checkInDate: null,

        reminderScheduledAt: null,
        reminderSentAt: null,
        createdAt: now,
        updatedAt: now,
      };

      // Isi kalau ada di body
      if (typeof data.souvenir === 'number' && data.souvenir > 0) {
        newGuest.souvenirCount = data.souvenir;
        newGuest.souvenirRecordedAt = now;
      }
      if (typeof data.angpao === 'number' && data.angpao > 0) {
        newGuest.angpaoCount = data.angpao;
        newGuest.giftRecordedAt = now;
      }
      if (typeof data.kado === 'number' && data.kado > 0) {
        newGuest.kadoCount = data.kado;
        newGuest.giftRecordedAt = now;
      }
      if (typeof data.giftNote === 'string') {
        newGuest.giftNote = data.giftNote;
        newGuest.giftRecordedAt = now;
      }

      if (
        typeof data.souvenir !== 'number' &&
        typeof data.angpao !== 'number' &&
        typeof data.kado !== 'number'
      ) {
        newGuest.status = 'Checked-In';
        newGuest.checkInDate = now;
      }

      const result = await collection.insertOne(newGuest);

      return c.json({
        success: true,
        data: { ...newGuest, _id: result.insertedId },
        message: 'Non-invited guest added successfully',
      });
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500);
    }
  },
);


// Update guest
guestsApp.put('/:id', zValidator('json', updateGuestSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const updateData = (c.req as any).valid('json') as UpdateGuestBody

    const collection = db.collection('94884219_guests')

    const existingGuest = await collection.findOne(byIdFilter(user, id))
    if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

    const result = await collection.findOneAndUpdate(
      byIdFilter(user, id),
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )

    const updated = (result && (result as any).value) || result

    // kirim ke pemilik data sebenarnya
    const targetOwnerId = (existingGuest as any)?.userId ?? user.id
    broadcastGuestUpdate('guest_updated', id, String(targetOwnerId))

    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Clear guest check-in
guestsApp.post('/:id/clear-checkin', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const before = await collection.findOne(byIdFilter(user, id))

    if (!before) return c.json({ success: false, error: 'Guest not found' }, 404)

    if ((before as any).isInvited === false && (before as any).souvenirCount <= 0 && (before as any).kadoCount <= 0 && (before as any).angpaoCount <= 0) {
      const deleteResult = await collection.deleteOne(byIdFilter(user, id))
      if (deleteResult.deletedCount === 0) {
        return c.json({ success: false, error: 'Failed to delete guest' }, 500)
      }
      const targetOwnerId = (before as any)?.userId ?? user.id
      broadcastGuestUpdate('guest_checkin_cleared', id, String(targetOwnerId))
      return c.json({ success: true, message: 'Guest deleted because not invited' })
    }

    const result = await collection.findOneAndUpdate(
      byIdFilter(user, id),
      { $set: { checkInDate: null, guestCount: 1, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )

    const updated = (result && (result as any).value) || result
    if (!updated) return c.json({ success: false, error: 'Guest not found' }, 404)

    const targetOwnerId = (before as any)?.userId ?? user.id
    broadcastGuestUpdate('guest_checkin_cleared', id, String(targetOwnerId))
    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Check-in guest
guestsApp.post('/:id/checkin', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')

    let guestCount = 1
    try {
      const body = await c.req.json()
      if (body?.guestCount && typeof body.guestCount === 'number' && body.guestCount > 0) {
        guestCount = body.guestCount
      }
    } catch {
      // ignore body parse errors; fallback ke 1
    }

    const collection = db.collection('94884219_guests')

    const before = await collection.findOne(byIdFilter(user, id))

    const result = await collection.findOneAndUpdate(
      byIdFilter(user, id),
      {
        $set: {
          checkInDate: new Date(),
          guestCount,
          status: 'Checked-In',
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    )

    const updated = (result && (result as any).value) || result

    if (!updated) return c.json({ success: false, error: 'Guest not found' }, 404)

    const targetOwnerId = (before as any)?.userId ?? user.id
    broadcastGuestUpdate('guest_checked_in', id, String(targetOwnerId))
    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Assign souvenir to guest
guestsApp.post(
  '/:id/souvenirs',
  zValidator(
    'json',
    z.object({
      count: z.number().min(1),
      kado: z.number().min(0).optional(),
      angpao: z.number().min(0).optional(),
    }),
  ),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c);
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401);

      const id = c.req.param('id');
      const { count, kado, angpao } = (c.req as any).valid('json') as {
        count: number;
        kado?: number;
        angpao?: number;
      };

      const collection = db.collection('94884219_guests');

      const $set: Record<string, any> = {
        souvenirCount: count,
        souvenirRecordedAt: new Date(),
        updatedAt: new Date(),
      };

      if (typeof kado === 'number') {
        $set.kadoCount = kado;
        $set.giftRecordedAt = new Date()
      }
      if (typeof angpao === 'number') {
        $set.angpaoCount = angpao;
        $set.giftRecordedAt = new Date()
      }

      const result = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        { $set },
        { returnDocument: 'after' },
      );

      const updated = (result && (result as any).value) || result;
      if (!updated)
        return c.json({ success: false, error: 'Guest not found' }, 404);

      return c.json({ success: true, data: updated });
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500);
    }
  },
);

// Delete souvenir data from guest
guestsApp.delete('/:id/souvenirs', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user)
      return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const guest = await collection.findOne(byIdFilter(user, id))

    if (!guest)
      return c.json({ success: false, error: 'Guest not found' }, 404)

    let result

    if ((guest as any).isInvited === false && (guest as any).status !== 'Checked-In') {
      result = await collection.deleteOne(byIdFilter(user, id))

      return c.json({
        success: true,
        message: 'Guest deleted because not invited',
        deletedCount: (result as any)?.deletedCount ?? 0,
      })
    } else {
      const updateResult = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        {
          $set: {
            souvenirCount: 0,
            souvenirRecordedAt: null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )

      const updated = (updateResult as any)?.value || updateResult
      if (!updated)
        return c.json({ success: false, error: 'Guest not found after update' }, 404)

      return c.json({
        success: true,
        message: 'Souvenir reset for invited guest',
        data: updated,
      })
    }
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Delete souvenir data from guest
guestsApp.delete('/:id/gifts', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user)
      return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const guest = await collection.findOne(byIdFilter(user, id))

    if (!guest)
      return c.json({ success: false, error: 'Guest not found' }, 404)

    let result

    if ((guest as any).isInvited === false && (guest as any).status !== 'Checked-In') {
      result = await collection.deleteOne(byIdFilter(user, id))

      return c.json({
        success: true,
        message: 'Guest deleted because not invited',
        deletedCount: (result as any)?.deletedCount ?? 0,
      })
    } else {
      const updateResult = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        {
          $set: {
            kadoCount: 0,
            angpaoCount: 0,
            giftNote: '',
            giftRecordedAt: null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )

      const updated = (updateResult as any)?.value || updateResult
      if (!updated)
        return c.json({ success: false, error: 'Guest not found after update' }, 404)

      return c.json({
        success: true,
        message: 'Souvenir reset for invited guest',
        data: updated,
      })
    }
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Assign gift to guest
guestsApp.post(
  '/:id/gifts',
  zValidator(
    'json',
    z.object({
      type: z.enum(['Angpao', 'Kado']).optional(),
      count: z.number().min(1),
      kado: z.number().min(0).optional(),
      angpao: z.number().min(0).optional(),
    }),
  ),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const id = c.req.param('id')
      const { type, count, kado, angpao } = (c.req as any).valid('json') as { type?: 'Angpao' | 'Kado'; count: number; kado?: number; angpao?: number }

      const collection = db.collection('94884219_guests')

      const existingGuest = await collection.findOne(byIdFilter(user, id))
      if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

      const result = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        { $set: { giftType: type ?? null, kadoCount: kado ?? 0, angpaoCount: angpao ?? 0, updatedAt: new Date(), giftRecordedAt: new Date() } },
        { returnDocument: 'after' },
      )

      const updated = (result && (result as any).value) || result
      return c.json({ success: true, data: updated })
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Schedule reminder for guest
guestsApp.post(
  '/:id/reminders',
  zValidator('json', z.object({ scheduledAt: z.string().datetime() })),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const id = c.req.param('id')
      const { scheduledAt } = (c.req as any).valid('json') as { scheduledAt: string }

      const collection = db.collection('94884219_guests')

      const result = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        { $set: { reminderScheduledAt: new Date(scheduledAt), updatedAt: new Date() } },
        { returnDocument: 'after' },
      )

      const updated = (result && (result as any).value) || result
      if (!updated) return c.json({ success: false, error: 'Guest not found' }, 404)

      return c.json({ success: true, data: updated })
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Update guest status
guestsApp.patch(
  '/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.enum(['Pending', 'Confirmed', 'Declined']),
      reminderScheduledAt: z.string().datetime().nullable().optional(),
    }),
  ),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const id = c.req.param('id')
      const { status, reminderScheduledAt } = (c.req as any).valid('json') as {
        status: 'Pending' | 'Confirmed' | 'Declined'
        reminderScheduledAt?: string | null
      }

      const collection = db.collection('94884219_guests')

      const existingGuest = await collection.findOne(byIdFilter(user, id))
      if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

      // If set back to Pending, clean reminders for the same account (if available)
      if (status === 'Pending') {
        try {
          const remindersCollection = db.collection('94884219_reminders')
          const usersCollection = db.collection('94884219_users')

          // user.id bisa ObjectId atau string
          let userDoc: any = null;
          try {
            userDoc = await usersCollection.findOne({ _id: new ObjectId(user.id) });
          } catch (_) {
            userDoc = await usersCollection.findOne({ _id: user.id as any });
          }
          const accountId = userDoc?.accountId

          if (accountId) {
            await remindersCollection.deleteMany({ guestId: id, accountId })
          }
        } catch (e) {
          console.error('[guests:status] cleanup reminders error:', errMsg(e))
        }
      }

      const update: any = { status, updatedAt: new Date() }
      if (reminderScheduledAt !== undefined) {
        update.reminderScheduledAt = reminderScheduledAt ? new Date(reminderScheduledAt) : null
      }

      const result = await collection.findOneAndUpdate(
        byIdFilter(user, id),
        { $set: update },
        { returnDocument: 'after' },
      )

      const updated = (result && (result as any).value) || result

      return c.json({ success: true, data: updated })
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Delete guest by ID
guestsApp.delete('/:id', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const guestsCol = db.collection('94884219_guests')
    const remindersCol = db.collection('94884219_reminders')

    // byIdFilter(user, id) adalah helper-mu yang sudah aware admin/non-admin
    const result = await guestsCol.deleteOne(byIdFilter(user, id))
    if (!result.deletedCount) {
      return c.json({ success: false, error: 'Guest not found' }, 404)
    }

    const remRes = await remindersCol.deleteMany({ guestId: id })

    return c.json({
      success: true,
      deletedGuestId: id,
      deletedReminders: remRes.deletedCount ?? 0,
    })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Check if guest name exists (admin: cek global)
guestsApp.get('/check-name/:name', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const name = decodeURIComponent(c.req.param('name'))
    const collection = db.collection('94884219_guests')

    const existingGuest = await collection.findOne({
      ...ownerFilter(user),
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    })

    return c.json({ success: true, data: { exists: !!existingGuest, guest: existingGuest } })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Get guest statistics for dashboard (admin: global, user: miliknya)
guestsApp.get('/stats', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const collection = db.collection('94884219_guests')
    const guests = await collection.find(ownerFilter(user)).toArray()

    const totalGuests = guests.length
    const confirmedGuests = guests.filter((g: any) => g.status === 'Confirmed').length
    const declinedGuests = guests.filter((g: any) => g.status === 'Declined').length
    const pendingGuests = guests.filter((g: any) => g.status === 'Pending').length
    const checkedInGuests = guests.filter((g: any) => g.checkInDate).length
    const plusOneGuests = guests.filter((g: any) => g.plusOne).length

    const totalWithPlusOne = totalGuests + plusOneGuests
    const confirmedWithPlusOne =
      confirmedGuests + guests.filter((g: any) => g.status === 'Confirmed' && g.plusOne).length

    const vipGuests = guests.filter((g: any) => g.category === 'VIP').length
    const regularGuests = totalGuests - vipGuests

    const stats = {
      totalGuests,
      confirmedGuests,
      declinedGuests,
      pendingGuests,
      checkedInGuests,
      plusOneGuests,
      totalWithPlusOne,
      confirmedWithPlusOne,
      vipGuests,
      regularGuests,
      attendanceRate: totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0,
      checkInRate: confirmedGuests > 0 ? Math.round((checkedInGuests / confirmedGuests) * 100) : 0,
    }

    return c.json({ success: true, data: stats })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Delete all guests (self or admin-wide) + cascade reminders
guestsApp.delete('/bulk/all', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const guestsCol = db.collection('94884219_guests')
    const remindersCol = db.collection('94884219_reminders')

    // Tentukan filter sesuai role
    const guestFilter: any = isAdmin(user) ? {} : { userId: user.id }
    // Untuk reminders, kita manfaatkan userId/accountId yang memang sudah ada
    const reminderFilter: any = isAdmin(user)
      ? {}
      : {
        $or: [
          { userId: user.id },
        ],
      }

    console.log('[guests:delete-all] guestFilter:')
    console.log('[guests:delete-all] reminderFilter:')

    // Eksekusi penghapusan
    const guestRes = await guestsCol.deleteMany(guestFilter)
    const remRes = await remindersCol.deleteMany(reminderFilter)

    return c.json({
      success: true,
      scope: isAdmin(user) ? 'all' : 'self',
      deletedGuests: guestRes.deletedCount ?? 0,
      deletedReminders: remRes.deletedCount ?? 0,
    })
  } catch (error: unknown) {
    return c.json({ success: false, error: "asdasdasd" }, 500)
  }
})


export default guestsApp
