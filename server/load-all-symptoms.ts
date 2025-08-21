/**
 * Script to load all symptom segments data from CSV file
 * 
 * Optimized for processing all records without timeouts by:
 * 1. Only loading records that don't already exist
 * 2. Processing smaller batches with better progress tracking
 * 3. Focusing on adding Problem/ZCode/HRSN records first
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv';
const BATCH_SIZE = 300; // Increased batch size for faster processing

interface SymptomMasterRow {
  diagnosticCategory?: string;
  'Diagnosis_ICD-10_Code'?: string;
  Diagnosis?: string;
  DSM_Symptom_Criteria?: string;
  symptomId?: string;
  symptomSegment?: string;
  ZCode_HRSN?: string;
  sympProb?: string;
  // Any other columns that might be in the file
  [key: string]: string | undefined;
}

function mapToDatabaseField(symptomRow: SymptomMasterRow, patientId: string): any {
  const now = new Date();
  const formattedDate = now.toISOString();
  
  // Generate a unique mention ID based on the symptom ID and current timestamp
  const mentionId = `mention_${symptomRow.symptomId}_${Date.now()}`;
  
  // Map the CSV fields to our database schema
  return {
    patient_id: patientId,
    symptom_segment: symptomRow.symptomSegment || '',
    symptom_id: symptomRow.symptomId || '',
    dos_date: '2025-04-20', // Fixed date for demo purposes
    diagnosis: symptomRow.Diagnosis || '',
    diagnosis_icd10_code: symptomRow['Diagnosis_ICD-10_Code'] || '',
    diagnostic_category: symptomRow.diagnosticCategory || '',
    symp_prob: symptomRow.sympProb || 'Symptom', // Default to Symptom if not specified
    ZCode_HRSN: symptomRow.ZCode_HRSN || 'No', // Default to No if not specified
    symptom_present: 'Yes', // Default to Yes for demo
    symptom_detected: 'Yes', // Default to Yes for demo
    validated: 'Yes', // Default to Yes for demo
    symptom_segments_in_note: 1, // Default to 1 for demo
    user_id: 2, // Use a fixed user ID for demo
    mention_id: mentionId,
    created_at: formattedDate,
    updated_at: formattedDate
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

async function main() {
  try {
    console.log('Starting optimized data load process...');
    
    // Check if we're resuming a previous run
    const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
    
    console.log(`Found ${existingCount} existing records.`);
    
    // Get existing symptom IDs to avoid duplicates
    const existingIdResults = await db.execute(sql`
      SELECT DISTINCT symptom_id, patient_id FROM "extracted_symptoms"
    `);
    
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
        "ZCode_HRSN"
      FROM "extracted_symptoms"
    `);
    
    // Create a Set of composite keys based on all 8 critical fields
    const existingCompositeKeys = new Set();
    existingRecords.rows.forEach(row => {
      const compositeKey = [
        row.patient_id || '',
        row.symptom_id || '',
        row.symptom_segment || '',
        row.diagnosis || '',
        row.diagnosis_icd10_code || '',
        row.diagnostic_category || '',
        row.symp_prob || '',
        row.ZCode_HRSN || ''
      ].join('|');
      existingCompositeKeys.add(compositeKey);
    });
    
    console.log(`Found ${existingCompositeKeys.size} unique composite keys to skip`);
    
    // Read the symptoms master CSV
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // For this run, first prioritize Problem records that are likely to be HRSN indicators
    // and then do the Symptom records if time permits
    const problemRecords = csvData.filter(row => row.sympProb === 'Problem');
    const symptomRecords = csvData.filter(row => row.sympProb === 'Symptom' || !row.sympProb);
    
    console.log(`Found ${problemRecords.length} Problem records and ${symptomRecords.length} Symptom records`);
    
    // Process Problem records first (HRSN indicators)
    const patientId = '1'; // Fixed patient ID for demo purposes
    
    // Convert CSV data to database rows - Problem records first
    const dbProblemRows = problemRecords.map(row => mapToDatabaseField(row, patientId));
    console.log(`Mapped ${dbProblemRows.length} Problem rows to database format`);
    
    // Process all Problem records
    let insertedProblems = 0;
    let skippedProblems = 0;
    
    for (let i = 0; i < dbProblemRows.length; i++) {
      const row = dbProblemRows[i];
      
      // Create composite key from all 8 fields
      const compositeKey = [
        row.patient_id || '',
        row.symptom_id || '',
        row.symptom_segment || '',
        row.diagnosis || '',
        row.diagnosis_icd10_code || '',
        row.diagnostic_category || '',
        row.symp_prob || '',
        row.ZCode_HRSN || ''
      ].join('|');
      
      // Skip if this exact record already exists (all 8 fields match)
      if (existingCompositeKeys.has(compositeKey)) {
        skippedProblems++;
        continue;
      }
      
      try {
        await db.execute(sql`
          INSERT INTO "extracted_symptoms" (
            patient_id, symptom_segment, symptom_id, dos_date, diagnosis, 
            diagnosis_icd10_code, diagnostic_category, symp_prob, "ZCode_HRSN",
            symptom_present, user_id, symptom_segments_in_note, mention_id
          )
          VALUES (
            ${row.patient_id},
            ${row.symptom_segment},
            ${row.symptom_id},
            ${row.dos_date},
            ${row.diagnosis},
            ${row.diagnosis_icd10_code},
            ${row.diagnostic_category},
            ${row.symp_prob},
            ${row.ZCode_HRSN},
            ${row.symptom_present},
            ${row.user_id},
            ${row.symptom_segments_in_note},
            ${row.mention_id}
          )
        `);
        
        insertedProblems++;
        existingCompositeKeys.add(compositeKey);
        
        // Log progress in batches
        if (insertedProblems % BATCH_SIZE === 0 || insertedProblems === dbProblemRows.length) {
          console.log(`Inserted ${insertedProblems} Problem records (${i+1}/${dbProblemRows.length} processed)...`);
        }
      } catch (error) {
        console.error(`Error inserting Problem row ${i+1}:`, error);
        console.log(`Continuing with next record...`);
      }
    }
    
    console.log(`Completed Problem records: Inserted ${insertedProblems}, skipped ${skippedProblems}`);
    
    // Now process Symptom records
    // Convert CSV data to database rows - Symptom records
    const dbSymptomRows = symptomRecords.map(row => mapToDatabaseField(row, patientId));
    console.log(`Mapped ${dbSymptomRows.length} Symptom rows to database format`);
    
    let insertedSymptoms = 0;
    let skippedSymptoms = 0;
    
    for (let i = 0; i < dbSymptomRows.length; i++) {
      const row = dbSymptomRows[i];
      
      // Create composite key from all 8 fields
      const compositeKey = [
        row.patient_id || '',
        row.symptom_id || '',
        row.symptom_segment || '',
        row.diagnosis || '',
        row.diagnosis_icd10_code || '',
        row.diagnostic_category || '',
        row.symp_prob || '',
        row.ZCode_HRSN || ''
      ].join('|');
      
      // Skip if this exact record already exists (all 8 fields match)
      if (existingCompositeKeys.has(compositeKey)) {
        skippedSymptoms++;
        continue;
      }
      
      try {
        await db.execute(sql`
          INSERT INTO "extracted_symptoms" (
            patient_id, symptom_segment, symptom_id, dos_date, diagnosis, 
            diagnosis_icd10_code, diagnostic_category, symp_prob, "ZCode_HRSN",
            symptom_present, user_id, symptom_segments_in_note, mention_id
          )
          VALUES (
            ${row.patient_id},
            ${row.symptom_segment},
            ${row.symptom_id},
            ${row.dos_date},
            ${row.diagnosis},
            ${row.diagnosis_icd10_code},
            ${row.diagnostic_category},
            ${row.symp_prob},
            ${row.ZCode_HRSN},
            ${row.symptom_present},
            ${row.user_id},
            ${row.symptom_segments_in_note},
            ${row.mention_id}
          )
        `);
        
        insertedSymptoms++;
        existingCompositeKeys.add(compositeKey);
        
        // Log progress in batches
        if (insertedSymptoms % BATCH_SIZE === 0 || insertedSymptoms === dbSymptomRows.length) {
          console.log(`Inserted ${insertedSymptoms} Symptom records (${i+1}/${dbSymptomRows.length} processed)...`);
        }
      } catch (error) {
        console.error(`Error inserting Symptom row ${i+1}:`, error);
        console.log(`Continuing with next record...`);
      }
    }
    
    console.log(`Completed Symptom records: Inserted ${insertedSymptoms}, skipped ${skippedSymptoms}`);
    
    // Verify final results
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const finalCount = parseInt(String(countResult.rows[0].count));
    
    console.log(`Final record count: ${finalCount}`);
    console.log(`Total inserted this run: ${insertedProblems + insertedSymptoms}`);
    console.log(`Total skipped this run: ${skippedProblems + skippedSymptoms}`);
    
    // Get counts by type
    const typeCountResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN "symp_prob" = 'Problem' THEN 1 END) as problem_count,
        COUNT(CASE WHEN "symp_prob" = 'Symptom' THEN 1 END) as symptom_count,
        COUNT(CASE WHEN "ZCode_HRSN" = 'ZCode/HRSN' THEN 1 END) as zcode_hrsn_count,
        COUNT(CASE WHEN "ZCode_HRSN" = 'No' THEN 1 END) as no_zcode_count
      FROM "extracted_symptoms"
    `);
    
    console.log('Type counts:');
    console.log(typeCountResult.rows[0]);
    
    console.log('Data load process completed successfully');
  } catch (error) {
    console.error('Error in data load process:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });