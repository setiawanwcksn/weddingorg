/**
 * Migration Script: Consolidate Non-Regular Guest Collections
 * Migrates data from non_guest_checkins and non_guest_gift_givers to non_regular_guests
 */

const { MongoClient } = require('mongodb')

async function migrateNonRegularGuests() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017')
  
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    
    const db = client.db()
    
    // Get all user IDs from accounts collection
    const accounts = await db.collection('94884219_accounts').find({}).toArray()
    const userIds = accounts.map(acc => acc._id.toString())
    
    console.log(`Found ${userIds.length} user accounts`)
    
    for (const userId of userIds) {
      console.log(`\nProcessing user: ${userId}`)
      
      // 1. Migrate non_guest_checkins
      const checkinsCollection = db.collection('94884219_non_guest_checkins')
      const existingCheckins = await checkinsCollection.find({ userId }).toArray()
      
      console.log(`Found ${existingCheckins.length} non-guest checkins`)
      
      for (const checkin of existingCheckins) {
        // Generate unique invitation code
        const invitationCode = `NR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        const displayCode = `NR${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        
        const newGuest = {
          userId,
          name: checkin.name,
          phone: checkin.phone || '',
          invitationCode,
          category: 'Non-Regular',
          status: 'Checked-In',
          checkInDate: checkin.checkInDate || new Date(),
          tableNo: checkin.tableNo || '',
          notes: '',
          code: displayCode,
          dietaryRequirements: checkin.dietaryRequirements || '',
          limit: checkin.guestCount || 1,
          plusOne: (checkin.guestCount || 1) > 1,
          giftType: null,
          giftCount: 0,
          giftNote: '',
          souvenirCount: 0,
          souvenirRecordedAt: null,
          session: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        await db.collection('94884219_non_regular_guests').insertOne(newGuest)
        console.log(`Migrated checkin: ${checkin.name}`)
      }
      
      // 2. Migrate non_guest_gift_givers
      const giftGiversCollection = db.collection('94884219_non_guest_gift_givers')
      const existingGiftGivers = await giftGiversCollection.find({ userId }).toArray()
      
      console.log(`Found ${existingGiftGivers.length} non-guest gift givers`)
      
      for (const giftGiver of existingGiftGivers) {
        // Check if this person already exists as a non-regular guest (by phone or name)
        const existingGuest = await db.collection('94884219_non_regular_guests').findOne({
          userId,
          $or: [
            { phone: giftGiver.phone },
            { name: giftGiver.name }
          ]
        })
        
        if (existingGuest) {
          // Update existing non-regular guest with gift information
          await db.collection('94884219_non_regular_guests').updateOne(
            { _id: existingGuest._id },
            {
              $set: {
                giftType: giftGiver.giftType,
                giftCount: giftGiver.giftCount,
                giftNote: giftGiver.note || '',
                updatedAt: new Date()
              }
            }
          )
          console.log(`Updated existing guest with gift info: ${giftGiver.name}`)
        } else {
          // Create new non-regular guest with gift information
          const invitationCode = `NR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
          const displayCode = `NR${Math.random().toString(36).substr(2, 6).toUpperCase()}`
          
          const newGuest = {
            userId,
            name: giftGiver.name,
            phone: giftGiver.phone || '',
            invitationCode,
            category: 'Non-Regular',
            status: 'Pending', // Not checked in, just gave gift
            checkInDate: null,
            tableNo: '',
            notes: '',
            code: displayCode,
            dietaryRequirements: '',
            limit: 1,
            plusOne: false,
            giftType: giftGiver.giftType,
            giftCount: giftGiver.giftCount,
            giftNote: giftGiver.note || '',
            souvenirCount: 0,
            souvenirRecordedAt: null,
            session: '',
            createdAt: giftGiver.receivedAt || new Date(),
            updatedAt: new Date()
          }
          
          await db.collection('94884219_non_regular_guests').insertOne(newGuest)
          console.log(`Migrated gift giver: ${giftGiver.name}`)
        }
      }
    }
    
    console.log('\nMigration completed successfully!')
    
    // Optional: Create indexes for better performance
    console.log('\nCreating indexes...')
    await db.collection('94884219_non_regular_guests').createIndex({ userId: 1 })
    await db.collection('94884219_non_regular_guests').createIndex({ invitationCode: 1 })
    await db.collection('94884219_non_regular_guests').createIndex({ checkInDate: -1 })
    console.log('Indexes created successfully')
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await client.close()
    console.log('Database connection closed')
  }
}

// Run migration
if (require.main === module) {
  migrateNonRegularGuests()
    .then(() => {
      console.log('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateNonRegularGuests }