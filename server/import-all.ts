import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = './attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 500; // Process 500 records at a time

// Configuration
const CONFIG = {
  patientId: '1', // Default patient ID to use for all records
  dryRun: false, // Set to true to simulate without writing to database
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

async function main() {
  try {
    console.log('Starting simple data import process...');
    console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    // Check existing records
    const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
    
    console.log(`Found ${existingCount} existing records.`);
    
    // Get existing composite keys to avoid duplicates
    console.log('Loading existing composite keys to check for duplicates...');
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
    
    // Convert to database format and filter out existing records
    console.log('Mapping and filtering rows...');
    const dbRows = [];
    
    for (const row of csvData) {
      const dbRow = mapToDatabaseField(row, CONFIG.patientId);
      const compositeKey = createCompositeKey(dbRow);
      
      if (!existingCompositeKeys.has(compositeKey)) {
        dbRows.push(dbRow);
      }
    }
    
    console.log(`Found ${dbRows.length} new unique records to insert`);
    
    // Process in batches
    let insertedCount = 0;
    let errorCount = 0;
    
    console.log(`Will process in batches of ${BATCH_SIZE} records`);
    
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(dbRows.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);
      const startTime = Date.now();
      
      let batchInserted = 0;
      for (const row of batch) {
        // Skip actual insert in dry run mode
        if (CONFIG.dryRun) {
          insertedCount++;
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
          
          insertedCount++;
          batchInserted++;
        } catch (error) {
          console.error(`Error inserting record:`, error);
          errorCount++;
        }
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`Batch processed in ${duration.toFixed(2)} seconds. ${batchInserted}/${batch.length} succeeded.`);
      
      // Progress report
      const percentComplete = ((i + batch.length) / dbRows.length) * 100;
      console.log(`Progress: ${percentComplete.toFixed(1)}% complete`);
      console.log(`Stats: Inserted=${insertedCount}, Errors=${errorCount}`);
      
      // Small delay between batches to avoid overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Verify final results
    if (!CONFIG.dryRun) {
      const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
      const finalCount = parseInt(String(countResult.rows[0].count));
      console.log(`Final database record count: ${finalCount} (Started with: ${existingCount})`);
      
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
    
    console.log('Simple data import process completed successfully');
  } catch (error) {
    console.error('Error in import process:', error);
  }
}

// Run the main function
main();