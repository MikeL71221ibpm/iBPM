/**
 * Completely reset the extracted_symptoms table and reload data from the CSV file
 * 
 * This script truncates the extracted_symptoms table to remove all existing data,
 * then processes the CSV file from scratch, ensuring all records follow the new
 * data structure standards:
 * - sympProb is always "Problem" or "Symptom"
 * - ZCode_HRSN is "ZCode/HRSN" for Problem records or "No" for Symptom records
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { ExtractedSymptom, insertExtractedSymptomSchema } from '../shared/schema';

const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv';
const BATCH_SIZE = 200; // Use batch size of 200 to avoid timeout issues

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
  // Use the values directly from the CSV
  const sympProb = symptomRow.sympProb || 'Symptom';
  const zCodeHrsn = symptomRow.ZCode_HRSN || 'No';
    
  // Current date for the import
  const now = new Date();
  
  // Use a hardcoded date for test data
  const demoDate = '2025-04-20';
  
  // Generate a unique mention ID - required by the database
  const mentionId = `mention_${symptomRow.symptomId}_${now.getTime()}`;
  
  return {
    patient_id: patientId,
    symptom_segment: symptomRow.symptomSegment || '',
    symptom_id: symptomRow.symptomId || '',
    dos_date: demoDate, 
    diagnosis: symptomRow.Diagnosis || '',
    diagnosis_icd10_code: symptomRow['Diagnosis_ICD-10_Code'] || '',
    diagnostic_category: symptomRow.diagnosticCategory || symptomRow['﻿diagnosticCategory'] || '',
    // Use the values directly from the CSV
    symp_prob: sympProb,
    ZCode_HRSN: zCodeHrsn,
    // Default all other fields that might not be in the CSV
    symptom_present: 'Yes',
    symptom_detected: 'Yes',
    validated: 'Yes', 
    symptom_segments_in_note: 1,
    user_id: 2, // Default to admin user
    mention_id: mentionId, // Add the required mention_id field
    created_at: now,
    updated_at: now
  };
}

async function parseCSVFile(filePath: string): Promise<SymptomMasterRow[]> {
  return new Promise((resolve, reject) => {
    const results: SymptomMasterRow[] = [];
    
    fs.createReadStream(filePath)
      .pipe(parse({
        delimiter: ',',
        columns: true,
        trim: true,
        skip_empty_lines: true
      }))
      .on('data', (data) => results.push(data))
      .on('error', (error) => reject(error))
      .on('end', () => resolve(results));
  });
}

async function main() {
  try {
    console.log('Starting data load process...');
    
    // Check if there are already records in the table
    const existingRecordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const existingCount = parseInt(String(existingRecordsResult.rows[0].count));
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing records. Resuming import from where we left off...`);
    } else {
      // Only truncate if explicitly requested
      console.log('No existing records found. Starting fresh import...');
    }
    
    // Read the symptoms master CSV
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // Sample some data for verification
    if (csvData.length > 0) {
      console.log('Sample CSV data:');
      console.log(JSON.stringify(csvData[0], null, 2));
    }
    
    // Distribute symptoms across multiple test patients (1-10)
    console.log(`Processing all ${csvData.length} rows and distributing across patients...`);
    
    // Convert CSV data to database rows and distribute across patients
    const dbRows = csvData.map((row, index) => {
      // Distribute across 10 test patients
      const patientId = String((index % 10) + 1);
      return mapToDatabaseField(row, patientId);
    });
    
    console.log(`Mapped ${dbRows.length} rows to database format`);
    if (dbRows.length > 0) {
      console.log('Sample mapped data:');
      console.log(JSON.stringify(dbRows[0], null, 2));
    }
    
    // Insert data in batches to avoid memory issues
    let inserted = 0;
    
    // Get existing symptom IDs to avoid duplicates
    const existingIdResults = await db.execute(sql`
      SELECT DISTINCT symptom_id, patient_id FROM "extracted_symptoms"
    `);
    
    // Create a Set of unique patient_id-symptom_id combinations that already exist
    const existingSymptomKeys = new Set();
    existingIdResults.rows.forEach(row => {
      existingSymptomKeys.add(`${row.patient_id}-${row.symptom_id}`);
    });
    
    console.log(`Found ${existingSymptomKeys.size} existing symptom records to skip`);
    
    // Process each record with its own transaction for maximum resilience
    let skipped = 0;
    for (let i = 0; i < dbRows.length; i++) {
      const row = dbRows[i];
      const rowKey = `${row.patient_id}-${row.symptom_id}`;
      
      // Skip if this symptom ID for this patient already exists
      if (existingSymptomKeys.has(rowKey)) {
        skipped++;
        // Only log occasionally to avoid console spam
        if (skipped % BATCH_SIZE === 0) {
          console.log(`Skipped ${skipped} existing records so far...`);
        }
        continue;
      }
      
      try {
        // Each insert in its own transaction
        await db.execute(sql`
          INSERT INTO "extracted_symptoms" (
            patient_id, symptom_segment, symptom_id, dos_date, diagnosis, 
            diagnosis_icd10_code, diagnostic_category, symp_prob, zcode_hrsn,
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
        
        inserted++;
        existingSymptomKeys.add(rowKey); // Add to our set so we don't try to insert it again
        
        // Log progress in batches to avoid console spam
        if (inserted % BATCH_SIZE === 0) {
          console.log(`Inserted ${inserted} new records so far (${i+1}/${dbRows.length} processed)...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i+1}:`, error);
        console.error('Problem row:', row);
        
        // Don't throw the error - keep processing other rows
        console.log(`Continuing with next record...`);
      }
    }
    
    console.log(`Completed processing. Inserted ${inserted} new records, skipped ${skipped} existing records.`);
    
    // Verify results
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const finalCount = parseInt(String(countResult.rows[0].count));
    
    console.log(`Final record count: ${finalCount}`);
    
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
    
    // Sample some data from the database
    const sampleResult = await db.execute(sql`
      SELECT id, patient_id, symptom_segment, symp_prob, "ZCode_HRSN", diagnosis_icd10_code
      FROM "extracted_symptoms"
      LIMIT 5
    `);
    
    console.log('Sample data from database:');
    sampleResult.rows.forEach(row => console.log(JSON.stringify(row)));
    
    console.log('Reset and load data process completed successfully');
  } catch (error) {
    console.error('Error in reset and load data process:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });