/**
 * Script to load a small batch of symptom segments data from CSV file
 * with reduced batch size to avoid timeouts
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = './attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 20; // Smaller batch size to avoid timeouts
const MAX_RECORDS = 100; // Limit to just 100 records for testing

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

async function parseCSVFile(filePath: string, limit: number): Promise<SymptomMasterRow[]> {
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
      .on('data', (data) => {
        if (results.length < limit) {
          results.push(data);
        }
      })
      .on('error', (error) => reject(error))
      .on('end', () => resolve(results));
  });
}

// Generate a composite key from all 8 fields
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
    console.log('Starting small batch import process...');
    
    // Check if we're resuming a previous run
    const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
    
    console.log(`Found ${existingCount} existing records.`);
    
    // Get full record details to ensure we only skip true duplicates
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
      LIMIT 1000
    `);
    
    // Create a Set of composite keys based on all 8 critical fields
    const existingCompositeKeys = new Set();
    existingRecords.rows.forEach(row => {
      const compositeKey = createCompositeKey(row);
      existingCompositeKeys.add(compositeKey);
    });
    
    console.log(`Found ${existingCompositeKeys.size} unique composite keys to skip`);
    
    // Read the symptoms master CSV (limited to MAX_RECORDS)
    console.log(`Reading CSV file from ${CSV_FILE_PATH} (limited to ${MAX_RECORDS} records)...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH, MAX_RECORDS);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // For this run, use all records (both Problem and Symptom) since we're only processing a small test batch
    const patientId = '1'; // Fixed patient ID for demo purposes
    
    // Convert CSV data to database rows
    const dbRows = csvData.map(row => mapToDatabaseField(row, patientId));
    console.log(`Mapped ${dbRows.length} rows to database format`);
    
    // Process records in smaller batches
    let inserted = 0;
    let skipped = 0;
    
    for (let i = 0; i < dbRows.length; i++) {
      const row = dbRows[i];
      
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
            symp_prob, zcode_hrsn, symptom_present, symptom_detected,
            validated, user_id, symptom_segments_in_note, mention_id
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
            ${row.mention_id}
          )
        `);
        
        inserted++;
        existingCompositeKeys.add(compositeKey);
        
        // Log progress in small batches
        if (inserted % BATCH_SIZE === 0 || inserted === dbRows.length) {
          console.log(`Inserted ${inserted} records (${i+1}/${dbRows.length} processed)...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i+1}:`, error);
        console.log(`Continuing with next record...`);
      }
    }
    
    console.log(`Import complete: Inserted ${inserted} records, skipped ${skipped}`);
    
    // Verify final results
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const finalCount = parseInt(String(countResult.rows[0].count));
    
    console.log(`Final record count: ${finalCount}`);
    console.log(`Total inserted this run: ${inserted}`);
    
    console.log('Small batch import process completed successfully');
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