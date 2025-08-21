/**
 * Standalone script to import symptom segments from CSV file
 * This version uses an optimized approach to avoid timeouts
 */
import { importSymptomsOptimized } from './utils/optimizedSymptomImport';
import { db } from './db';

// Rather than trying to import everything at once, we'll import in chunks
const CHUNK_SIZE = 200; // Number of symptoms to import per execution
const SKIP_COUNT = 1800;   // Skip the already imported symptoms

async function main() {
  try {
    console.log('Starting optimized symptom import...');
    const startTime = new Date();
    
    // Import a specific chunk of symptoms
    const count = await importSymptomsOptimized(SKIP_COUNT, CHUNK_SIZE);
    
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`Successfully imported symptoms in ${durationSeconds.toFixed(2)} seconds!`);
    console.log(`Database now has ${count} total symptoms.`);
    console.log('Consider running this script again with adjusted SKIP_COUNT if needed.');
  } catch (error) {
    console.error('Error during optimized import:', error);
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