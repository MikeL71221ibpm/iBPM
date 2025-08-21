/**
 * Complete Symptom Master File Import Script
 * 
 * This script imports ALL symptoms from the master file with no filtering.
 * Each symptom entry (symptom_segment + diagnosis + diagnostic_category) is treated as unique
 * and important for clinical purposes, even if symptom text appears to be duplicated.
 * 
 * USAGE:
 * - npx tsx server/import-complete-master-file.ts           // Start from beginning
 * - npx tsx server/import-complete-master-file.ts 500       // Start from record 500
 * - npx tsx server/import-complete-master-file.ts 0 clear   // Clear existing data and start from beginning
 * - npx tsx server/import-complete-master-file.ts 500 200   // Start from record 500 with batch size 200
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
const DEFAULT_BATCH_SIZE = 50; // Default size of database insert batches

// Records with missing data will be logged here
const FLAGGED_RECORDS_LOG = 'flagged_symptoms.json';

async function main() {
  try {
    console.log('Starting import of complete symptom master file');
    console.log('IMPORTANT: Every record is treated as unique and clinically significant');
    
    // Parse command line arguments
    const startIndexArg = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
    const startIndex = isNaN(startIndexArg) ? 0 : startIndexArg;
    const shouldClear = process.argv[3] === 'clear';
    
    // Check if batch size is specified
    let batchSize = DEFAULT_BATCH_SIZE;
    if (!shouldClear && process.argv[3]) {
      const batchSizeArg = parseInt(process.argv[3], 10);
      if (!isNaN(batchSizeArg)) {
        batchSize = batchSizeArg;
      }
    }
    console.log(`Using batch size: ${batchSize}`);
    
    // Clear existing data if requested
    if (shouldClear) {
      console.log('WARNING: This will clear all existing symptom_master data.');
      console.log('Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Clearing existing symptom entries...');
      await pool.query('DELETE FROM symptom_master');
      console.log('Existing data cleared.');
    }
    
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
    
    // Apply the start index to resume from a specific point
    const records = allRecords.slice(startIndex);
    
    console.log(`Parsed ${allRecords.length} total records from CSV`);
    console.log(`Starting from record ${startIndex} (${records.length} records remaining)`);

    // Get current count
    const { rows: beforeCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`Before import: ${beforeCount[0].count} records in database`);
    
    // Records to flag for review
    const flaggedRecords = [];
    
    // Process and insert records in batches
    const totalRecords = records.length;
    const globalStartIndex = startIndex;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalRecords / batchSize);
      
      console.log(`Processing batch ${batchNum}/${totalBatches}...`);
      
      for (const record of batch) {
        try {
          // Flag records with missing diagnostic categories
          if (!record.diagnosticCategory || record.diagnosticCategory.trim() === '') {
            flaggedRecords.push({
              symptomId: record.symptomId,
              symptomSegment: record.symptomSegment,
              diagnosis: record.Diagnosis,
              diagnosisCode: record["Diagnosis_ICD-10_Code"],
              issue: "Missing diagnostic_category"
            });
          }
          
          // Insert the record regardless of missing fields
          // We want ALL records from the master file
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
          console.error(`Error inserting record ${record.symptomId}:`, err);
          
          // Add to flagged records with error info
          flaggedRecords.push({
            symptomId: record.symptomId,
            symptomSegment: record.symptomSegment,
            diagnosis: record.Diagnosis,
            diagnosisCode: record["Diagnosis_ICD-10_Code"],
            issue: "Error during insert: " + (err?.message || String(err))
          });
          
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
    
    // Write flagged records to a file for review
    if (flaggedRecords.length > 0) {
      fs.writeFileSync(FLAGGED_RECORDS_LOG, JSON.stringify(flaggedRecords, null, 2));
      console.log(`\n⚠️  ${flaggedRecords.length} records flagged for review. See ${FLAGGED_RECORDS_LOG}`);
    } else {
      console.log('\n✅ No records flagged for review.');
    }
    
    // Get after count
    const { rows: afterCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
    console.log(`After import: ${afterCount[0].count} records in database`);
    console.log(`Added ${successCount} records successfully`);
    console.log(`Failed to add ${errorCount} records`);
    
    // Get statistics from database
    const { rows: stats } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE diagnostic_category IS NULL OR diagnostic_category = '') as missing_category,
        COUNT(*) FILTER (WHERE diagnosis_icd10_code IS NULL OR diagnosis_icd10_code = '') as missing_icd10
      FROM symptom_master
    `);
    
    console.log(`\nRecords with missing diagnostic category: ${stats[0].missing_category}`);
    console.log(`Records with missing ICD-10 code: ${stats[0].missing_icd10}`);
    
    // Save progress information to resume later if needed
    const nextStartIndex = globalStartIndex + processedCount;
    if (nextStartIndex < allRecords.length) {
      console.log(`\n==== PROGRESS CHECKPOINT ====`);
      console.log(`To continue from where you left off, run:`);
      console.log(`npx tsx server/import-complete-master-file.ts ${nextStartIndex}`);
      console.log(`Records remaining: ${allRecords.length - nextStartIndex}`);
    } else {
      console.log(`\n==== IMPORT COMPLETE ====`);
      console.log(`All ${allRecords.length} records have been processed.`);
    }
    
  } catch (err: any) {
    console.error('Error during import:', err?.message || err);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});