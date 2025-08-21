/**
 * Test script to import a small batch of symptom data
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse';

// Constants
const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';
const BATCH_SIZE = 100; // Smaller batch size for testing

// Interface for CSV data
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

// Map CSV data to database fields
function mapToDatabaseField(symptomRow: SymptomMasterRow, patientId: string): any {
  const mentionId = `mention_${symptomRow.symptom_id}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  
  return {
    patient_id: patientId,
    patient_name: 'Bob Test1', 
    provider_id: '1',
    provider_name: 'Dr. Smith',
    symptom_segment: symptomRow.symptom_segment || '',
    symptom_id: symptomRow.symptom_id || '',
    dos_date: '2025-04-20',
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
    user_id: 2,
    mention_id: mentionId
  };
}

// Parse CSV file
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

// Main function
async function main() {
  try {
    console.log('Starting test import...');
    
    // Read first few rows from CSV
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} total rows from CSV`);
    
    // Take just the first 10 rows for testing
    const testData = csvData.slice(0, 10);
    console.log(`Using first ${testData.length} rows for test`);
    
    // Show sample data
    console.log('Sample CSV data:');
    console.log(testData[0]);
    
    // Map to database fields
    const patientId = '1';
    const dbRows = testData.map(row => mapToDatabaseField(row, patientId));
    
    // Insert the records one by one
    let insertedCount = 0;
    
    for (const row of dbRows) {
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
        
        insertedCount++;
        console.log(`Inserted record ${insertedCount}/${dbRows.length}`);
      } catch (error) {
        console.error(`Error inserting row:`, error);
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} records`);
    
    // Check record count
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    console.log(`Total records in database: ${countResult.rows[0].count}`);
    
    console.log('Test import completed');
  } catch (error) {
    console.error('Error in test import:', error);
    process.exit(1);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });