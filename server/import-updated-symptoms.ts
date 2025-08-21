/**
 * Complete Symptom Master File Import Script
 * 
 * This script imports ALL symptoms from the updated master file with no filtering.
 * Uses the corrected column names that match our database schema.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';
import { symptomMaster } from '../shared/schema';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
const BATCH_SIZE = 50; // Size of database insert batches

async function main() {
  try {
    console.log('Starting COMPLETE import of all symptom segments from updated master file');
    console.log('This process will import ALL symptom segments without any filtering');
    
    // Clear existing data - confirm this is intended
    console.log('WARNING: This will clear all existing symptom_master data.');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Proceeding with import...');

    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }

    // First, delete all existing entries
    const deleteResult = await pool.query('DELETE FROM symptom_master');
    console.log(`Cleared existing symptom entries from database`);

    // Read and parse the CSV file
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const records = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Debug: Print first few headers to verify structure
    if (records.length > 0) {
      console.log("CSV HEADERS:");
      console.log(Object.keys(records[0]));
      console.log("SAMPLE RECORD:");
      console.log(records[0]);
    }

    // Process and insert records in batches
    const totalRecords = records.length;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNum}/${totalBatches}...`);
      
      for (const record of batch) {
        try {
          // The columns now directly match our schema field names
          // We can access them directly!
          const symptomToInsert = {
            symptomId: record.symptomId,
            symptomSegment: record.symptomSegment,
            diagnosis: record.Diagnosis,
            diagnosticCategory: record.diagnosticCategory,
            diagnosisIcd10Code: record['Diagnosis_ICD-10_Code'], // Include the ICD-10 code
            sympProb: record.sympProb
          };
          
          // Validate required fields
          if (!symptomToInsert.symptomId || !symptomToInsert.symptomSegment || !symptomToInsert.diagnosis) {
            console.warn('Skipping record with missing required fields:', 
              { id: symptomToInsert.symptomId, segment: symptomToInsert.symptomSegment, diagnosis: symptomToInsert.diagnosis });
            errorCount++;
            continue;
          }
          
          // Insert record into database
          try {
            // Use raw SQL to ensure proper column mapping
            const result = await pool.query(
              `INSERT INTO symptom_master 
               (symptom_id, symptom_segment, diagnosis, diagnosis_icd10_code, diagnostic_category, symp_prob)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT ON CONSTRAINT symptom_combined_unique DO UPDATE 
               SET 
                 diagnosis_icd10_code = EXCLUDED.diagnosis_icd10_code,
                 symp_prob = EXCLUDED.symp_prob
               RETURNING id`,
              [
                symptomToInsert.symptomId, 
                symptomToInsert.symptomSegment, 
                symptomToInsert.diagnosis, 
                symptomToInsert.diagnosisIcd10Code,
                symptomToInsert.diagnosticCategory, 
                symptomToInsert.sympProb
              ]
            );
            
            successCount++;
          } catch (insertError) {
            console.error(`Error inserting symptom ${symptomToInsert.symptomId}:`, insertError);
            errorCount++;
          }
          
          processedCount++;
          
          // Progress update every 100 records
          if (processedCount % 100 === 0) {
            const progress = Math.round((processedCount / totalRecords) * 100);
            console.log(`Progress: ${progress}% | Processed: ${processedCount}/${totalRecords} | Success: ${successCount} | Errors: ${errorCount}`);
          }
        } catch (error) {
          console.error('Error processing record:', error);
          errorCount++;
        }
      }
      
      // Progress report per batch
      const progress = Math.round((processedCount / totalRecords) * 100);
      console.log(`Batch ${batchNum}/${totalBatches} complete | Progress: ${progress}% | Success: ${successCount} | Errors: ${errorCount}`);
    }
    
    // Final report
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Total records processed: ${processedCount}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Get statistics from database
    const { rows: stats } = await pool.query(`
      SELECT COUNT(*) as total_symptoms FROM symptom_master
    `);
    
    console.log(`\nDatabase now contains ${stats[0].total_symptoms} symptom entries`);
    
    // Get distribution by category
    const { rows: categoryStats } = await pool.query(`
      SELECT diagnostic_category, COUNT(*) as count 
      FROM symptom_master 
      WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''
      GROUP BY diagnostic_category 
      ORDER BY COUNT(*) DESC
    `);
    
    console.log('\nSymptom distribution by diagnostic category:');
    console.table(categoryStats);
    
  } catch (error) {
    console.error('Error during symptom import:', error);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});