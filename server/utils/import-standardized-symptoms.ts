/**
 * Utility script to import standardized symptom data with consistent field names
 * This provides a clean implementation with all standardized field names
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 300; // Increased batch size for faster processing

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

// Function to map CSV data to database fields
function mapToDatabaseField(symptomRow: SymptomMasterRow, patientId: string): any {
  const now = new Date();
  
  // Generate a unique mention ID based on the symptom ID, a random number, and the current timestamp
  const mentionId = `mention_${symptomRow.symptom_id}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  
  // Map the CSV fields to our database schema - now with direct 1:1 mapping (no transformation needed)
  return {
    patient_id: patientId,
    patient_name: 'Bob Test1', // Add patient name for demo
    provider_id: '1', // Add provider ID for demo 
    provider_name: 'Dr. Smith', // Add provider name for demo
    symptom_segment: symptomRow.symptom_segment || '',
    symptom_id: symptomRow.symptom_id || '',
    dos_date: '2025-04-20', // Fixed date for demo purposes
    diagnosis: symptomRow.diagnosis || '',
    diagnosis_icd10_code: symptomRow.diagnosis_icd10_code || '',
    diagnostic_category: symptomRow.diagnostic_category || '',
    dsm_symptom_criteria: symptomRow.dsm_symptom_criteria || '',
    symp_prob: symptomRow.symp_prob || 'Symptom', // Default to Symptom if not specified
    zcode_hrsn: symptomRow.zcode_hrsn || 'No', // Default to No if not specified
    symptom_present: 'Yes', // Default to Yes for demo
    symptom_detected: 'Yes', // Default to Yes for demo
    validated: 'Yes', // Default to Yes for demo
    symptom_segments_in_note: 1, // Default to 1 for demo
    user_id: 2, // Use a fixed user ID for demo
    mention_id: mentionId
  };
}

// Parse CSV file and return array of rows
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

// Generate a composite key from all 8 fields for deduplication
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

// Import a batch of symptom records
async function importSymptomRecords(rows: any[]): Promise<{ inserted: number, skipped: number }> {
  // Get existing records to prevent duplicates
  const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
  const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
  
  console.log(`Found ${existingCount} existing records.`);
  
  // Get full record details to ensure we only skip true duplicates
  const existingRecords = await db.execute(sql`
    SELECT 
      patient_id, 
      patient_name,
      provider_id,
      provider_name,
      symptom_id, 
      symptom_segment, 
      dos_date,
      diagnosis, 
      diagnosis_icd10_code, 
      diagnostic_category,
      dsm_symptom_criteria,
      symp_prob, 
      zcode_hrsn
    FROM "extracted_symptoms"
  `);
  
  // Create a Set of composite keys based on all 8 critical fields
  const existingCompositeKeys = new Set();
  existingRecords.rows.forEach(row => {
    const compositeKey = createCompositeKey(row);
    existingCompositeKeys.add(compositeKey);
  });
  
  console.log(`Found ${existingCompositeKeys.size} unique composite keys to skip`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Create composite key from all 8 fields
    const compositeKey = createCompositeKey(row);
    
    // Skip if this exact record already exists (all 8 fields match)
    if (existingCompositeKeys.has(compositeKey)) {
      skipped++;
      continue;
    }
    
    try {
      await db.execute(sql`
        INSERT INTO "extracted_symptoms" (
          patient_id, patient_name, provider_id, provider_name,
          symptom_segment, symptom_id, dos_date, diagnosis, 
          diagnosis_icd10_code, diagnostic_category, dsm_symptom_criteria,
          symp_prob, zcode_hrsn, symptom_present, user_id, 
          symptom_segments_in_note, mention_id
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
          ${row.user_id},
          ${row.symptom_segments_in_note},
          ${row.mention_id}
        )
      `);
      
      inserted++;
      existingCompositeKeys.add(compositeKey);
      
      // Log progress in batches
      if (inserted % BATCH_SIZE === 0 || inserted === rows.length) {
        console.log(`Inserted ${inserted} records (${i+1}/${rows.length} processed)...`);
      }
    } catch (error) {
      console.error(`Error inserting row ${i+1}:`, error);
      console.log(`Continuing with next record...`);
    }
  }
  
  return { inserted, skipped };
}

// Main function for importing symptom data
export async function importSymptomData(csvFilePath: string = CSV_FILE_PATH): Promise<void> {
  try {
    console.log('Starting standardized data load process...');
    
    // Read the symptoms master CSV
    console.log(`Reading CSV file from ${csvFilePath}...`);
    const csvData = await parseCSVFile(csvFilePath);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // For this run, first prioritize Problem records that are likely to be HRSN indicators
    // and then do the Symptom records if time permits
    const problemRecords = csvData.filter(row => row.symp_prob === 'Problem');
    const symptomRecords = csvData.filter(row => row.symp_prob === 'Symptom' || !row.symp_prob);
    
    console.log(`Found ${problemRecords.length} Problem records and ${symptomRecords.length} Symptom records`);
    
    // Process Problem records first (HRSN indicators)
    const patientId = '1'; // Fixed patient ID for demo purposes
    
    // Convert CSV data to database rows - Problem records first
    const dbProblemRows = problemRecords.map(row => mapToDatabaseField(row, patientId));
    console.log(`Mapped ${dbProblemRows.length} Problem rows to database format`);
    
    // Process all Problem records
    console.log('Processing Problem records...');
    const problemResults = await importSymptomRecords(dbProblemRows);
    
    console.log(`Completed Problem records: Inserted ${problemResults.inserted}, skipped ${problemResults.skipped}`);
    
    // Now process Symptom records
    // Convert CSV data to database rows - Symptom records
    const dbSymptomRows = symptomRecords.map(row => mapToDatabaseField(row, patientId));
    console.log(`Mapped ${dbSymptomRows.length} Symptom rows to database format`);
    
    console.log('Processing Symptom records...');
    const symptomResults = await importSymptomRecords(dbSymptomRows);
    
    console.log(`Completed Symptom records: Inserted ${symptomResults.inserted}, skipped ${symptomResults.skipped}`);
    
    // Verify final results
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const finalCount = parseInt(String(countResult.rows[0].count));
    
    console.log(`Final record count: ${finalCount}`);
    console.log(`Total inserted this run: ${problemResults.inserted + symptomResults.inserted}`);
    console.log(`Total skipped this run: ${problemResults.skipped + symptomResults.skipped}`);
    
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
    
    console.log('Type counts:');
    console.log(typeCountResult.rows[0]);
    
    console.log('Data load process completed successfully');
  } catch (error) {
    console.error('Error in data load process:', error);
    throw error;
  }
}

// Standalone execution code was moved to import-symptoms.ts