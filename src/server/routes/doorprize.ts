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

export default doorprizeApp
