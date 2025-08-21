/**
 * Updated import script for future use with camelCase column headers in CSV
 * 
 * This script imports ALL symptoms from the updated master file with camelCase header naming.
 * Instead of using "Diagnosis_ICD-10_Code", the header in the CSV should be "diagnosisIcd10Code".
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';
import { symptomMaster } from '../shared/schema';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
const BATCH_SIZE = 50; // Size of database insert batches

async function main() {
  try {
    console.log('Starting import with camelCase header columns');
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }

    // Read and parse the CSV file
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const records = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Debug: Print first few headers to verify structure
    if (records.length > 0) {
      console.log("CSV HEADERS:");
      console.log(Object.keys(records[0]));
      console.log("SAMPLE RECORD:");
      console.log(records[0]);
    }

    // Get current count
    const { rows: beforeCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`Before import: ${beforeCount[0].count} records in database`);
    
    // Process and insert records in batches
    const totalRecords = records.length;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNum}/${totalBatches}...`);
      
      for (const record of batch) {
        try {
          // Use standard dot notation for camelCase fields
          await pool.query(
            `INSERT INTO symptom_master 
             (symptom_id, symptom_segment, diagnosis, diagnosis_icd10_code, diagnostic_category, symp_prob)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ON CONSTRAINT symptom_combined_unique DO UPDATE 
             SET 
               diagnosis_icd10_code = EXCLUDED.diagnosis_icd10_code,
               symp_prob = EXCLUDED.symp_prob`,
            [
              record.symptomId, 
              record.symptomSegment,
              record.Diagnosis,
              record.diagnosisIcd10Code, // Using camelCase field without brackets
              record.diagnosticCategory,
              record.sympProb
            ]
          );
          successCount++;
        } catch (error) {
          console.error(`Error inserting record ${record.symptomId}:`, error);
          errorCount++;
        }
        
        processedCount++;
        
        // Progress update every 100 records
        if (processedCount % 100 === 0) {
          const progress = Math.round((processedCount / totalRecords) * 100);
          console.log(`Progress: ${progress}% | Processed: ${processedCount}/${totalRecords} | Success: ${successCount} | Errors: ${errorCount}`);
        }
      }
      
      // Progress report per batch
      const progress = Math.round((processedCount / totalRecords) * 100);
      console.log(`Batch ${batchNum}/${totalBatches} complete | Progress: ${progress}% | Success: ${successCount} | Errors: ${errorCount}`);
    }
    
    // Get after count
    const { rows: afterCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`After import: ${afterCount[0].count} records in database`);
    console.log(`Added ${successCount} records successfully`);
    console.log(`Failed to add ${errorCount} records`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});