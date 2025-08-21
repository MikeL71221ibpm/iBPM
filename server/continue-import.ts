/**
 * Script to load symptom segments data from CSV file with better performance and reliability
 * Features:
 * - Processes data in smaller manageable batches
 * - Implements proper error handling and retry logic
 * - Tracks progress for resumability
 * - Uses configurable batch sizes
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = './attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 600; // Increased batch size for faster processing
const TOTAL_DESIRED = 50000; // Increased target for enterprise-scale processing

// Configuration
const CONFIG = {
  dryRun: false, // Set to true to simulate without writing to database
  startIndex: 2200, // Starting from middle of the file to find additional records
  retryCount: 3, // Number of times to retry on failure
  patientId: '1', // Default patient ID to use for all records
  insertProblemRecordsFirst: false, // Process in CSV order to maximize unique records
  maxRecordsPerRun: 1500, // Maximum number of records to process in a single run
};

interface SymptomMasterRow {
  diagnostic_category?: string;
  diagnosis_icd10_code?: string;
  diagnosis?: string;
  dsm_symptom_criteria?: string;
  symptom_id?: string;
  symptom_segment?: string;
  zcode_hrsn?: string;
  symp_prob?: string;
  // Any other columns that might be in the file
  [key: string]: string | undefined;
}

interface ProcessingStats {
  processedCount: number;
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
  startTime: Date;
  lastBatchTime: Date;
}

function mapToDatabaseField(symptomRow: SymptomMasterRow, patientId: string): any {
  // Generate a unique mention ID 
  const mentionId = `mention_${symptomRow.symptom_id}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  
  return {
    patient_id: patientId,
    patient_name: 'Bob Test1', // Demo data
    provider_id: '1', 
    provider_name: 'Dr. Smith',
    symptom_segment: symptomRow.symptom_segment || '',
    symptom_id: symptomRow.symptom_id || '',
    dos_date: '2025-04-20', // Demo date
    diagnosis: symptomRow.diagnosis || '',
    diagnosis_icd10_code: symptomRow.diagnosis_icd10_code || '',
    diagnostic_category: symptomRow.diagnostic_category || '',
    dsm_symptom_criteria: symptomRow.dsm_symptom_criteria || '',
    symp_prob: symptomRow.symp_prob || 'Symptom',
    zcode_hrsn: symptomRow.zcode_hrsn || 'No',
    symptom_present: 'Yes',
    symptom_detected: 'Yes',
    validated: 'Yes',
    symptom_segments_in_note: 1,
    user_id: 2, // Demo user ID
    mention_id: mentionId,
    pre_processed: false
  };
}

async function parseCSVFile(filePath: string): Promise<SymptomMasterRow[]> {
  // Parse the CSV file and return the data as an array of objects
  const results: SymptomMasterRow[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (data) => results.push(data))
      .on('error', (error) => reject(error))
      .on('end', () => resolve(results));
  });
}

function createCompositeKey(row: any): string {
  return [
    row.patient_id || '',
    row.symptom_id || '',
    row.symptom_segment || '',
    row.diagnosis || '',
    row.diagnosis_icd10_code || '',
    row.diagnostic_category || '',
    row.symp_prob || '',
    row.zcode_hrsn || ''
  ].join('|');
}

async function insertBatch(batch: any[], existingKeys: Set<string>, stats: ProcessingStats): Promise<Set<string>> {
  const startTime = Date.now();
  let batchSuccessCount = 0;
  
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    
    // Create composite key from all 8 fields to check for duplicates
    const compositeKey = createCompositeKey(row);
    
    // Skip if this exact record already exists
    if (existingKeys.has(compositeKey)) {
      stats.skippedCount++;
      continue;
    }
    
    // Skip actual insert in dry run mode, but still track stats
    if (CONFIG.dryRun) {
      stats.insertedCount++;
      existingKeys.add(compositeKey);
      continue;
    }
    
    let success = false;
    let attempts = 0;
    let lastError = null;
    
    // Try to insert with retries
    while (!success && attempts < CONFIG.retryCount) {
      attempts++;
      try {
        await db.execute(sql`
          INSERT INTO "extracted_symptoms" (
            patient_id, patient_name, provider_id, provider_name,
            symptom_segment, symptom_id, dos_date, diagnosis, 
            diagnosis_icd10_code, diagnostic_category, dsm_symptom_criteria,
            symp_prob, zcode_hrsn, symptom_present, symptom_detected,
            validated, user_id, symptom_segments_in_note, mention_id, pre_processed
          )
          VALUES (
            ${row.patient_id},
            ${row.patient_name},
            ${row.provider_id},
            ${row.provider_name},
            ${row.symptom_segment},
            ${row.symptom_id},
            ${row.dos_date},
            ${row.diagnosis},
            ${row.diagnosis_icd10_code},
            ${row.diagnostic_category},
            ${row.dsm_symptom_criteria},
            ${row.symp_prob},
            ${row.zcode_hrsn},
            ${row.symptom_present},
            ${row.symptom_detected},
            ${row.validated},
            ${row.user_id},
            ${row.symptom_segments_in_note},
            ${row.mention_id},
            ${row.pre_processed}
          )
        `);
        
        success = true;
        stats.insertedCount++;
        existingKeys.add(compositeKey);
        batchSuccessCount++;
      } catch (error) {
        lastError = error;
        // Wait a bit before retrying (increasing backoff)
        if (attempts < CONFIG.retryCount) {
          await new Promise(resolve => setTimeout(resolve, attempts * 100));
        }
      }
    }
    
    if (!success) {
      stats.errorCount++;
      console.error(`Failed to insert row after ${CONFIG.retryCount} attempts. LastError:`, lastError);
    }
    
    stats.processedCount++;
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  stats.lastBatchTime = new Date();
  
  console.log(`Batch processed in ${duration.toFixed(2)} seconds. ${batchSuccessCount}/${batch.length} succeeded.`);
  
  return existingKeys;
}

async function main() {
  try {
    console.log('Starting optimized data import process...');
    console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Processing maximum of ${CONFIG.maxRecordsPerRun} records per run`);
    
    // Initialize stats
    const stats: ProcessingStats = {
      processedCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      startTime: new Date(),
      lastBatchTime: new Date()
    };
    
    // Check if we're resuming a previous run
    const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
    
    console.log(`Found ${existingCount} existing records.`);
    
    // Get existing records to avoid duplicates (limited to most recent for performance)
    const existingRecords = await db.execute(sql`
      SELECT 
        patient_id, 
        symptom_id, 
        symptom_segment, 
        diagnosis, 
        diagnosis_icd10_code, 
        diagnostic_category,
        symp_prob, 
        zcode_hrsn
      FROM "extracted_symptoms"
      ORDER BY id DESC
      LIMIT 5000
    `);
    
    // Create a Set of composite keys
    const existingCompositeKeys = new Set<string>();
    existingRecords.rows.forEach(row => {
      const compositeKey = createCompositeKey(row);
      existingCompositeKeys.add(compositeKey);
    });
    
    console.log(`Loaded ${existingCompositeKeys.size} unique composite keys to check for duplicates`);
    
    // Read the symptom records from CSV
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // Split into Problem and Symptom records if needed
    let processOrder: SymptomMasterRow[] = [];
    
    if (CONFIG.insertProblemRecordsFirst) {
      const problemRecords = csvData.filter(row => row.symp_prob === 'Problem');
      const symptomRecords = csvData.filter(row => row.symp_prob !== 'Problem');
      console.log(`Found ${problemRecords.length} Problem records and ${symptomRecords.length} Symptom records`);
      processOrder = [...problemRecords, ...symptomRecords];
    } else {
      processOrder = csvData;
    }
    
    // Determine how many records to process based on target, existing, and max per run limit
    const remainingNeeded = Math.max(0, TOTAL_DESIRED - existingCount);
    const limitedByMaxPerRun = Math.min(remainingNeeded, CONFIG.maxRecordsPerRun);
    const recordsToProcess = Math.min(limitedByMaxPerRun, processOrder.length);
    
    if (recordsToProcess === 0) {
      console.log(`Already have ${existingCount} records, which meets or exceeds the target of ${TOTAL_DESIRED}. Nothing to do.`);
      return;
    }
    
    console.log(`Will process ${recordsToProcess} records to reach target of ${TOTAL_DESIRED}`);
    
    // Only process the records we need, starting from the configured index
    const recordsToImport = processOrder.slice(
      CONFIG.startIndex, 
      CONFIG.startIndex + recordsToProcess
    );
    
    // Convert to database format
    const dbRows = recordsToImport.map(row => mapToDatabaseField(row, CONFIG.patientId));
    console.log(`Mapped ${dbRows.length} rows to database format`);
    
    // Process in batches
    let updatedKeys = new Set<string>(existingCompositeKeys);
    
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(dbRows.length/BATCH_SIZE)} (${batch.length} records)`);
      
      updatedKeys = await insertBatch(batch, updatedKeys, stats);
      
      // Progress report
      const percentComplete = (stats.processedCount / recordsToProcess) * 100;
      const elapsedSeconds = (new Date().getTime() - stats.startTime.getTime()) / 1000;
      const recordsPerSecond = stats.processedCount / elapsedSeconds;
      const estimatedRemainingSeconds = (recordsToProcess - stats.processedCount) / recordsPerSecond;
      
      console.log(`Progress: ${percentComplete.toFixed(1)}% complete`);
      console.log(`Stats: Processed=${stats.processedCount}, Inserted=${stats.insertedCount}, Skipped=${stats.skippedCount}, Errors=${stats.errorCount}`);
      console.log(`Rate: ${recordsPerSecond.toFixed(1)} records/sec, Est. remaining: ${(estimatedRemainingSeconds/60).toFixed(1)} minutes`);
      
      // Small delay between batches to avoid overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final report
    const finalElapsedSeconds = (new Date().getTime() - stats.startTime.getTime()) / 1000;
    console.log(`\nImport process completed in ${(finalElapsedSeconds/60).toFixed(1)} minutes`);
    console.log(`Final stats: Processed=${stats.processedCount}, Inserted=${stats.insertedCount}, Skipped=${stats.skippedCount}, Errors=${stats.errorCount}`);
    
    // Verify final results
    if (!CONFIG.dryRun) {
      const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
      const finalCount = parseInt(String(countResult.rows[0].count));
      console.log(`Final database record count: ${finalCount} (Target: ${TOTAL_DESIRED})`);
      
      // Get counts by type
      const typeCountResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN symp_prob = 'Problem' THEN 1 END) as problem_count,
          COUNT(CASE WHEN symp_prob = 'Symptom' THEN 1 END) as symptom_count,
          COUNT(CASE WHEN zcode_hrsn = 'ZCode/HRSN' THEN 1 END) as zcode_hrsn_count,
          COUNT(CASE WHEN zcode_hrsn = 'No' THEN 1 END) as no_zcode_count
        FROM "extracted_symptoms"
      `);
      
      console.log('Type distribution:');
      console.log(typeCountResult.rows[0]);
    }
    
    console.log('Optimized data import process completed successfully');
  } catch (error) {
    console.error('Error in data import process:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });