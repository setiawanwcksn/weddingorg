/**
 * Doorprize API Routes with Account-Based Data Isolation
 * Returns checked-in guests and manages doorprize items.
 * All operations are scoped to the authenticated user's account.
 */

import { Hono, Context } from 'hono'
import type { AppEnv } from '@shared/types'
import { ObjectId } from 'mongodb'
import { db } from "../db.js";

const doorprizeApp = new Hono<AppEnv>()

// Collections with app id prefix
const GUESTS_COLLECTION = '94884219_guests'
const DOORPRIZE_COLLECTION = '94884219_doorprizes'

// ------------------------ utils ------------------------

type CtxUser = { id: string; accountId: string; username?: string; role?: string }

function requireUser(c: Context<AppEnv>): CtxUser | null {
  const u = c.get('user') as unknown
  if (!u || typeof u !== 'object') return null
  const user = u as Partial<CtxUser>
  if (!user.id || !user.accountId) return null
  return user as CtxUser
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// ------------------------ routes ------------------------

/**
 * GET /api/doorprize/debug
 * Debug endpoint to check guest data structure and check-in status
 */
doorprizeApp.get('/debug', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)

    // Get all guests for this account
    const allGuests = await db
      .collection(GUESTS_COLLECTION)
      .find({ accountId: user.accountId })
      .project({
        name: 1,
        code: 1,
        checkInDate: 1,
        category: 1,
        tableNo: 1,
        guestCount: 1,
        status: 1,
        createdAt: 1,
      })
      .toArray()

    const analysis = {
      totalGuests: allGuests.length,
      checkedInGuests: allGuests.filter((g: any) => g.checkInDate != null).length,
      notCheckedInGuests: allGuests.filter((g: any) => g.checkInDate == null).length,
      sampleGuests: (allGuests as any[]).slice(0, 5).map((g: any) => ({
        name: g.name,
        code: g.code,
        checkInDate: g.checkInDate,
        hasCheckInDate: g.checkInDate != null,
        checkInDateType: typeof g.checkInDate,
        category: g.category,
        tableNo: g.tableNo,
        guestCount: g.guestCount,
      })),
    }

    console.log(`[doorprize-debug] Analysis for account ${user.accountId}:`, analysis)

    return c.json({ success: true, analysis })
  } catch (error: unknown) {
    console.error('[api] /doorprize/debug', errMsg(error))
    return c.json({ success: false, error: errMsg(error) ?? 'Unknown error' }, 500)
  }
})

/**
 * GET /api/doorprize/checked-in
 * Returns all guests who have checked in for the current account, optionally filtered by search term.
 */
doorprizeApp.get('/checked-in', async (c) => {
  try {
    // Get user from middleware context
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    const userId = user.id;
    const { search } = c.req.query();

    // Build query with user isolation
    const filter: any = { userId };

    // Check for checked-in guests - handle both null and undefined cases
    filter.$and = [
      { checkInDate: { $ne: null } },
      { checkInDate: { $exists: true } }
    ];

    if (search) {
      filter.$and = [
        { $or: filter.$or },
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
          ]
        }
      ];
      delete filter.$or;
    }

    console.log(`[doorprize] Searching for checked-in guests with filter:`, JSON.stringify(filter));

    const cursor = db.collection(GUESTS_COLLECTION)
      .find(filter, { projection: { name: 1, code: 1, category: 1, info: 1, session: 1, limit: 1, tableNo: 1, guestCount: 1, checkInDate: 1, phone: 1 } })
      .sort({ checkInDate: -1 })
      .limit(500);
    const list = await cursor.toArray();

    console.info(`[doorprize] Found ${list.length} checked-in guests for user ${userId}`);

    const items = list.map((g: any) => ({
      id: String(g._id),
      name: g.name,
      code: g.code,
      category: g.category,
      info: g.info,
      session: g.session,
      limit: g.limit,
      tableNo: g.tableNo,
      guestCount: g.guestCount,
      phone: g.phone,
      checkedInAt: g.checkInDate ? new Date(g.checkInDate).toISOString() : undefined,
    }));

    return c.json({
      success: true,
      items
    });
  } catch (error: any) {
    console.error('[api] /doorprize/checked-in', error?.message);
    return c.json({
      success: false,
      error: error?.message ?? 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/doorprize/prizes
 * Get all doorprizes for the current account
 */
doorprizeApp.get('/prizes', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)

    const { status } = c.req.query()

    const filter: any = { accountId: user.accountId }
    if (status) filter.status = status

    const prizes = await db.collection(DOORPRIZE_COLLECTION).find(filter).sort({ createdAt: -1 }).toArray()

    console.info(`[db] find ${DOORPRIZE_COLLECTION} account=${user.accountId} -> ${prizes.length} docs`)

    return c.json({
      success: true,
      items: (prizes as any[]).map((p) => ({
        id: String(p._id),
        accountId: p.accountId,
        name: p.name,
        description: p.description,
        prize: p.prize,
        value: p.value,
        winnerId: p.winnerId,
        winnerName: p.winnerName,
        drawnAt: p.drawnAt,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    })
  } catch (error: unknown) {
    console.error('[api] /doorprize/prizes', errMsg(error))
    return c.json({ success: false, error: errMsg(error) ?? 'Unknown error' }, 500)
  }
})

/**
 * POST /api/doorprize/prizes
 * Create a new doorprize for the current account
 */
doorprizeApp.post('/prizes', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)

    const body = await c.req.json()

    const prize = {
      ...body,
      accountId: user.accountId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection(DOORPRIZE_COLLECTION).insertOne(prize)

    console.info(`[db] insertOne ${DOORPRIZE_COLLECTION} account=${user.accountId} id=${result.insertedId}`)

    return c.json({
      success: true,
      data: { id: String(result.insertedId) },
      message: 'Doorprize created successfully',
    })
  } catch (error: unknown) {
    console.error('[api] POST /doorprize/prizes', errMsg(error))
    return c.json({ success: false, error: errMsg(error) ?? 'Unknown error' }, 500)
  }
})

/**
 * PUT /api/doorprize/prizes/:id/draw
 * Draw a winner for a doorprize
 */
doorprizeApp.put('/prizes/:id/draw', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)

    const prizeId = c.req.param('id')
    const { winnerId, winnerName } = await c.req.json()

    // Verify the prize belongs to this account
    const prize = await db.collection(DOORPRIZE_COLLECTION).findOne({
      _id: new ObjectId(prizeId),
      accountId: user.accountId,
    })
    if (!prize) {
      return c.json({ success: false, error: 'Prize not found or access denied' }, 404)
    }

    await db.collection(DOORPRIZE_COLLECTION).updateOne(
      { _id: new ObjectId(prizeId) },
      {
        $set: {
          winnerId,
          winnerName,
          drawnAt: new Date(),
          status: 'completed',
          updatedAt: new Date(),
        },
      },
    )

    console.info(
      `[db] draw winner ${DOORPRIZE_COLLECTION} account=${user.accountId} prize=${prizeId} winner=${winnerId}`,
    )

    return c.json({ success: true, message: 'Winner drawn successfully' })
  } catch (error: unknown) {
    console.error('[api] PUT /doorprize/prizes/:id/draw', errMsg(error))
    return c.json({ success: false, error: errMsg(error) ?? 'Unknown error' }, 500)
  }
})

/**
 * GET /api/doorprize/stats
 * Get doorprize statistics for the current account
 */
doorprizeApp.get('/stats', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)

    const pipeline = [
      { $match: { accountId: user.accountId } },
      {
        $group: {
          _id: null,
          totalPrizes: { $sum: 1 },
          activePrizes: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedPrizes: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalWinners: { $sum: { $cond: [{ $ne: ['$winnerId', null] }, 1, 0] } },
        },
      },
    ]

    const statsArr = await db.collection(DOORPRIZE_COLLECTION).aggregate(pipeline).toArray()
    const stats =
      statsArr[0] ?? { totalPrizes: 0, activePrizes: 0, completedPrizes: 0, totalWinners: 0 }

    console.info(`[db] stats ${DOORPRIZE_COLLECTION} account=${user.accountId}`)

    return c.json({ success: true, data: stats })
  } catch (error: unknown) {
    console.error('[api] /doorprize/stats', errMsg(error))
    return c.json({ success: false, error: errMsg(error) ?? 'Unknown error' }, 500)
  }
})

export default doorprizeApp
