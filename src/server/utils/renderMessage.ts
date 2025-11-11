// src/server/utils/renderMessage.ts
import { ObjectId } from 'mongodb'
import { db } from '../db.js'

const isHexId = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)
const toOid = (v: any) => (v instanceof ObjectId ? v : isHexId(v) ? new ObjectId(v) : null)

const slugify = (s: string) =>
    (s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

export async function renderMessage(template: string, reminder: any): Promise<string> {
    // Ambil guest
    const guestId = toOid(reminder.guestId)
    const guest = await db.collection('94884219_guests').findOne(
        guestId ? { _id: guestId } : { _id: reminder.guestId as any }
    )

    // Ambil account
    const accountId = toOid(reminder.accountId)
    const account = await db.collection('94884219_accounts').findOne(
        accountId ? { _id: accountId } : { _id: reminder.accountId as any }
    )

    if (!guest) console.warn(`[renderMessage] Guest not found id=${reminder.guestId}`)
    if (!account) console.warn(`[renderMessage] Account not found id=${reminder.accountId}`)

    const guestName = guest?.name ?? reminder.guestName ?? '[Nama Tamu]'
    const mempelaiRaw = account?.title?.trim?.() || account?.name?.trim?.() || '[Nama Mempelai]'
    const linkUndangan = account?.linkUndangan.trim().replace(/\/+$/, '') || ''
    const mempelai = mempelaiRaw

    const category = guest?.category === 'VIP' ? '1' : '2';
    const session = guest?.session ?? ''
    const limit = guest?.limit ?? 1

    const link =
        `${linkUndangan}/` +
        `?to=${encodeURIComponent(guestName)}` +
        `&sesi=${encodeURIComponent(session)}` +
        `&cat=${encodeURIComponent(category)}` +
        `&lim=${encodeURIComponent(String(limit))}`

    // Replace case-insensitive
    return template
        .replace(/\[nama\]/gi, guestName)
        .replace(/\[mempelai\]/gi, mempelai)
        .replace(/\[link-undangan\]/gi, link)
}
