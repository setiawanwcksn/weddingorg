/**
 * Gift Distribution Routes
 * Handles multiple gift types per guest (both Kado and Angpao)
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '@shared/types'
import { ObjectId } from 'mongodb'
import { db } from "../db.js";

const giftDistributionsApp = new Hono<AppEnv>()

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

const giftDistributionSchema = z.object({
  guestId: z.string().min(1, 'Guest ID is required'),
  guestName: z.string().min(1, 'Guest name is required'),
  giftCount: z.number().min(1, 'Gift count must be at least 1'),
  giftType: z.enum(['Angpao', 'Kado']), // jangan beri argumen kedua (itu penyebab TS error)
  note: z.string().optional(),
})

type GiftDistributionBody = z.infer<typeof giftDistributionSchema>

// ------------------------ routes ------------------------

// Get all gift distributions for a guest
giftDistributionsApp.get('/guest/:guestId', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const guestId = c.req.param('guestId')
    console.log(`[GiftDistribution] Fetching distributions for guest=${guestId} by user=${user.id}`)

    const collection = db.collection('94884219_gift_distributions')
    const distributions = await collection
      .find({ guestId, userId: user.id })
      .toArray()

    console.log(
      `[GiftDistribution] Found ${distributions.length} distributions for guest=${guestId}`,
    )
    return c.json({ success: true, data: distributions })
  } catch (error: unknown) {
    console.error('Error fetching gift distributions:', errMsg(error))
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Create or update gift distribution
giftDistributionsApp.post(
  '/',
  zValidator('json', giftDistributionSchema),
  async (c: Context<AppEnv>) => {
    try {
      const user = requireUser(c)
      if (!user) {
        console.error('[GiftDistribution] No user found in context')
        return c.json({ success: false, error: 'No token provided' }, 401)
      }

      // zValidator sudah validasi; cast supaya bukan 'never'
      const distributionData = (c.req as any).valid('json') as GiftDistributionBody
      console.log(
        `[GiftDistribution] Upserting distribution user=${user.id}:`,
        distributionData,
      )

      // Verify guest belongs to user
      const guestCollection = db.collection('94884219_guests')
      const guest = await guestCollection.findOne({
        _id: new ObjectId(distributionData.guestId),
        userId: user.id,
      })

      if (!guest) {
        console.error(
          `[GiftDistribution] Guest not found or not owned. guestId=${distributionData.guestId}, userId=${user.id}`,
        )
        return c.json(
          { success: false, error: 'Guest not found or does not belong to user' },
          404,
        )
      }

      const collection = db.collection('94884219_gift_distributions')

      // Check if distribution already exists for this guest and gift type (per user)
      const existingDistribution = await collection.findOne({
        guestId: distributionData.guestId,
        giftType: distributionData.giftType,
        userId: user.id,
      })

      let result: any
      if (existingDistribution) {
        console.log(
          `[GiftDistribution] Updating existing distribution guest=${distributionData.guestId}, type=${distributionData.giftType}`,
        )
        // Update existing distribution
        result = await collection.findOneAndUpdate(
          {
            guestId: distributionData.guestId,
            giftType: distributionData.giftType,
            userId: user.id,
          },
          {
            $set: {
              giftCount: distributionData.giftCount,
              guestName: distributionData.guestName,
              note: distributionData.note || '',
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
      } else {
        console.log(
          `[GiftDistribution] Creating new distribution guest=${distributionData.guestId}, type=${distributionData.giftType}`,
        )
        // Create new distribution
        const insertResult = await collection.insertOne({
          ...distributionData,
          note: distributionData.note || '',
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        result = {
          _id: insertResult.insertedId,
          ...distributionData,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      console.log('[GiftDistribution] Distribution upserted:', result)
      return c.json({ success: true, data: result })
    } catch (error: unknown) {
      console.error('[GiftDistribution] Upsert error:', errMsg(error))
      return c.json({ success: false, error: errMsg(error) }, 500)
    }
  },
)

// Delete gift distribution
giftDistributionsApp.delete('/:id', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const id = c.req.param('id')
    console.log(`[GiftDistribution] Deleting distribution id=${id} for user=${user.id}`)

    const collection = db.collection('94884219_gift_distributions')
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: user.id,
    })

    if (!result.deletedCount) {
      return c.json({ success: false, error: 'Gift distribution not found' }, 404)
    }

    console.log('[GiftDistribution] Distribution deleted')
    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting gift distribution:', errMsg(error))
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

// Get gift statistics for a guest
giftDistributionsApp.get('/guest/:guestId/stats', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const guestId = c.req.param('guestId')
    console.log(`[GiftDistribution] Stats for guest=${guestId} by user=${user.id}`)

    const collection = db.collection('94884219_gift_distributions')
    const distributions = await collection
      .find<{ giftType: 'Angpao' | 'Kado'; giftCount: number }>({
        guestId,
        userId: user.id,
      })
      .project({ giftType: 1, giftCount: 1, _id: 0 })
      .toArray()

    const angpaoCount = distributions
      .filter((d) => d.giftType === 'Angpao')
      .reduce((sum: number, d) => sum + (d.giftCount ?? 0), 0)

    const kadoCount = distributions
      .filter((d) => d.giftType === 'Kado')
      .reduce((sum: number, d) => sum + (d.giftCount ?? 0), 0)

    const stats = {
      totalGifts: distributions.length,
      angpaoCount,
      kadoCount,
      hasAngpao: angpaoCount > 0,
      hasKado: kadoCount > 0,
      distributions,
    }

    console.log(`[GiftDistribution] Stats guest=${guestId}:`, stats)
    return c.json({ success: true, data: stats })
  } catch (error: unknown) {
    console.error('Error fetching gift statistics:', errMsg(error))
    return c.json({ success: false, error: errMsg(error) }, 500)
  }
})

export default giftDistributionsApp
