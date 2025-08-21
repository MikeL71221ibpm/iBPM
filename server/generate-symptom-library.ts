/**
 * Standalone script to manage the symptom library
 * This script loads symptoms from CSV, saves them to the database, and exports to a JSON file
 */
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { symptomMaster } from '@shared/schema';
import { importSymptomsFromCSV } from './utils/importSymptomSegments';

const SYMPTOM_LIBRARY_FILENAME = 'symptomLibrary.json';
const DATA_DIR = path.join(process.cwd(), 'server', 'data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating data directory at ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const libraryFilePath = path.join(DATA_DIR, SYMPTOM_LIBRARY_FILENAME);

async function main() {
  console.log('Starting symptom library management...');
  
  try {
    // First, import all symptoms from CSV to database
    console.log('Importing symptoms from CSV to database...');
    const startTime = Date.now();
    const count = await importSymptomsFromCSV();
    const importEndTime = Date.now();
    
    console.log(`Imported ${count} symptoms to database in ${((importEndTime - startTime) / 1000).toFixed(2)}s`);
    
    // Next, query all symptoms from database
    console.log('Retrieving all symptoms from database for JSON export...');
    const symptoms = await db.select().from(symptomMaster);
    const retrieveEndTime = Date.now();
    
    console.log(`Retrieved ${symptoms.length} symptoms from database in ${((retrieveEndTime - importEndTime) / 1000).toFixed(2)}s`);
    
    // Save to file for backward compatibility
    fs.writeFileSync(libraryFilePath, JSON.stringify(symptoms, null, 2));
    console.log(`Saved symptom library to ${libraryFilePath}`);
    
    const endTime = Date.now();
    console.log(`Complete symptom library process took ${((endTime - startTime) / 1000).toFixed(2)}s total`);
  } catch (error) {
    console.error('Error managing symptom library:', error);
  } finally {
    // Close database connection
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Error in symptom library management:', error);
  process.exit(1);
});