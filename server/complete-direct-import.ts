/**
 * Complete direct import of ALL symptom records from CSV
 * This script quickly processes the entire CSV file, importing all records efficiently
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

// Batch size for efficient processing
const BATCH_SIZE = 200;

async function main() {
  try {
    console.log('Starting complete direct import from CSV...');
    
    // Path to the CSV file
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Get CSV column names and normalize them
    const csvColumns = Object.keys(records[0]);
    console.log('Original CSV columns:', csvColumns);
    
    // Check database schema
    const schemaResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'symptom_master'
    `);
    
    const dbColumns = schemaResult.rows.map(row => row.column_name);
    console.log('Database columns:', dbColumns);
    
    // Create mapping between CSV and database columns
    const columnMap = {
      '﻿diagnosticCategory': 'diagnostic_category',
      'diagnosticCategory': 'diagnostic_category',
      'Diagnosis_ICD-10_Code': 'diagnosis_icd10_code',
      'Diagnosis': 'diagnosis',
      'DSM_Symptom_Criteria': 'symptom_problem',
      'symptomId': 'symptom_id',
      'symptomSegment': 'symptom_segment',
      'ZCode_HRSN': 'z_code_hrsn',
      'sympProb': 'symp_prob'
    };
    
    // Create a temporary table for efficient bulk loading - using ONLY columns that exist in the database
    await pool.query(`
      CREATE TEMP TABLE temp_symptoms (
        symptom_id VARCHAR(255),
        symptom_segment TEXT,
        diagnosis TEXT,
        diagnostic_category TEXT,
        symptom_problem TEXT,
        symp_prob TEXT,
        diagnosis_icd10_code VARCHAR(255)
      )
    `);
    
    // Process in batches for efficiency
    let processedCount = 0;
    let batchCount = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      batchCount++;
      console.log(`Processing batch ${batchCount}/${Math.ceil(records.length/BATCH_SIZE)} (${batch.length} records)`);
      
      // Prepare batch insert values
      const values = [];
      const placeholders = [];
      
      for (let j = 0; j < batch.length; j++) {
        const record = batch[j];
        
        // Get values in the correct order for database columns
        // Handle both possible variations of the diagnostic category key (with or without BOM)
        const diagnosticCategory = record['diagnosticCategory'] || record['﻿diagnosticCategory'] || null;
        
        const rowValues = [
          record['symptomId'] || null,                // symptom_id
          record['symptomSegment'] || null,           // symptom_segment
          record['Diagnosis'] || null,                // diagnosis
          diagnosticCategory,                         // diagnostic_category
          record['DSM_Symptom_Criteria'] || null,     // symptom_problem
          record['sympProb'] || null,                 // symp_prob
          record['Diagnosis_ICD-10_Code'] || null     // diagnosis_icd10_code
        ];
        
        // Add values to the parameter array
        values.push(...rowValues);
        
        // Create placeholder for this row
        const offset = j * 7; // 7 columns per row
        const rowPlaceholders = [
          `$${offset + 1}`, 
          `$${offset + 2}`, 
          `$${offset + 3}`,
          `$${offset + 4}`,
          `$${offset + 5}`,
          `$${offset + 6}`,
          `$${offset + 7}`
        ].join(', ');
        
        placeholders.push(`(${rowPlaceholders})`);
      }
      
      // Insert batch into temporary table
      const insertQuery = `
        INSERT INTO temp_symptoms (
          symptom_id, 
          symptom_segment, 
          diagnosis, 
          diagnostic_category, 
          symptom_problem, 
          symp_prob, 
          diagnosis_icd10_code
        ) 
        VALUES ${placeholders.join(', ')}
      `;
      
      await pool.query(insertQuery, values);
      processedCount += batch.length;
      console.log(`Loaded ${processedCount}/${records.length} records into temporary table`);
    }
    
    // Get counts before merge
    const beforeResult = await pool.query(`
      SELECT COUNT(*) FROM symptom_master
    `);
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`Before merge: ${beforeCount} records in symptom_master`);
    
    // Use a MERGE-like operation using INSERT...ON CONFLICT
    // This will insert new records and update existing ones
    const mergeResult = await pool.query(`
      INSERT INTO symptom_master (
        symptom_id, 
        symptom_segment, 
        diagnosis, 
        diagnostic_category, 
        symptom_problem, 
        symp_prob, 
        diagnosis_icd10_code
      )
      SELECT 
        symptom_id, 
        symptom_segment, 
        diagnosis, 
        diagnostic_category, 
        symptom_problem, 
        symp_prob, 
        diagnosis_icd10_code
      FROM temp_symptoms
      ON CONFLICT (symptom_id, symptom_segment, diagnosis, diagnostic_category) 
      DO UPDATE SET
        symptom_problem = EXCLUDED.symptom_problem,
        symp_prob = EXCLUDED.symp_prob,
        diagnosis_icd10_code = EXCLUDED.diagnosis_icd10_code
    `);
    
    // Get counts after merge
    const afterResult = await pool.query(`
      SELECT COUNT(*) FROM symptom_master
    `);
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    const addedCount = afterCount - beforeCount;
    
    console.log(`\nImport complete!`);
    console.log(`Records before: ${beforeCount}`);
    console.log(`Records after: ${afterCount}`);
    console.log(`New records added: ${addedCount}`);
    console.log(`Records updated: ${processedCount - addedCount}`);
    
    // Check for null diagnostic categories
    const nullCategoriesResult = await pool.query(`
      SELECT COUNT(*) FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    const nullCategories = parseInt(nullCategoriesResult.rows[0].count, 10);
    console.log(`Records with null diagnostic categories: ${nullCategories}`);
    
    // Clean up
    await pool.query(`DROP TABLE temp_symptoms`);
    console.log('Temporary table cleaned up');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});