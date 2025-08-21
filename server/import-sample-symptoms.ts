/**
 * Import a sample of symptoms
 * This script imports a small subset of symptoms to test the process
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';
import { symptomMaster } from '../shared/schema';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_11_21_24_MASTER.csv');
const SAMPLE_SIZE = 50; // Just import 50 records to test

async function main() {
  try {
    console.log('Starting SAMPLE import of symptom segments for testing');
    
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
    
    // Just take the first SAMPLE_SIZE records
    const records = allRecords.slice(0, SAMPLE_SIZE);
    console.log(`Parsed ${records.length} sample records from CSV`);
    
    // Debug: Print headers to verify structure
    if (records.length > 0) {
      console.log("CSV HEADERS:");
      console.log(Object.keys(records[0]));
      console.log("SAMPLE RECORD:");
      console.log(records[0]);
    }

    const symptomsToInsert = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Process all records into objects to insert
    for (const record of records) {
      try {
        // Access fields directly with known header names
        const symptomId = record['Symptom_ID'] || '';
        const symptomSegment = record['Symptom_Segment'] || '';
        const diagnosis = record['Diagnosis'] || '';
        const diagnosisCptCode = record['Diagnosis_CPT_Code'] || '';
        const diagnosticCategory = record['Diagnostic_Category'] || '';
        const sympProb = record['Symp_Prob'] || '';
        
        // Validate required fields
        if (!symptomId || !symptomSegment || !diagnosis) {
          console.warn('Skipping record with missing required fields:', 
            { symptomId, symptomSegment, diagnosis });
          errorCount++;
          continue;
        }
        
        // Create symptom object matching the database schema column names
        symptomsToInsert.push({
          symptomId,
          symptomSegment,
          diagnosis,
          diagnosticCategory,
          sympProb
        });
      } catch (error) {
        console.error('Error processing record:', error);
        errorCount++;
      }
    }
    
    console.log(`Attempting to insert ${symptomsToInsert.length} symptoms...`);
    
    // Insert each record individually to better handle errors
    for (const symptom of symptomsToInsert) {
      try {
        // Use raw SQL to ensure proper column mapping
        const result = await pool.query(
          `INSERT INTO symptom_master 
           (symptom_id, symptom_segment, diagnosis, diagnostic_category, symp_prob)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [symptom.symptomId, symptom.symptomSegment, symptom.diagnosis, 
           symptom.diagnosticCategory, symptom.sympProb]
        );
        
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Inserted ${successCount} symptoms so far`);
        }
      } catch (error) {
        console.error(`Error inserting symptom ${symptom.symptomId}:`, error);
        errorCount++;
      }
    }
    
    // Final report
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Get statistics from database
    const { rows: stats } = await pool.query(`
      SELECT COUNT(*) as total_symptoms FROM symptom_master
    `);
    
    console.log(`\nDatabase now contains ${stats[0].total_symptoms} symptom entries`);
    
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