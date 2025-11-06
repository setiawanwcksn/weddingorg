/**
 * Intro text management routes
 * Handles CRUD operations for user-specific intro text templates
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '@shared/types'
import { db } from "../db.js";

const introTextApp = new Hono<AppEnv>()

// -------- Utils --------
type CtxUser = { id: string; accountId?: string; username?: string; role?: string }

function requireUser(c: Context<AppEnv>): CtxUser | null {
  const u = c.get('user') as unknown
  if (u && typeof u === 'object' && (u as any).id) return u as CtxUser

  // fallback lama: header "user-id"
  const headerId = c.req.header('user-id')
  if (headerId) return { id: headerId }
  return null
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// Tipe lokal sederhana agar tidak bikin masalah rootDir
interface IntroTextDoc {
  _id?: any
  userId: string
  formalText: string
  casualText: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

// -------- Schemas --------
const createIntroTextSchema = z.object({
  formalText: z.string().min(1, 'Formal text is required'),
  casualText: z.string().min(1, 'Casual text is required'),
  isActive: z.boolean().optional().default(true),
})
type CreateBody = z.infer<typeof createIntroTextSchema>

const updateIntroTextSchema = z.object({
  formalText: z.string().min(1, 'Formal text is required').optional(),
  casualText: z.string().min(1, 'Casual text is required').optional(),
  isActive: z.boolean().optional(),
})
type UpdateBody = z.infer<typeof updateIntroTextSchema>

// -------- Routes --------

// Get intro text for current user (create default if not exists)
introTextApp.get('/', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'User ID is required' }, 400)

    const collection = db.collection('94884219_intro_texts')
    const introText = (await collection.findOne({ userId: user.id })) as IntroTextDoc | null

    if (!introText) {
      const defaultIntro: IntroTextDoc = {
        userId: user.id,
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

      const result = await collection.insertOne(defaultIntro)
      const inserted = await collection.findOne({ _id: result.insertedId })
      if (!inserted) {
        return c.json({ success: false, error: 'Failed to create default intro text' }, 500);
      }
      return c.json({
        success: true,
        data: { ...inserted, _id: String(inserted._id) },
      })
    }

    return c.json({
      success: true,
      data: { ...introText, _id: String(introText._id) },
    })
  } catch (e: unknown) {
    return c.json({ success: false, error: errMsg(e) }, 500)
  }
})

// Create intro text
introTextApp.post('/', zValidator('json', createIntroTextSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'User ID is required' }, 400)

    const body = (c.req as any).valid('json') as CreateBody
    const collection = db.collection('94884219_intro_texts')

    const existing = await collection.findOne({ userId: user.id })
    if (existing) {
      return c.json({ success: false, error: 'Intro text already exists for this user' }, 400)
    }

    const doc: IntroTextDoc = {
      userId: user.id,
      formalText: body.formalText,
      casualText: body.casualText,
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)
    const inserted = await collection.findOne({ _id: result.insertedId })

    if (!inserted) {
      return c.json({ success: false, error: 'Failed to create default intro text' }, 500);
    }

    return c.json({
      success: true,
      data: { ...inserted, _id: String(inserted._id) },
    })
  } catch (e: unknown) {
    return c.json({ success: false, error: errMsg(e) }, 500)
  }
})

// Update intro text
introTextApp.put('/', zValidator('json', updateIntroTextSchema), async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'User ID is required' }, 400)

    const body = (c.req as any).valid('json') as UpdateBody
    const collection = db.collection('94884219_intro_texts')

    const result = await collection.updateOne(
      { userId: user.id },
      { $set: { ...body, updatedAt: new Date() } },
    )

    if (!result.matchedCount) {
      return c.json({ success: false, error: 'Intro text not found' }, 404)
    }

    const updated = await collection.findOne({ userId: user.id })
    if (!updated) {
      return c.json({ success: false, error: 'Intro text not found after update' }, 404);
    }
    return c.json({
      success: true,
      data: { ...updated, _id: String(updated._id) },
    })
  } catch (e: unknown) {
    return c.json({ success: false, error: errMsg(e) }, 500)
  }
})

// Get intro text by category
introTextApp.get('/category/:category', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'User ID is required' }, 400)

    const category = c.req.param('category')
    if (!category) return c.json({ success: false, error: 'Category is required' }, 400)

    const collection = db.collection('94884219_intro_texts')
    const introText = (await collection.findOne({ userId: user.id })) as IntroTextDoc | null

    if (!introText) {
      return c.json({ success: false, error: 'Intro text not found for this user' }, 404)
    }

    const map: Record<string, keyof IntroTextDoc> = {
      Formal: 'formalText',
      Casual: 'casualText',
    }
    const field = map[category] ?? 'formalText'
    const text = introText[field] as unknown as string

    return c.json({
      success: true,
      data: { category, text, _id: String(introText._id) },
    })
  } catch (e: unknown) {
    return c.json({ success: false, error: errMsg(e) }, 500)
  }
})

// Delete intro text
introTextApp.delete('/', async (c: Context<AppEnv>) => {
  try {
    const user = requireUser(c)
    if (!user) return c.json({ success: false, error: 'User ID is required' }, 400)

    const collection = db.collection('94884219_intro_texts')
    const result = await collection.deleteOne({ userId: user.id })

    if (!result.deletedCount) {
      return c.json({ success: false, error: 'Intro text not found' }, 404)
    }
    return c.json({ success: true, message: 'Intro text deleted successfully' })
  } catch (e: unknown) {
    return c.json({ success: false, error: errMsg(e) }, 500)
  }
})

export default introTextApp
