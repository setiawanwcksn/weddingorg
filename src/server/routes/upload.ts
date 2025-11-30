/**
 * Upload API
 * - Auth via mock Bearer token (mock_token_${userId}_${ts})
 * - Simpan file sebagai base64 di Mongo
 * - Serve file kembali via GET /api/upload/:filename (+ Range streaming)
 */

import { Hono, type Context, type Next } from 'hono'
import { ObjectId } from 'mongodb'
import { db } from '../db.js'
import type { AppEnv, ContextUser } from '@shared/types'

const uploadApp = new Hono<AppEnv>()
export type UploadApp = typeof uploadApp

// Collections with app id prefix
const UPLOADED_FILES_COLLECTION = '94884219_uploaded_files'

async function requireAuth(c: Context<AppEnv>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    // format: mock_token_${userId}_${timestamp}
    const parts = token.split('_')
    if (parts.length < 4 || parts[0] !== 'mock' || parts[1] !== 'token') {
      return c.json({ success: false, error: 'Invalid token format' }, 401)
    }

    const userId = parts.slice(2, -1).join('_')
    if (!userId) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const usersCol = db.collection<any>('94884219_users')
    let userDoc: any | null = null

    if (ObjectId.isValid(userId)) {
      userDoc = await usersCol.findOne({ _id: new ObjectId(userId) } as any)
    }
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
    await next()
  } catch (error) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : 'Authentication failed'
    return c.json({ success: false, error: msg }, 401)
  }
}

/**
 * GET /api/upload/test
 */
uploadApp.get('/test', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Test failed' }, 500)
    return c.json({
      success: true,
      message: 'Upload endpoint is working',
      userId: user.id,
      expectedFilenames: {
        main: `${user.id}_weddingPhotoUrl.(jpg|png|webp|...)`,
        dashboard: `${user.id}_weddingPhotoUrl_dashboard.(jpg|png|webp|...)`,
        welcome: `${user.id}_weddingPhotoUrl_welcome.(jpg|png|webp|mp4|webm|mov)`,
      },
    })
  } catch {
    return c.json({ success: false, error: 'Test failed' }, 500)
  }
})

/**
 * POST /api/upload
 */
uploadApp.post('/', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const authUser = c.get('user')
    if (!authUser) return c.json({ success: false, error: 'Unauthorized' }, 401)

    let formData: FormData
    try {
      formData = await c.req.formData()
    } catch (e) {
      return c.json({ success: false, error: 'Failed to parse form data' }, 400)
    }

    const photo = formData.get('photo') as File | null
    const fieldTypeRaw = String(formData.get('fieldType') ?? 'weddingPhotoUrl')
    const userIdFromForm = String(formData.get('userId') ?? '').trim()

    if (!photo || typeof (photo as any) !== 'object') {
      return c.json({ success: false, error: 'No photo file provided' }, 400)
    }
    if (!userIdFromForm) {
      return c.json({ success: false, error: 'userId is required' }, 400)
    }

    if (authUser.id !== userIdFromForm && authUser.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    // --- validasi file ---
    const name = (photo as any).name as string | undefined
    const size = (photo as any).size as number | undefined
    const mimetype = (photo as any).type as string | undefined
    if (!name || typeof name !== 'string') return c.json({ success: false, error: 'Invalid file name' }, 400)
    if (!size || typeof size !== 'number') return c.json({ success: false, error: 'Invalid file size' }, 400)
    if (!mimetype || typeof mimetype !== 'string') return c.json({ success: false, error: 'Invalid file type' }, 400)

    const normalizeFieldType = (ft: string) => {
      if (ft === 'weddingPhotoUrl_dashboard') return 'weddingPhotoUrl_dashboard'
      if (ft === 'weddingPhotoUrl_welcome') return 'weddingPhotoUrl_welcome'
      return 'weddingPhotoUrl'
    }
    const fieldType = normalizeFieldType(fieldTypeRaw)

    // Allowed types per field
    const ALLOWED_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const ALLOWED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'] // mov
    const isWelcome = fieldType === 'weddingPhotoUrl_welcome'
    const isImage = ALLOWED_IMAGES.includes(mimetype)
    const isVideo = ALLOWED_VIDEOS.includes(mimetype)

    if (isWelcome ? !(isImage || isVideo) : !isImage) {
      return c.json(
        {
          success: false,
          error: isWelcome
            ? 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV.'
            : 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
        },
        400,
      )
    }

    const MAX_BYTES_IMAGE = 5 * 1024 * 1024
    const MAX_BYTES_VIDEO = 50 * 1024 * 1024
    const MAX_BYTES = isVideo ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGE
    if (size > MAX_BYTES) {
      return c.json(
        {
          success: false,
          error: isVideo ? 'File too large. Max 50MB for video.' : 'File size too large. Maximum size is 5MB.',
        },
        400,
      )
    }

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
      return c.json({ success: false, error: 'Failed to read file data' }, 500)
    }

    const extFromMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    }
    const extFromName = name.includes('.') ? name.split('.').pop()! : ''
    const ext = (extFromMime[mimetype] || extFromName || 'jpg').toLowerCase()

    // --- filename: {userId}_{fieldType}.{ext}
    const filename = `${userIdFromForm}_${fieldType}.${ext}`

    await db.collection(UPLOADED_FILES_COLLECTION).deleteMany({
      filename: { $regex: `^${userIdFromForm}_${fieldType}\\.` },
    })

    const now = new Date()
    const fileDoc = {
      data: base64Data,
      filename,
      mimetype,
      size,
      userId: userIdFromForm,
      accountId: authUser.accountId,
      type: 'user',
      updatedAt: now,
      createdAt: now,
    }

    await db.collection(UPLOADED_FILES_COLLECTION).insertOne(fileDoc)

    const apiDomain = process.env.AIPA_API_DOMAIN || 'http://localhost:3000'
    const fileUrl = `${apiDomain}/api/upload/${filename}`

    return c.json({
      success: true,
      message: 'File uploaded successfully',
      data: { url: fileUrl, filename, size, type: mimetype },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to upload file'
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/upload/:filename/exists
 * Cek berdasarkan prefix tanpa ekstensi (biar robust)
 */
uploadApp.get('/:filename/exists', async (c: Context<AppEnv>) => {
  try {
    const filename = c.req.param('filename')
    const fileDoc = await db.collection(UPLOADED_FILES_COLLECTION).findOne({
      filename: { $regex: `^${filename}(\\.|$)` },
    })
    if (!fileDoc) return c.json({ success: false, error: 'File not found' }, 404)
    return c.json({
      success: true,
      exists: true,
      filename: fileDoc.filename,
      size: fileDoc.size,
      type: fileDoc.mimetype,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to check file'
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * GET /api/upload/:filename
 * Serve file (exact match; fallback ke prefix tanpa ekstensi) + Range support
 */
uploadApp.get('/:filename', async (c: Context<AppEnv>) => {
  try {
    const filename = c.req.param('filename')

    let fileDoc =
      (await db.collection(UPLOADED_FILES_COLLECTION).findOne({ filename })) ||
      (await db.collection(UPLOADED_FILES_COLLECTION).findOne({ filename: { $regex: `^${filename}\\.` } }))

    if (!fileDoc) return c.json({ success: false, error: 'File not found' }, 404)

    const bin = Buffer.from(fileDoc.data, 'base64')
    const size = bin.length
    const range = c.req.header('range')

    c.header('Accept-Ranges', 'bytes')

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : 0
        let end = match[2] ? parseInt(match[2], 10) : size - 1
        if (isNaN(start) || isNaN(end) || start > end || start >= size) {
          c.header('Content-Range', `bytes */${size}`)
          return c.body(null, 416)
        }
        end = Math.min(end, size - 1)
        const chunk = bin.subarray(start, end + 1)
        c.header('Content-Type', fileDoc.mimetype)
        c.header('Content-Length', String(chunk.length))
        c.header('Content-Range', `bytes ${start}-${end}/${size}`)
        c.status(206)
        return c.body(chunk)
      }
    }

    // no range → kirim full
    c.header('Content-Type', fileDoc.mimetype)
    c.header('Content-Length', String(size))
    c.header('Cache-Control', 'public, max-age=31536000')
    return c.body(bin)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to serve file'
    return c.json({ success: false, error: msg }, 500)
  }
})

/**
 * DELETE /api/upload/:filename
 * Hanya pemilik file (token user) yang boleh delete
 */
uploadApp.delete('/:filename', requireAuth, async (c: Context<AppEnv>) => {
  try {
    const user = c.get('user')
    const filename = c.req.param('filename')
    if (!user) return c.json({ success: false, error: 'delete failed' }, 500)

    const fileDoc = await db.collection(UPLOADED_FILES_COLLECTION).findOne({
      filename,
      userId: user.id,
    })
    if (!fileDoc) return c.json({ success: false, error: 'File not found or access denied' }, 404)

    const del = await db.collection(UPLOADED_FILES_COLLECTION).deleteOne({
      filename,
      userId: user.id,
    })
    if (!del.deletedCount) return c.json({ success: false, error: 'Failed to delete file' }, 500)

    return c.json({ success: true, message: 'File deleted successfully' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete file'
    return c.json({ success: false, error: msg }, 500)
  }
})

export default uploadApp
