/**
 * Guest routes with consolidated check-in, souvenir, gift, and reminder data
 */

import { Hono, Context } from 'hono'
import { date, z } from 'zod'
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
  giftType: z.enum(['Angpao', 'Kado']).optional(),
  giftCount: z.number().min(0).optional(),
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
  dietaryRequirements: z.string().optional(),
  guestCount: z.number().min(1).optional().default(1),
})
type GuestBody = z.infer<typeof guestSchema>

const updateGuestSchema = guestSchema.partial()
type UpdateGuestBody = z.infer<typeof updateGuestSchema>

// ------------------------ routes ------------------------

// Get all guests (user-specific)
guestsApp.get('/', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const isInvitedParam = c.req.query('isInvited')
    const isInvited =
      isInvitedParam === 'true' ? true : isInvitedParam === 'false' ? false : undefined

    const collection = db.collection('94884219_guests')
    const query: any = { userId: user.id }
    if (isInvited !== undefined) query.isInvited = isInvited

    const guests = await collection.find(query).toArray()
    return c.json({ success: true, data: guests })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Search guests (user-specific)
guestsApp.get('/search', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const q = c.req.query('q') || ''
    const collection = db.collection('94884219_guests')
    const searchRegex = new RegExp(q, 'i')

    const guests = await collection
      .find({
        userId: user.id,
        $or: [{ name: searchRegex }, { phone: searchRegex }, { invitationCode: searchRegex }],
      })
      .toArray()

    return c.json({ success: true, data: guests })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Get guest by ID (user-specific)
guestsApp.get('/:id', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const guest = await collection.findOne({ _id: new ObjectId(id), userId: user.id })

    if (!guest) return c.json({ success: false, error: 'Guest not found' }, 404)
    return c.json({ success: true, data: guest })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Create new guest (user-specific)
guestsApp.post('/', zValidator('json', guestSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const guestData = (c.req as any).valid('json') as GuestBody
    const collection = db.collection('94884219_guests')

    // unique (name, user) check
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
    // unique (invitationCode, user) check
    const existingGuestByCode = await collection.findOne({
      userId: user.id,
      invitationCode: guestData.invitationCode,
    })
    if (existingGuestByCode) {
      return c.json(
        {
          success: false,
          error: `Invitation code "${guestData.invitationCode}" already exists. Please use a different code.`,
        },
        400,
      )
    }

    if (!guestData.code) guestData.code = guestData.invitationCode

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

// Create non-invited guest (walk-in) - user-specific
guestsApp.post(
  '/non-invited',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().optional(),
      tableNo: z.string().optional(),
      guestCount: z.number().min(1).default(1),
      info: z.string().optional(),
      session: z.string().optional(),
      limit: z.number().min(1).optional(),
      category: z.enum(['Regular', 'VIP']).optional().default('Regular'),
    }),
  ),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const data = (c.req as any).valid('json') as {
        name: string
        phone?: string
        tableNo?: string
        info?: string
        guestCount?: number
        session?: string
        limit?: number
        category?: 'Regular' | 'VIP'
      }

      const collection = db.collection('94884219_guests')

      const invitationCode = `NI-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      const displayCode = `NI${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      const newGuest = {
        userId: user.id,
        name: data.name,
        phone: data.phone || '',
        invitationCode,
        category: data.category || 'Regular',
        status: 'Checked-In',
        isInvited: false,
        checkInDate: new Date(),
        tableNo: data.tableNo || '',
        info: data.info || '',
        guestCount: data.guestCount || 1,
        plusOne: (data.guestCount || 1) > 1,
        code: displayCode,
        session: data.session || '',
        limit: data.limit || data.guestCount || 1,
        giftType: null,
        kadoCount: 0,
        angpaoCount: 0,
        giftCount: 0,
        souvenirCount: 0,
        souvenirRecordedAt: null,
        reminderScheduledAt: null,
        reminderSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await collection.insertOne(newGuest)

      return c.json({
        success: true,
        data: { ...newGuest, _id: result.insertedId },
        message: 'Non-invited guest added successfully',
      })
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Update guest (user-specific)
guestsApp.put('/:id', zValidator('json', updateGuestSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const updateData = (c.req as any).valid('json') as UpdateGuestBody

    const collection = db.collection('94884219_guests')

    const existingGuest = await collection.findOne({ _id: new ObjectId(id), userId: user.id })
    if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: user.id },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )

    // result dari driver lama bisa berupa dokumen langsung; jadikan aman:
    const updated = (result && (result as any).value) || result

    broadcastGuestUpdate('guest_updated', id, user.id)

    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Clear guest check-in (user-specific)
guestsApp.post('/:id/clear-checkin', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: user.id },
      { $set: { checkInDate: null, guestCount: 1, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )

    const updated = (result && (result as any).value) || result

    if (!updated) return c.json({ success: false, error: 'Guest not found' }, 404)

    broadcastGuestUpdate('guest_checkin_cleared', id, user.id)
    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Check-in guest (user-specific)
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

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: user.id },
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

    broadcastGuestUpdate('guest_checked_in', id, user.id)
    return c.json({ success: true, data: updated })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Assign souvenir to guest (user-specific)
guestsApp.post(
  '/:id/souvenirs',
  zValidator('json', z.object({ count: z.number().min(1) })),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const id = c.req.param('id')
      const { count } = (c.req as any).valid('json') as { count: number }

      const collection = db.collection('94884219_guests')

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), userId: user.id },
        { $set: { souvenirCount: count, souvenirRecordedAt: new Date(), updatedAt: new Date() } },
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

// Delete souvenir data from guest (user-specific)
guestsApp.delete('/:id/souvenirs', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user)
      return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const guest = await collection.findOne({
      _id: new ObjectId(id),
      userId: user.id,
    })

    if (!guest)
      return c.json({ success: false, error: 'Guest not found' }, 404)

    let result

    if (guest.invited === false) {
      result = await collection.deleteOne({
        _id: new ObjectId(id),
        userId: user.id,
      })

      return c.json({
        success: true,
        message: 'Guest deleted because not invited',
        deletedCount: result.deletedCount,
      })
    } else {
      const updateResult = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), userId: user.id },
        {
          $set: {
            souvenirCount: 0,
            souvenirRecordedAt: null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )

      const updated = updateResult?.value || updateResult
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


// Assign gift to guest (user-specific)
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
      const { type, count, kado, angpao } = (c.req as any).valid('json') as { type: 'Angpao' | 'Kado'; count: number; kado?: number; angpao?: number }

      const collection = db.collection('94884219_guests')

      const existingGuest = await collection.findOne({ _id: new ObjectId(id), userId: user.id })
      if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), userId: user.id },
        { $set: { giftType: type, kadoCount: kado, angpaoCount: angpao, giftCount: count, updatedAt: new Date(), giftRecordedAt: new Date() } },
        { returnDocument: 'after' },
      )

      const updated = (result && (result as any).value) || result
      return c.json({ success: true, data: updated })
    } catch (error: unknown) {
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Schedule reminder for guest (user-specific)
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
        { _id: new ObjectId(id), userId: user.id },
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

// Update guest status (user-specific)
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

      const existingGuest = await collection.findOne({ _id: new ObjectId(id), userId: user.id })
      if (!existingGuest) return c.json({ success: false, error: 'Guest not found' }, 404)

      // If set back to Pending, clean reminders for the same account (if available)
      if (status === 'Pending') {
        try {
          const remindersCollection = db.collection('94884219_reminders')
          const usersCollection = db.collection('94884219_users')
          // user.id format bisa string ObjectId; aman pakai try-catch
          let userDoc: any = null;
          try {
            // coba sebagai ObjectId
            userDoc = await usersCollection.findOne({ _id: new ObjectId(user.id) });
          } catch (_) {
            // userId bukan ObjectId yang valid → lanjut fallback
          }
          if (!userDoc) {
            // fallback: _id tersimpan sebagai string
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
        { _id: new ObjectId(id), userId: user.id },
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

// Delete guest (user-specific)
guestsApp.delete('/:id', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const id = c.req.param('id')
    const collection = db.collection('94884219_guests')
    const result = await collection.deleteOne({ _id: new ObjectId(id), userId: user.id })

    if (!result.deletedCount) return c.json({ success: false, error: 'Guest not found' }, 404)

    return c.json({ success: true })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Check if guest name exists (user-specific)
guestsApp.get('/check-name/:name', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const name = decodeURIComponent(c.req.param('name'))
    const collection = db.collection('94884219_guests')

    const existingGuest = await collection.findOne({
      userId: user.id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    })

    return c.json({ success: true, data: { exists: !!existingGuest, guest: existingGuest } })
  } catch (error: unknown) {
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Get guest statistics for dashboard (user-specific)
guestsApp.get('/stats', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

    const collection = db.collection('94884219_guests')
    const guests = await collection.find({ userId: user.id }).toArray()

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

export default guestsApp
