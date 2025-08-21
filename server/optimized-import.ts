import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";
import * as crypto from "crypto";

// Constants
const CSV_FILE_PATH = './attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 500; // Process 500 records at a time
const BATCH_QUERY_SIZE = 10000; // Number of records to load from DB at a time for composite key checking

// Configuration
const CONFIG = {
  patientId: '1', // Default patient ID to use for all records
  dryRun: false, // Set to true to simulate without writing to database
  useHashLookup: true, // Use hash-based lookup for faster duplicate detection
  displayProgressEvery: 1000, // Display progress after every N records processed
  runSummaryReport: true, // Run a summary report after import
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

interface ImportStats {
  startTime: Date;
  processedCount: number;
  existingCount: number;
  newRecordsFound: number;
  insertedCount: number;
  errorCount: number;
  lastReportTime: Date;
  batchesProcessed: number;
}

function mapToDatabaseField(symptomRow: SymptomMasterRow, patientId: string): any {
  // Generate a unique mention ID - always create a new one for each attempt
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

// Create a composite key for uniqueness checking
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

// Create a hash of the composite key for faster lookup with large datasets
function hashCompositeKey(compositeKey: string): string {
  return crypto.createHash('md5').update(compositeKey).digest('hex');
}

async function loadExistingKeys(useHashes: boolean): Promise<Set<string>> {
  console.log('Loading existing composite keys to check for duplicates...');
  const startTime = Date.now();
  
  const existingKeys = new Set<string>();
  let offset = 0;
  let hasMore = true;
  
  // Loop to load keys in batches to handle very large databases
  while (hasMore) {
    console.log(`Loading batch of keys at offset ${offset}...`);
    
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
      ORDER BY id
      LIMIT ${BATCH_QUERY_SIZE} OFFSET ${offset}
    `);
    
    if (existingRecords.rows.length === 0) {
      hasMore = false;
    } else {
      // Process this batch
      existingRecords.rows.forEach(row => {
        const compositeKey = createCompositeKey(row);
        
        if (useHashes) {
          // Store hash for faster lookup with large datasets
          existingKeys.add(hashCompositeKey(compositeKey));
        } else {
          // Store full key for smaller datasets
          existingKeys.add(compositeKey);
        }
      });
      
      offset += BATCH_QUERY_SIZE;
      
      // Progress output
      console.log(`Loaded ${existingKeys.size} unique keys so far...`);
    }
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`Loaded ${existingKeys.size} unique composite keys in ${duration.toFixed(2)} seconds`);
  return existingKeys;
}

// Insert a batch of records and track stats
async function insertBatch(batch: any[], stats: ImportStats): Promise<ImportStats> {
  const startTime = Date.now();
  let batchInserted = 0;
  
  for (const row of batch) {
    // Skip actual insert in dry run mode
    if (CONFIG.dryRun) {
      stats.insertedCount++;
      batchInserted++;
      continue;
    }
    
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
      
      stats.insertedCount++;
      batchInserted++;
    } catch (error) {
      console.error(`Error inserting record:`, error);
      stats.errorCount++;
    }
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  stats.batchesProcessed++;
  
  console.log(`Batch ${stats.batchesProcessed} processed in ${duration.toFixed(2)} seconds. ${batchInserted}/${batch.length} succeeded.`);
  
  // Progress report
  if (stats.processedCount > 0) {
    const percentComplete = (stats.processedCount / stats.newRecordsFound) * 100;
    const elapsedSeconds = (new Date().getTime() - stats.startTime.getTime()) / 1000;
    const recordsPerSecond = stats.processedCount / elapsedSeconds;
    const remainingRecords = stats.newRecordsFound - stats.processedCount;
    const estimatedRemainingSeconds = remainingRecords / recordsPerSecond;
    
    console.log(`Progress: ${percentComplete.toFixed(1)}% complete (${stats.processedCount}/${stats.newRecordsFound})`);
    console.log(`Rate: ${recordsPerSecond.toFixed(1)} records/sec. Est. remaining time: ${formatTime(estimatedRemainingSeconds)}`);
  }
  
  return stats;
}

// Format seconds into a human-readable time string
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return 'unknown';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes < 1) {
    return `${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// Main import function
async function main() {
  try {
    console.log('Starting optimized data import process...');
    console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Using ${CONFIG.useHashLookup ? 'hash-based' : 'string-based'} duplicate detection`);
    
    // Initialize stats
    const stats: ImportStats = {
      startTime: new Date(),
      processedCount: 0,
      existingCount: 0,
      newRecordsFound: 0,
      insertedCount: 0,
      errorCount: 0,
      lastReportTime: new Date(),
      batchesProcessed: 0
    };
    
    // Check existing records
    const existingCountResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    stats.existingCount = parseInt(String(existingCountResult.rows[0].count));
    
    console.log(`Found ${stats.existingCount} existing records in the database.`);
    
    // Load existing composite keys to avoid duplicates
    const existingKeys = await loadExistingKeys(CONFIG.useHashLookup);
    
    // Read the symptom records from CSV
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} rows from CSV file`);
    
    // Convert to database format and filter out existing records
    console.log('Mapping and filtering rows to find new records...');
    const dbRows = [];
    
    for (const row of csvData) {
      const dbRow = mapToDatabaseField(row, CONFIG.patientId);
      const compositeKey = createCompositeKey(dbRow);
      
      // Check if this record already exists using the appropriate lookup method
      const lookupKey = CONFIG.useHashLookup ? 
        hashCompositeKey(compositeKey) : 
        compositeKey;
      
      if (!existingKeys.has(lookupKey)) {
        dbRows.push(dbRow);
      }
    }
    
    stats.newRecordsFound = dbRows.length;
    console.log(`Found ${stats.newRecordsFound} new unique records to import`);
    
    if (stats.newRecordsFound === 0) {
      console.log('No new records to import. Process complete.');
      return;
    }
    
    // Process in batches
    console.log(`Will process in batches of ${BATCH_SIZE} records`);
    
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(dbRows.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      
      // Update stats before the insert
      stats.processedCount += batch.length;
      
      // Insert the batch
      await insertBatch(batch, stats);
      
      // Small delay between batches to avoid overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Final report
    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - stats.startTime.getTime();
    const totalDurationMinutes = totalDurationMs / (1000 * 60);
    
    console.log('\n----- Import Process Summary -----');
    console.log(`Started: ${stats.startTime.toISOString()}`);
    console.log(`Completed: ${endTime.toISOString()}`);
    console.log(`Total duration: ${totalDurationMinutes.toFixed(2)} minutes`);
    console.log(`Existing records: ${stats.existingCount}`);
    console.log(`New records found: ${stats.newRecordsFound}`);
    console.log(`Records processed: ${stats.processedCount}`);
    console.log(`Records inserted: ${stats.insertedCount}`);
    console.log(`Errors: ${stats.errorCount}`);
    console.log(`Processing rate: ${(stats.processedCount / (totalDurationMs / 1000)).toFixed(2)} records/second`);
    
    // Verify final results
    if (!CONFIG.dryRun && CONFIG.runSummaryReport) {
      const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
      const finalCount = parseInt(String(countResult.rows[0].count));
      console.log(`Final database record count: ${finalCount} (Started with: ${stats.existingCount})`);
      
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
      
      console.log('\n----- Data Distribution -----');
      console.log(typeCountResult.rows[0]);
    }
    
    console.log('\nOptimized data import process completed successfully');
  } catch (error) {
    console.error('Error in import process:', error);
    process.exit(1);
  }
}

// Run the main function
main();