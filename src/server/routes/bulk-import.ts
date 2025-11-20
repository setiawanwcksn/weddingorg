/**
 * Bulk Import Routes
 * Handles bulk guest import from Excel/CSV files
 */

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '@shared/types'

// NOTE: Jika db bukan global, ganti deklarasi ini dengan import yang sesuai.
declare const db: any

const bulkImportApp = new Hono<AppEnv>()

// Guest data validation schema
const guestImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  category: z.string().optional().default('Regular'),
  session: z.number().min(1).max(2),
  limit: z.number().min(1).max(10),
  notes: z.string().optional(),
  tableNo: z.string().optional(),
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

/**
 * Generate unique invitation code
 */
async function generateUniqueInvitationCode(baseCode: string, accountId: string): Promise<string> {
  let code = baseCode
  let counter = 1

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const existingGuest = await db.collection('94884219_guests').findOne({
        code,
        accountId,
      })

      if (existingGuest) {
        code = `${baseCode}-${counter}`
        counter++

        // Safety check to prevent infinite loop
        if (counter > 100) {
          code = `${baseCode}-${Date.now()}`
          break
        }
      } else {
        break
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error checking invitation code:', msg)
      code = `${baseCode}-${Date.now()}`
      break
    }
  }

  return code
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
      // zValidator sudah validasi; kita cast agar tidak jadi 'never'
      const body = (c.req as any).valid('json') as BulkImportBody
      const { guests, generateInvitations } = body

      // Get user information from headers (fallback ke token mock)
      const userHeader = c.req.header('user-id') || c.req.header('Authorization')?.replace('Bearer ', '')
      if (!userHeader) {
        return c.json(
          {
            success: false,
            error: 'User ID is required',
          },
          401,
        )
      }

      // Get user details to get account ID
      let accountId = ''
      try {
        const user = await db.collection('94884219_users').findOne({
          $or: [{ _id: userHeader }, { email: userHeader }],
        })

        if (!user) {
          return c.json(
            {
              success: false,
              error: 'User not found',
            },
            404,
          )
        }
        accountId = user.accountId
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('Error fetching user:', msg)
        return c.json(
          {
            success: false,
            error: 'Failed to authenticate user',
          },
          401,
        )
      }

      console.log(`[Bulk Import] Starting import of ${guests.length} guests for account: ${accountId}`)

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        importedGuests: [] as any[],
      }

      // Process guests in batches for better performance
      const batchSize = 50

      for (let i = 0; i < guests.length; i += batchSize) {
        const batch = guests.slice(i, i + batchSize)
        console.log(
          `[Bulk Import] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(guests.length / batchSize)}`,
        )

        // Process each guest in the batch
        for (let j = 0; j < batch.length; j++) {
          const guest: GuestImport = batch[j]
          const rowIndex = i + j + 1 // 1-based index for error messages

          try {
            // Format phone number
            const formattedPhone = formatIndonesianPhone(guest.phone)

            // Validate phone number
            if (!formattedPhone.startsWith('62')) {
              throw new Error('Phone number must be formatted to Indonesian format (62...)')
            }

            // Invitation code base
            const baseCode = guest.tableNo || `INV-${Date.now()}-${rowIndex}`
            const uniqueCode = Date.now().toString(36).toUpperCase().slice(-7);

            // Prepare guest data
            const guestData = {
              name: guest.name,
              phone: formattedPhone,
              email: guest.email || '',
              category: guest.category,
              session: guest.session,
              limit: guest.limit,
              notes: guest.notes || '',
              tableNo: guest.tableNo || '',
              code: uniqueCode,
              invitationCode: uniqueCode,
              status: 'Pending' as const,
              plusOne: false,
              introTextCategory: 'Formal',
              accountId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            // Insert guest into database
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

        // Small delay between batches to prevent overwhelming the database
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
          errors: results.errors.slice(0, 10), // Limit errors to prevent response bloat
          importedGuests: results.importedGuests.slice(0, 5), // Limit returned data
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

/**
 * Get bulk import status or history
 * GET /api/bulk-import/status
 */
bulkImportApp.get('/status', async (c: Context<AppEnv>) => {
  try {
    const userHeader = c.req.header('user-id') || c.req.header('Authorization')?.replace('Bearer ', '')

    if (!userHeader) {
      return c.json(
        {
          success: false,
          error: 'User ID is required',
        },
        401,
      )
    }

    // Get user details
    const user = await db.collection('94884219_users').findOne({
      $or: [{ _id: userHeader }, { email: userHeader }],
    })

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'User not found',
        },
        404,
      )
    }

    // Get recent bulk imports for this account
    const recentImports = await db
      .collection('94884219_guests')
      .find({
        accountId: user.accountId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    return c.json({
      success: true,
      data: {
        recentImports: (recentImports as any[]).map((guest: any) => ({
          _id: guest._id,
          name: guest.name,
          createdAt: guest.createdAt,
          status: guest.status,
        })),
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Get bulk import status error:', msg)
    return c.json(
      {
        success: false,
        error: msg || 'Failed to get import status',
      },
      500,
    )
  }
})

export default bulkImportApp
