/**
 * Bulk Import Routes
 * Handles bulk guest import from Excel/CSV files
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '@shared/types'
import { db } from "../db.js";

const bulkImportApp = new Hono<AppEnv>()
type CtxUser = { id: string; accountId?: string; username?: string; role?: string }

// Guest data validation schema
const guestImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  category: z.string().optional(),
  session: z.coerce.string().optional(),
  limit: z.coerce.string().optional(),
  notes: z.string().optional(),
  tableNo: z.coerce.string().optional(),
})

// Bulk import schema
const bulkImportSchema = z.object({
  guests: z.array(guestImportSchema).min(1, 'At least one guest is required'),
  generateInvitations: z.boolean().optional().default(true),
})

// Helper types (untuk cast hasil c.req.valid('json'))
type GuestImport = z.infer<typeof guestImportSchema>
type BulkImportBody = z.infer<typeof bulkImportSchema>

/**
 * Format Indonesian phone number
 */
function formatIndonesianPhone(phone: string): string {
  if (!phone) return ''

  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle +62 prefix
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1)
  }

  // Handle 62 prefix (already correct)
  if (cleaned.startsWith('62')) {
    return cleaned
  }

  // Handle 0 prefix (local format)
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1)
  }

  // Add 62 prefix if no country code
  if (cleaned.length > 0 && !cleaned.startsWith('62')) {
    return '62' + cleaned
  }

  return cleaned
}

function requireUser(c: Context<AppEnv>): CtxUser | null {
  const u = c.get('user') as unknown
  if (!u || typeof u !== 'object') return null
  const user = u as Partial<CtxUser>
  if (!user.id) return null
  return user as CtxUser
}

/**
 * Bulk import guests
 * POST /api/bulk-import/guests
 */
bulkImportApp.post(
  '/guests',
  zValidator('json', bulkImportSchema),
  async (c: Context<AppEnv>) => {
    try {
      const body = (c.req as any).valid('json') as BulkImportBody
      const { guests, generateInvitations } = body

      const user = requireUser(c)
      if (!user) return c.json({ success: false, error: 'No token provided' }, 401)

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        importedGuests: [] as any[],
      }

      const batchSize = 50
      let idxGuest = 1

      for (let i = 0; i < guests.length; i += batchSize) {
        const batch = guests.slice(i, i + batchSize)
        console.log(
          `[Bulk Import] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(guests.length / batchSize)}`,
        )

        for (let j = 0; j < batch.length; j++) {
          const guest: GuestImport = batch[j]
          const rowIndex = i + j + 1

          try {
            // Format phone number
            const formattedPhone = formatIndonesianPhone(guest.phone)

            // Validate phone number
            if (!formattedPhone.startsWith('62')) {
              throw new Error('Phone number must be formatted to Indonesian format (62...)')
            }

            // Generate unique invitation code
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

            let code = '';
            for (let i = 0; i < 5; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const invitationCode = `GUEST-${code}`;

            const guestData = {
              name: guest.name,
              phone: formattedPhone,
              category: guest.category,
              session: guest.session,
              limit: guest.limit,
              notes: guest.notes || '',
              tableNo: guest.tableNo || '',
              code: invitationCode,
              status: 'Pending' as const,
              plusOne: false,
              introTextCategory: 'Formal',
              userId: user.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const insertResult = await db.collection('94884219_guests').insertOne(guestData)

            if (insertResult.insertedId) {
              results.success++
              results.importedGuests.push({
                ...guestData,
                _id: insertResult.insertedId,
              })
              console.log(`[Bulk Import] Successfully imported guest: ${guest.name}`)
            } else {
              throw new Error('Failed to insert guest into database')
            }
          } catch (error: unknown) {
            results.failed++
            const msg = error instanceof Error ? error.message : String(error)
            const errorMessage = `Row ${rowIndex}: ${msg}`
            results.errors.push(errorMessage)
            console.error(`[Bulk Import] Error importing guest ${rowIndex}:`, msg)
          }
        }

        if (i + batchSize < guests.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log(`[Bulk Import] Import complete. Success: ${results.success}, Failed: ${results.failed}`)

      return c.json({
        success: true,
        data: {
          totalProcessed: guests.length,
          success: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 10),
          importedGuests: results.importedGuests.slice(0, 5),
          generateInvitations: !!generateInvitations,
        },
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Bulk import error:', msg)
      return c.json(
        {
          success: false,
          error: msg || 'Failed to process bulk import',
        },
        500,
      )
    }
  },
)

export default bulkImportApp
