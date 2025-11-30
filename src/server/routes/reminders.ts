/**
 * Reminders API routes
 * Handles reminder management with account-based data isolation
 */
import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db.js';
import { ObjectId } from 'mongodb';
import type { AppEnv, ContextUser } from '@shared/types';
import { stat } from 'node:fs/promises';

const reminders = new Hono<AppEnv>();

// Reminder schema
const reminderSchema = z.object({
  guestId: z.string(),
  userId: z.string(),
  guestName: z.string(),
  phone: z.string(),
  message: z.string(),
  scheduledAt: z.string(),
  type: z.enum(['wedding_invitation', 'reminder', 'thank_you']),
  status: z.string().optional(),
  introTextCategory: z.string().optional(),
  attempts: z.number().min(0).optional(),
}).strict();

type ReminderBody = z.infer<typeof reminderSchema>;
const updateReminderSchema = reminderSchema.partial();

// Get all reminders with filtering
reminders.get('/', async (c: Context<AppEnv>) => {
  const accountId = c.get('accountId') as string | undefined;
  const user = c.get('user') as ContextUser | undefined;

  if (!accountId && !user?.id) {
    return c.json({ error: 'Account ID not found' }, 400);
  }

  try {
    const { search, status, type, page = '1', limit = '10' } = c.req.query();
    const query: Record<string, any> = { accountId };

    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const collection = db.collection('94884219_reminders');

    const [items, total] = await Promise.all([
      collection.find(query).sort({ scheduledAt: -1 }).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    return c.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item._id.toString(),
          guestId: item.guestId,
          guestName: item.guestName,
          phone: item.phone,
          message: item.message,
          scheduledAt: item.scheduledAt,
          status: item.status,
          type: item.type,
          introTextCategory: item.introTextCategory,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching reminders:', error?.message);
    return c.json({ error: error?.message ?? 'Failed to fetch reminders' }, 500);
  }
});

// Create new reminder
reminders.post(
  '/',
  zValidator('json', reminderSchema),
  async (c: Context<AppEnv>) => {
    const accountId = c.get('accountId') as string | undefined;
    const user = c.get('user') as ContextUser | undefined;

    console.log('[reminders] Creating reminder - accountId:', accountId);
    console.log('[reminders] User:', user);

    if (!accountId && !user?.id) {
      console.error('[reminders] Account ID not found');
      return c.json({ error: 'Account ID not found' }, 400);
    }

    try {
      const body = (c.req as any).valid('json') as ReminderBody;
      console.log('[reminders] Request body:', body);

      const collection = db.collection('94884219_reminders');

      const { status: _ignoredStatus, introTextCategory, ...cleanBody } = body;

      const reminderData = {
        ...cleanBody,
        accountId,
        userId: user?.id,
        status: 'pending',
        introTextCategory: introTextCategory || 'Formal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[reminders] Inserting reminder data:', reminderData);

      const result = await collection.insertOne(reminderData);

      const reminder = await collection.findOne({ _id: result.insertedId });
      if (!reminder) {
        return c.json({ success: true, data: { id: result.insertedId.toString(), ...reminderData } });
      }
      try {
        const guestsCollection = db.collection('94884219_guests');
        await guestsCollection.updateOne(
          { _id: new ObjectId(body.guestId) },
          {
            $set: {
              reminderScheduledAt: new Date(body.scheduledAt),
              status: 'scheduled',
              updatedAt: new Date(),
            },
          },
        );
        console.log('[reminders] Updated guest reminderScheduledAt field and status to scheduled');
      } catch (guestUpdateError: any) {
        console.error('[reminders] Error updating guest reminderScheduledAt:', guestUpdateError?.message);        
      }

      return c.json({
        success: true,
        data: {
          id: reminder._id.toString(),
          guestId: reminder.guestId,
          guestName: reminder.guestName,
          phone: reminder.phone,
          message: reminder.message,
          scheduledAt: reminder.scheduledAt,
          status: reminder.status,
          type: reminder.type,
          introTextCategory: reminder.introTextCategory,
          createdAt: reminder.createdAt,
          updatedAt: reminder.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[reminders] Error creating reminder:', error?.message);
      return c.json({ error: error?.message || 'Failed to create reminder' }, 500);
    }
  },
);

// Update reminder
reminders.put(
  '/:id',
  zValidator('json', updateReminderSchema),
  async (c: Context<AppEnv>) => {
    const accountId = c.get('accountId') as string | undefined;
    const user = c.get('user') as ContextUser | undefined;
    const id = c.req.param('id');

    if (!user?.id) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    try {
      const body = (c.req as any).valid('json') as Partial<ReminderBody>;
      const collection = db.collection('94884219_reminders');

      const result = await collection.updateOne(
        { _id: new ObjectId(id), userId: user.id },
        {
          $set: {
            ...body,
            status: "pending",
            attempts: 0,
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return c.json({ error: 'Reminder not found' }, 404);
      }

      const reminder = await collection.findOne({ _id: new ObjectId(id) });
      if (!reminder) {
        return c.json({ error: 'Reminder not found after update' }, 404);
      }

      if (body.scheduledAt) {
        try {
          const guestsCollection = db.collection('94884219_guests');
          await guestsCollection.updateOne(
            { _id: new ObjectId(reminder.guestId) },
            {
              $set: {
                reminderScheduledAt: new Date(body.scheduledAt),
                status: 'scheduled',
                updatedAt: new Date(),
              },
            },
          );
        } catch (guestUpdateError: any) {
          console.error('[reminders] Error updating guest reminderScheduledAt:', guestUpdateError?.message);
        }
      }

      return c.json({
        success: true,
        data: {
          id: reminder._id.toString(),
          guestId: reminder.guestId,
          guestName: reminder.guestName,
          phone: reminder.phone,
          message: reminder.message,
          scheduledAt: reminder.scheduledAt,
          status: reminder.status,
          type: reminder.type,
          introTextCategory: reminder.introTextCategory,
          createdAt: reminder.createdAt,
          updatedAt: reminder.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Error updating reminder:', error?.message);
      return c.json({ error: error?.message ?? 'Failed to update reminder' }, 500);
    }
  },
);

// Delete reminder
reminders.delete('/:id', async (c: Context<AppEnv>) => {
  const user = c.get('user') as ContextUser | undefined;
  const id = c.req.param('id');
  const guestId = c.req.param('id');

  try {
    const collection = db.collection('94884219_reminders');

    const reminderToDelete = await collection.findOne({
      guestId: id,
    });
    console.log('Reminder to delete:', guestId, id);
    if (!reminderToDelete) {
      return c.json({ error: 'Reminder not found' }, 404);
    }

    const result = await collection.deleteOne({
      guestId,
    });

    if (!result.deletedCount) {
      return c.json({ error: 'Reminder not found' }, 404);
    }

    try {
      const guestsCollection = db.collection('94884219_guests');
      await guestsCollection.updateOne(
        { _id: new ObjectId(reminderToDelete.guestId) },
        {
          $unset: { reminderScheduledAt: '' },
          $set: { status: 'pending', updatedAt: new Date() },
        },
      );
      console.log('[reminders] Cleared guest reminderScheduledAt field and reset status to pending');
    } catch (guestUpdateError: any) {
      console.error('[reminders] Error clearing guest reminderScheduledAt:', guestUpdateError?.message);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting reminder:', error?.message);
    return c.json({ error: error?.message ?? 'Failed to delete reminder' }, 500);
  }
});

export default reminders;
