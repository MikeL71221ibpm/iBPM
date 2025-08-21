/**
 * Test importing a small batch of symptoms from the updated CSV file
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
const SAMPLE_SIZE = 20; // Number of records to import for testing

async function main() {
  try {
    console.log('Testing import with updated CSV file');
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }

    // Read and parse the CSV file
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const allRecords = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
    
    // Take a sample of records for testing
    const records = allRecords.slice(0, SAMPLE_SIZE);
    console.log(`Parsed ${records.length} sample records from CSV`);
    
    // Debug: Print first record headers and data
    if (records.length > 0) {
      console.log("CSV HEADERS:");
      console.log(Object.keys(records[0]));
      console.log("SAMPLE RECORD:");
      console.log(records[0]);
    }

    // Get current count
    const { rows: beforeCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`Before import: ${beforeCount[0].count} records in database`);
    
    // Process and insert records
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
      try {
        // Insert record - we want ALL records, no filtering
        await pool.query(
          `INSERT INTO symptom_master 
           (symptom_id, symptom_segment, diagnosis, diagnosis_icd10_code, diagnostic_category, symp_prob)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            record.symptomId, 
            record.symptomSegment,
            record.Diagnosis,
            record["Diagnosis_ICD-10_Code"],
            record.diagnosticCategory,
            record.sympProb
          ]
        );
        successCount++;
      } catch (err: any) {
        console.error('Error inserting record:', err?.message || err);
        errorCount++;
      }
    }
    
    // Get after count
    const { rows: afterCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`After import: ${afterCount[0].count} records in database`);
    console.log(`Added ${successCount} records successfully`);
    console.log(`Failed to add ${errorCount} records`);
    
  } catch (err: any) {
    console.error('Error during test import:', err?.message || err);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});