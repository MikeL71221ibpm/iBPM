/**
 * Script to update the diagnostic_category values in the database
 * This script reads the newer CSV file and updates existing records with proper categories
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { pool, db } from './db';

// Path to the CSV file - use the most recent version
const CSV_FILE_PATH = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');

// Batch size for updates
const BATCH_SIZE = 200;

async function main() {
  try {
    console.log('Starting diagnostic category update...');
    console.log(`Reading CSV file: ${CSV_FILE_PATH}`);
    
    // Verify file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }
    
    // Parse the CSV file
    const symptoms = await parseCSV();
    console.log(`Parsed ${symptoms.length} symptoms from CSV`);
    
    // Get the total count before update
    const beforeCount = await getCategoryCount();
    console.log(`Before update: ${beforeCount} records have diagnostic categories`);
    
    // Update the database in batches
    let updatedCount = 0;
    let processedCount = 0;
    const totalSymptoms = symptoms.length;
    
    for (let i = 0; i < symptoms.length; i += BATCH_SIZE) {
      const batch = symptoms.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(symptoms.length / BATCH_SIZE);
      
      processedCount += batch.length;
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} symptoms)`);
      console.log(`Progress: ${Math.round((processedCount / totalSymptoms) * 100)}%`);
      
      const batchUpdated = await updateBatch(batch);
      updatedCount += batchUpdated;
      
      console.log(`Updated ${batchUpdated} symptoms in batch ${batchNumber}`);
    }
    
    // Get the total count after update
    const afterCount = await getCategoryCount();
    
    console.log(`\nUpdate complete!`);
    console.log(`Before: ${beforeCount} records had diagnostic categories`);
    console.log(`After: ${afterCount} records have diagnostic categories`);
    console.log(`Total updated: ${updatedCount} symptoms`);
    
  } catch (error) {
    console.error('Error updating diagnostic categories:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Parse the CSV file
async function parseCSV() {
  return new Promise<any[]>((resolve, reject) => {
    const symptoms: any[] = [];
    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    let firstRecord = true;
    
    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // For debugging first record only
        if (firstRecord) {
          console.log('CSV Headers:', Object.keys(record).join(', '));
          console.log('First Record:', JSON.stringify(record));
          firstRecord = false;
        }
        
        // Extract the symptom segment and diagnostic category
        // Debug the record structure
        if (firstRecord) {
          console.log('Keys in record:', Object.keys(record));
          for (const key of Object.keys(record)) {
            console.log(`${key}: ${record[key]}`);
          }
        }
        
        // The CSV file format has spaces after the commas in headers
        const symptomSegment = record.symptomSegment ? record.symptomSegment.trim() : null;
        const diagnosticCategory = record.diagnosticCategory ? record.diagnosticCategory.trim() : null;
        const diagnosisIcd10Code = record[" Diagnosis_ICD-10_Code"] ? record[" Diagnosis_ICD-10_Code"].trim() : null;
        const diagnosis = record[" Diagnosis"] ? record[" Diagnosis"].trim() : null;
        
        if (symptomSegment && diagnosticCategory) {
          console.log(`Found valid symptom: ${symptomSegment}, category: ${diagnosticCategory}`);
          symptoms.push({
            symptomSegment,
            diagnosticCategory,
            diagnosisIcd10Code,
            diagnosis
          });
        }
      }
    });
    
    parser.on('error', (err) => {
      console.error('Error parsing CSV:', err);
      reject(err);
    });
    
    parser.on('end', () => {
      console.log(`Parsed ${symptoms.length} symptoms from CSV file`);
      resolve(symptoms);
    });
    
    fileStream.pipe(parser);
  });
}

// Update a batch of symptoms
async function updateBatch(symptoms: any[]) {
  let updatedCount = 0;
  
  for (const symptom of symptoms) {
    try {
      // Update based on the symptom segment, diagnosis, and ICD-10 code to ensure correct match
      const result = await pool.query(
        `UPDATE symptom_master 
         SET diagnostic_category = $1 
         WHERE symptom_segment = $2 
         AND diagnosis = $3 
         AND diagnosis_icd10_code = $4`,
        [
          symptom.diagnosticCategory, 
          symptom.symptomSegment,
          symptom.diagnosis,
          symptom.diagnosisIcd10Code
        ]
      );
      
      updatedCount += result.rowCount || 0;
    } catch (error) {
      console.error(`Error updating symptom ${symptom.symptomSegment}:`, error);
    }
  }
  
  return updatedCount;
}

// Get count of records with diagnostic categories
async function getCategoryCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
  );
  return parseInt(result.rows[0].count, 10);
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});