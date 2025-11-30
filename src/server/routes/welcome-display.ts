/**
 * Welcome Display API Routes
 * Handles guest check-in detection and account data for welcome display
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db.js'

const app = new Hono();

// Get recent guest check-ins
app.get('/guests/recent-checkins', async (c) => {
  try {
    const timeframe = parseInt(c.req.query('timeframe') || '5');

    const cutoffTime = new Date(Date.now() - timeframe * 60 * 1000);

    // First, get the most recent check-in regardless of timeframe
    const mostRecentGuest = await db.collection('94884219_guests')
      .find({ checkInDate: { $exists: true } })
      .sort({ checkInDate: -1 })
      .limit(1)
      .toArray();

    console.log(`[WelcomeDisplay] Most recent guest found: ${mostRecentGuest.length > 0 ? mostRecentGuest[0].name : 'none'}`);
    if (mostRecentGuest.length > 0) {
      console.log(`[WelcomeDisplay] Most recent check-in date: ${mostRecentGuest[0].checkInDate}`);
      const parsed = new Date(mostRecentGuest[0].checkInDate);
      if (!Number.isNaN(parsed.getTime())) {
        console.log(`[WelcomeDisplay] Most recent check-in date (parsed): ${parsed.toISOString()}`);
      }
    }

    const recentGuests = await db.collection('94884219_guests')
      .find({ checkInDate: { $gte: cutoffTime } })
      .sort({ checkInDate: -1 })
      .limit(10)
      .toArray();

    let guestsToReturn = recentGuests;
    if (mostRecentGuest.length > 0 && recentGuests.length === 0) {
      console.log(`[WelcomeDisplay] Using most recent guest outside timeframe: ${mostRecentGuest[0].name}`);
      guestsToReturn = mostRecentGuest;
    }

    console.log(`[WelcomeDisplay] Returning ${guestsToReturn.length} guests`);

    return c.json({
      guests: guestsToReturn.map((guest: any) => ({
        _id: guest._id?.toString?.() ?? String(guest._id),
        name: guest.name,
        checkInDate: guest.checkInDate,
        status: guest.status
      }))
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[WelcomeDisplay] Error fetching recent check-ins:', message);
    return c.json({ guests: [] }, 500);
  }
});

export default app;
