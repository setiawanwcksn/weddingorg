/**
 * Migration script to ensure all guests have proper userId assignments
 * Run this to fix any existing guest data that lacks userId field
 */

async function migrateGuests() {
  try {
    console.log('Starting guest migration...');
    
    // Get all users
    const usersCollection = db.collection('94884219_users');
    const guestsCollection = db.collection('94884219_guests');
    
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('No users found, migration not needed');
      return;
    }
    
    // For each user, ensure their guests have proper userId
    for (const user of users) {
      console.log(`Processing user: ${user.email} (${user._id})`);
      
      // Find guests that might be associated with this user but lack userId
      const guestsWithoutUserId = await guestsCollection.find({
        userId: { $exists: false }
      }).toArray();
      
      if (guestsWithoutUserId.length > 0) {
        console.log(`Found ${guestsWithoutUserId.length} guests without userId`);
        
        // Update these guests to have the current user's ID
        // Note: This assumes these guests belong to the current user
        // You might need to adjust this logic based on your specific requirements
        const result = await guestsCollection.updateMany(
          { 
            userId: { $exists: false },
            // Add any additional criteria to identify which guests belong to this user
            // For example, you might check for a specific pattern in invitation codes
            // or other identifying information
          },
          { 
            $set: { 
              userId: user._id.toString(),
              updatedAt: new Date()
            } 
          }
        );
        
        console.log(`Updated ${result.modifiedCount} guests for user ${user.email}`);
      }
      
      // Also find guests that have the wrong userId format
      const guestsWithWrongUserId = await guestsCollection.find({
        userId: { $type: 7 } // ObjectId type instead of string
      }).toArray();
      
      if (guestsWithWrongUserId.length > 0) {
        console.log(`Found ${guestsWithWrongUserId.length} guests with ObjectId userId`);
        
        // Convert ObjectId userId to string
        for (const guest of guestsWithWrongUserId) {
          await guestsCollection.updateOne(
            { _id: guest._id },
            { 
              $set: { 
                userId: guest.userId.toString(),
                updatedAt: new Date()
              } 
            }
          );
        }
        
        console.log(`Fixed userId format for ${guestsWithWrongUserId.length} guests`);
      }
    }
    
    // Final verification
    const totalGuests = await guestsCollection.countDocuments();
    const guestsWithUserId = await guestsCollection.countDocuments({ userId: { $exists: true } });
    const guestsWithoutUserId = await guestsCollection.countDocuments({ userId: { $exists: false } });
    
    console.log('\nMigration Summary:');
    console.log(`Total guests: ${totalGuests}`);
    console.log(`Guests with userId: ${guestsWithUserId}`);
    console.log(`Guests without userId: ${guestsWithoutUserId}`);
    
    if (guestsWithoutUserId === 0) {
      console.log('✅ All guests now have proper userId assignments!');
    } else {
      console.log(`⚠️  ${guestsWithoutUserId} guests still lack userId - manual intervention may be required`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateGuests().then(() => {
  console.log('Migration completed');
}).catch(err => {
  console.error('Migration error:', err);
});