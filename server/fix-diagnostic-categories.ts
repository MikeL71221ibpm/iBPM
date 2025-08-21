/**
 * Standalone script to fix the diagnostic_category values in the database
 * This script reads the CSV file and updates the database entries with correct diagnostic categories
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { pool, db } from './db';

// Path to the CSV file
const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_11_21_24_MASTER.csv');

// Batch size for updates
const BATCH_SIZE = 50;

async function main() {
  try {
    console.log('Starting diagnostic category fix...');
    console.log(`Reading CSV file: ${CSV_FILE_PATH}`);
    
    // Verify file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }
    
    // Parse the CSV file
    const symptoms = await parseCSV();
    console.log(`Parsed ${symptoms.length} symptoms from CSV`);
    
    // Update the database in batches
    let updatedCount = 0;
    for (let i = 0; i < symptoms.length; i += BATCH_SIZE) {
      const batch = symptoms.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(symptoms.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} symptoms)`);
      const batchUpdated = await updateBatch(batch);
      updatedCount += batchUpdated;
      
      console.log(`Updated ${batchUpdated} symptoms in batch ${batchNumber}`);
    }
    
    console.log(`\nFix complete! Updated ${updatedCount} symptoms in the database.`);
  } catch (error) {
    console.error('Error fixing diagnostic categories:', error);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

// Parse the CSV file
async function parseCSV() {
  return new Promise<any[]>((resolve, reject) => {
    const symptoms: any[] = [];
    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    let firstRecord = true;
    
    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // For debugging first record only
        if (firstRecord) {
          console.log('CSV Headers:', Object.keys(record).join(', '));
          console.log('First Record:', JSON.stringify(record));
          firstRecord = false;
        }
        
        // Debugging the keys and values
        console.log("Debug - Keys in record:", Object.keys(record));
        
        // Check each key in the record for Diagnostic_Category and Symptom_ID
        let diagnosticCategory = null;
        let symptomId = null;
        
        for (const key of Object.keys(record)) {
          if (key.includes("Diagnostic_Category")) {
            diagnosticCategory = record[key];
            console.log("Found diagnostic category:", diagnosticCategory);
          }
          
          if (key.includes("Symptom_ID")) {
            symptomId = record[key];
            console.log("Found symptom ID:", symptomId);
          }
        }
        
        if (symptomId && diagnosticCategory) {
          symptoms.push({
            symptomId,
            diagnosticCategory
          });
        }
      }
    });
    
    parser.on('error', (err) => {
      console.error('Error parsing CSV:', err);
      reject(err);
    });
    
    parser.on('end', () => {
      console.log(`Parsed ${symptoms.length} symptoms from CSV file`);
      resolve(symptoms);
    });
    
    fileStream.pipe(parser);
  });
}

// Update a batch of symptoms
async function updateBatch(symptoms: any[]) {
  let updatedCount = 0;
  
  for (const symptom of symptoms) {
    try {
      const result = await pool.query(
        `UPDATE symptom_master 
         SET diagnostic_category = $1 
         WHERE symptom_id = $2 AND diagnostic_category IS NULL`,
        [symptom.diagnosticCategory, symptom.symptomId]
      );
      
      updatedCount += result.rowCount || 0;
    } catch (error) {
      console.error(`Error updating symptom ${symptom.symptomId}:`, error);
    }
  }
  
  return updatedCount;
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});