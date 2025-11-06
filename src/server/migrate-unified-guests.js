/**
 * Migration script to consolidate guest collections into unified guests collection
 * Adds isInvited field and migrates data from multiple collections
 */

async function migrateToUnifiedGuests() {
  try {
    console.log('[Migration] Starting unified guests migration...');
    
    // Get current user ID from context
    const userId = '94884219'; // This should be dynamic in production
    
    // 1. Migrate non-regular guests to unified guests collection
    const nonRegularGuests = await db.collection('94884219_non_regular_guests').find({}).toArray();
    console.log(`[Migration] Found ${nonRegularGuests.length} non-regular guests to migrate`);
    
    for (const guest of nonRegularGuests) {
      const unifiedGuest = {
        userId: guest.userId || userId,
        name: guest.name,
        phone: guest.phone || '',
        invitationCode: guest.invitationCode,
        category: guest.category || 'Regular',
        status: guest.status || 'Checked-In',
        isInvited: false, // Key field to identify non-invited guests
        plusOne: guest.plusOne || false,
        checkInDate: guest.checkInDate,
        souvenirCount: guest.souvenirCount || 0,
        souvenirRecordedAt: guest.souvenirRecordedAt,
        giftType: guest.giftType,
        giftCount: guest.giftCount || 0,
        notes: guest.notes || '',
        code: guest.code || guest.invitationCode,
        session: guest.session || '',
        limit: guest.limit || 1,
        tableNo: guest.tableNo || '',
        info: '',
        introTextCategory: 'Casual',
        createdAt: guest.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('94884219_guests').insertOne(unifiedGuest);
      console.log(`[Migration] Migrated non-regular guest: ${guest.name}`);
    }
    
    // 2. Migrate non-guest checkins to unified guests
    const nonGuestCheckins = await db.collection('94884219_non_guest_checkins').find({}).toArray();
    console.log(`[Migration] Found ${nonGuestCheckins.length} non-guest checkins to migrate`);
    
    for (const checkin of nonGuestCheckins) {
      const invitationCode = `NG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const unifiedGuest = {
        userId: checkin.userId || userId,
        name: checkin.name,
        phone: checkin.phone || '',
        invitationCode: invitationCode,
        category: 'Regular',
        status: 'Checked-In',
        isInvited: false,
        plusOne: false,
        checkInDate: checkin.checkInDate,
        souvenirCount: 0,
        giftType: null,
        giftCount: 0,
        notes: checkin.dietaryRequirements || '',
        code: invitationCode,
        session: '',
        limit: checkin.guestCount || 1,
        tableNo: checkin.tableNo || '',
        info: '',
        introTextCategory: 'Casual',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('94884219_guests').insertOne(unifiedGuest);
      console.log(`[Migration] Migrated non-guest checkin: ${checkin.name}`);
    }
    
    // 3. Update existing regular guests to have isInvited: true
    const result = await db.collection('94884219_guests').updateMany(
      { isInvited: { $exists: false } },
      { $set: { isInvited: true } }
    );
    console.log(`[Migration] Updated ${result.modifiedCount} existing guests with isInvited: true`);
    
    // 4. Create indexes for better query performance
    await db.collection('94884219_guests').createIndex({ isInvited: 1 });
    await db.collection('94884219_guests').createIndex({ userId: 1, isInvited: 1 });
    await db.collection('94884219_guests').createIndex({ status: 1, isInvited: 1 });
    console.log('[Migration] Created indexes for unified guests collection');
    
    console.log('[Migration] Migration completed successfully!');
    
  } catch (error) {
    console.error('[Migration] Error during migration:', error.message);
    throw error;
  }
}

// Export for use in server routes
module.exports = { migrateToUnifiedGuests };