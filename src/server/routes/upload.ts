/**
 * Upload API
 * - Auth via mock Bearer token (mock_token_${userId}_${ts})
 * - Simpan file sebagai base64 di Mongo
 * - Serve file kembali via GET /api/upload/:filename
 */

import { Hono, type Context, type Next } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { ObjectId } from 'mongodb'
import { db } from '../db.js'
import type { AppEnv, ContextUser } from '@shared/types';
// -------------------- Typings --------------------

const uploadApp = new Hono<AppEnv>()
export type UploadApp = typeof uploadApp

// Collections with app id prefix
const UPLOADED_FILES_COLLECTION = '94884219_uploaded_files'

// -------------------- Middleware --------------------

async function requireAuth(c: Context<AppEnv>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    console.log(`[upload] Auth header: ${authHeader ? 'Present' : 'Missing'}`)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    console.log(`[upload] Token received: ${token.slice(0, 20)}...`)

    // mock_token_${userId}_${timestamp}
    const parts = token.split('_')
    console.log('[upload] Token parts:', parts)

    if (parts.length < 4 || parts[0] !== 'mock' || parts[1] !== 'token') {
      return c.json({ success: false, error: 'Invalid token format' }, 401)
    }

    const userId = parts.slice(2, -1).join('_')
    const ts = parts[parts.length - 1]
    console.log(`[upload] Extracted userId=${userId}, ts=${ts}`)

    if (!userId) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const usersCol = db.collection<any>('94884219_users')

    let userDoc: any | null = null

    // Jika userId valid sebagai ObjectId, cari berdasarkan _id:ObjectId
    if (ObjectId.isValid(userId)) {
      userDoc = await usersCol.findOne({ _id: new ObjectId(userId) } as any)
    }

    // Jika belum ketemu, fallback cari berdasarkan username
    if (!userDoc) {
      userDoc = await usersCol.findOne({ username: userId } as any)
    }

    if (!userDoc) {
      return c.json({ success: false, error: 'User not found' }, 401)
    }

    const ctxUser: ContextUser = {
      id: userId,
      username: userDoc.username,
      accountId: userDoc.accountId,
      role: userDoc.role ?? 'user',
    }

    c.set('user', ctxUser)
    console.log(`[upload] Auth OK: ${ctxUser.username} (${ctxUser.id})`)

    await next()
  } catch (error) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : 'Authentication failed'
    console.error('[upload] Auth check failed:', msg)
    if (error && typeof error === 'object' && 'stack' in error) {
      console.error('[upload] Stack:', (error as any).stack)
    }
    return c.json({ success: false, error: msg }, 401)
  }
}

// -------------------- Routes --------------------

/**
 * GET /api/upload/test
 */
uploadApp.get('/test', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ success: false, error: 'Test failed' }, 500)
    }
    return c.json({
      success: true,
      message: 'Upload endpoint is working',
      userId: user.id,
      expectedFilenames: {
        main: `${user.id}.jpg`,
        dashboard: `${user.id}_dashboard.jpg`,
        welcome: `${user.id}_welcome.jpg`,
      },
      fieldTypes: {
        weddingPhotoUrl: 'Main photo',
        weddingPhotoUrl_dashboard: 'Dashboard photo with _dashboard suffix',
        weddingPhotoUrl_welcome: 'Welcome photo with _welcome suffix',
      },
    })
  } catch {
    return c.json({ success: false, error: 'Test failed' }, 500)
  }
})

/**
 * POST /api/upload
 * Multipart form:
 * - photo: File
 * - type: 'user' | other (optional)
 * - fieldType: weddingPhotoUrl | weddingPhotoUrl_dashboard | weddingPhotoUrl_welcome (optional)
 * - username: string (optional)
 */
uploadApp.post('/', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ success: false, error: 'upload failed' }, 500)
    }
    console.log(`[upload] Start upload user=${user.id} accountId=${user.accountId}`)

    let formData: FormData
    try {
      formData = await c.req.formData()
      console.log(`[upload] Form entries: ${Array.from(formData.entries()).length}`)
    } catch (e) {
      console.error('[upload] parse formData failed:', e)
      return c.json({ success: false, error: 'Failed to parse form data' }, 400)
    }

    for (const [k, v] of formData.entries()) {
      try {
        if (v && typeof v === 'object' && 'name' in (v as any) && 'size' in (v as any) && 'type' in (v as any)) {
          const f = v as File
          console.log(`[upload]   ${k}: File(${f.name}, ${f.size}, ${f.type})`)
        } else {
          console.log(`[upload]   ${k}: "${v}"`)
        }
      } catch (e) {
        console.error(`[upload] log entry ${k} err:`, e)
      }
    }

    const photo = formData.get('photo') as File | null
    const type = String(formData.get('type') ?? 'user')
    const fieldType = String(formData.get('fieldType') ?? type)
    const username = formData.get('username') ? String(formData.get('username')) : undefined

    if (!photo || typeof (photo as any) !== 'object') {
      return c.json({ success: false, error: 'No photo file provided' }, 400)
    }

    const name = (photo as any).name as string | undefined
    const size = (photo as any).size as number | undefined
    const mimetype = (photo as any).type as string | undefined

    if (!name || typeof name !== 'string') {
      return c.json({ success: false, error: 'Invalid file name' }, 400)
    }
    if (!size || typeof size !== 'number') {
      return c.json({ success: false, error: 'Invalid file size' }, 400)
    }
    if (!mimetype || typeof mimetype !== 'string') {
      return c.json({ success: false, error: 'Invalid file type' }, 400)
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(mimetype)) {
      return c.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        400,
      )
    }
    const max = 5 * 1024 * 1024
    if (size > max) {
      return c.json({ success: false, error: 'File size too large. Maximum size is 5MB.' }, 400)
    }

    // read to base64
    let base64Data: string
    try {
      if (typeof (photo as any).arrayBuffer === 'function') {
        const buf = await (photo as File).arrayBuffer()
        base64Data = Buffer.from(buf).toString('base64')
      } else if (typeof (photo as any).stream === 'function') {
        const chunks: Buffer[] = []
        const stream = (photo as any).stream()
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        base64Data = Buffer.concat(chunks).toString('base64')
      } else if (typeof (photo as any).text === 'function') {
        const t = await (photo as any).text()
        base64Data = Buffer.from(t).toString('base64')
      } else {
        const s = (photo as any).toString ? (photo as any).toString() : String(photo)
        base64Data = Buffer.from(s).toString('base64')
      }
    } catch (e) {
      console.error('[upload] read file error:', e)
      return c.json({ success: false, error: 'Failed to read file data' }, 500)
    }

    const ext = name.split('.').pop() || 'jpg'
    const filenameBase = username || user.id
    let filename = `${filenameBase}.${ext}`
    if (fieldType === 'weddingPhotoUrl_dashboard') filename = `${filenameBase}_dashboard.${ext}`
    else if (fieldType === 'weddingPhotoUrl_welcome') filename = `${filenameBase}_welcome.${ext}`

    const fileDoc = {
      data: base64Data,
      filename,
      mimetype,
      size,
      userId: user.id,
      accountId: user.accountId,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection(UPLOADED_FILES_COLLECTION).insertOne(fileDoc)
    if (!result.insertedId) throw new Error('Failed to save file')

    const apiDomain = process.env.AIPA_API_DOMAIN || 'http://localhost:3000'
    const fileUrl = `${apiDomain}/api/upload/${filename}`

    console.log(`[upload] File saved: ${filename} user=${user.id}`)

    return c.json({
      success: true,
      message: 'File uploaded successfully',
      data: { url: fileUrl, filename, size, type: mimetype },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to upload file'
    console.error('[upload] Upload failed:', msg, e)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/upload/:filename/exists
 */
uploadApp.get('/:filename/exists', async (c: Context<AppEnv>) => {
  try {
    const filename = c.req.param('filename')
    console.log(`[upload] exists? ${filename}`)

    const fileDoc = await db.collection(UPLOADED_FILES_COLLECTION).findOne({
      filename: { $regex: `^${filename}\\.` },
    })

    if (!fileDoc) {
      return c.json({ success: false, error: 'File not found' }, 404)
    }

    return c.json({
      success: true,
      exists: true,
      filename: fileDoc.filename,
      size: fileDoc.size,
      type: fileDoc.mimetype,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to check file'
    console.error('[upload] exists failed:', msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/upload/:filename
 * Serve file (exact match; fallback ke prefix tanpa ekstensi)
 */
uploadApp.get('/:filename', async (c: Context<AppEnv>) => {
  try {
    const filename = c.req.param('filename')
    console.log(`[upload] serve ${filename}`)

    let fileDoc =
      (await db.collection(UPLOADED_FILES_COLLECTION).findOne({ filename })) ||
      (await db
        .collection(UPLOADED_FILES_COLLECTION)
        .findOne({ filename: { $regex: `^${filename}\\.` } }))

    if (!fileDoc) {
      return c.json({ success: false, error: 'File not found' }, 404)
    }

    const bin = Buffer.from(fileDoc.data, 'base64')

    c.header('Content-Type', fileDoc.mimetype)
    c.header('Content-Length', String(fileDoc.size))
    c.header('Cache-Control', 'public, max-age=31536000')

    return c.body(bin)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to serve file'
    console.error('[upload] serve failed:', msg, e)
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * DELETE /api/upload/:filename
 */
uploadApp.delete('/:filename', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const user = c.get('user')
    const filename = c.req.param('filename')

    if (!user) {
      return c.json({ success: false, error: 'delete failed' }, 500)
    }
    const fileDoc = await db.collection(UPLOADED_FILES_COLLECTION).findOne({
      filename,
      userId: user.id,
    })

    if (!fileDoc) {
      return c.json({ success: false, error: 'File not found or access denied' }, 404)
    }

    const del = await db.collection(UPLOADED_FILES_COLLECTION).deleteOne({
      filename,
      userId: user.id,
    })

    if (!del.deletedCount) {
      return c.json({ success: false, error: 'Failed to delete file' }, 500)
    }

    console.log(`[upload] Deleted ${filename} by user=${user.id}`)
    return c.json({ success: true, message: 'File deleted successfully' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete file'
    console.error('[upload] delete failed:', msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

export default uploadApp
