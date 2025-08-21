/**
 * Standalone script to import ALL symptom segments from CSV file
 * This will import in batches until all symptoms are added
 */
import { importSymptomsOptimized } from './utils/optimizedSymptomImport';
import { db, pool } from './db';

const CHUNK_SIZE = 300; // Number of symptoms to import per batch
const MAX_CHUNKS = 20;  // Safety limit on number of batches to process

async function main() {
  try {
    console.log('Starting automated import of all symptoms...');
    const startTime = new Date();
    
    // Continue from where we left off
    console.log('Continuing symptom import from previous position...');
    
    let currentSkip = 3400; // Continue from where the previous import left off
    let totalImported = 0;
    let currentCount = 0;
    let chunksDone = 0;
    
    // Get initial count (should be 0 after truncate)
    const initialCountResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const initialCount = parseInt(String(initialCountResult.rows[0].count), 10);
    console.log(`Starting with ${initialCount} symptoms in the database`);
    
    // Keep importing chunks until we've processed them all or hit our safety limit
    let added = 0;
    do {
      console.log(`\n--- Processing chunk ${chunksDone + 1} (skip=${currentSkip}) ---`);
      currentCount = await importSymptomsOptimized(currentSkip, CHUNK_SIZE);
      
      // Calculate how many were added in this batch
      added = currentCount - (initialCount + totalImported);
      totalImported += added;
      
      console.log(`Added ${added} symptoms in this batch`);
      console.log(`Total symptoms in database: ${currentCount}`);
      
      // Increment for next batch
      currentSkip += CHUNK_SIZE;
      chunksDone++;
      
      // Continue if we added symptoms and haven't hit our chunk limit
    } while (added > 0 && chunksDone < MAX_CHUNKS);
    
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const durationMinutes = durationSeconds / 60;
    
    console.log(`\n--- Import Complete! ---`);
    console.log(`Successfully imported ${totalImported} symptoms in ${durationMinutes.toFixed(2)} minutes!`);
    console.log(`Database now has ${currentCount} total symptoms.`);
    
    if (chunksDone >= MAX_CHUNKS) {
      console.log(`Warning: Hit maximum chunk limit (${MAX_CHUNKS}). You may need to run this script again.`);
    }
  } catch (error) {
    console.error('Error during full import:', error);
  } finally {
    // Close database connection
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});