/**
 * Migration script to add introTextCategory field to existing guests
 * Run this script to update all existing guest records
 */

async function migrateIntroTextCategory() {
  try {
    console.log('Starting introTextCategory migration...');
    
    const collection = db.collection('94884219_guests');
    
    // Find all guests that don't have introTextCategory field
    const guestsWithoutIntroTextCategory = await collection.find({
      introTextCategory: { $exists: false }
    }).toArray();
    
    console.log(`Found ${guestsWithoutIntroTextCategory.length} guests without introTextCategory field`);
    
    if (guestsWithoutIntroTextCategory.length === 0) {
      console.log('No guests need migration');
      return;
    }
    
    // Update all guests to add introTextCategory field with default value
    const updateResult = await collection.updateMany(
      { introTextCategory: { $exists: false } },
      { 
        $set: { 
          introTextCategory: 'Formal',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Successfully migrated ${updateResult.modifiedCount} guests`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
migrateIntroTextCategory().then(() => {
  console.log('Migration completed');
}).catch((error) => {
  console.error('Migration failed:', error);
});