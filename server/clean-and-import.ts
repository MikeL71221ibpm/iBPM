/**
 * Clean database and import all records directly from CSV
 * This script truncates the table and imports all records fresh
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

// Batch size for efficient processing
const BATCH_SIZE = 200;

async function main() {
  try {
    console.log('Starting clean database and import process...');
    
    // Path to the CSV file
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    const allRecords = parse(fileContent, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${allRecords.length} total records from CSV`);
    
    // Deduplicate records based on the unique constraint fields
    const uniqueMap = new Map();
    const uniqueRecords = [];
    
    for (const record of allRecords) {
      // Get diagnostic category with either possible key (with or without BOM)
      const diagnosticCategory = record['diagnosticCategory'] || record['﻿diagnosticCategory'] || null;
      
      // Create a unique key based on the constraint fields
      const key = `${record.symptomId}|${record.symptomSegment}|${record.Diagnosis}|${diagnosticCategory}`;
      
      // Only keep one record per unique key
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, record);
        uniqueRecords.push(record);
      }
    }
    
    console.log(`Deduplicated to ${uniqueRecords.length} unique records`);
    const records = uniqueRecords;
    
    // =========================================
    // STEP 1: TRUNCATE THE TABLE
    // =========================================
    console.log('\nTRUNCATING EXISTING DATA');
    console.log('------------------------');
    
    // Get count before truncate
    const beforeResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`Records before truncate: ${beforeCount}`);
    
    // Truncate the table to remove all existing data
    await pool.query('TRUNCATE TABLE symptom_master RESTART IDENTITY');
    console.log('Table truncated successfully');
    
    // Verify table is empty
    const afterTruncateResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const afterTruncateCount = parseInt(afterTruncateResult.rows[0].count, 10);
    console.log(`Records after truncate: ${afterTruncateCount}`);
    
    // =========================================
    // STEP 2: IMPORT ALL RECORDS
    // =========================================
    console.log('\nIMPORTING ALL RECORDS');
    console.log('-------------------');
    
    // Create a temporary table for efficient bulk loading
    await pool.query(`
      CREATE TEMP TABLE temp_symptoms (
        symptom_id VARCHAR(255),
        symptom_segment TEXT,
        diagnosis TEXT,
        diagnostic_category TEXT,
        symptom_problem TEXT,
        symp_prob TEXT,
        diagnosis_icd10_code VARCHAR(255),
        z_code_hrsn TEXT
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
        
        // Handle both possible variations of the diagnostic category key (with or without BOM)
        const diagnosticCategory = record['diagnosticCategory'] || record['﻿diagnosticCategory'] || null;
        
        // Get values in the correct order for database columns
        const rowValues = [
          record['symptomId'] || null,                // symptom_id
          record['symptomSegment'] || null,           // symptom_segment
          record['Diagnosis'] || null,                // diagnosis
          diagnosticCategory,                         // diagnostic_category
          record['DSM_Symptom_Criteria'] || null,     // symptom_problem
          record['sympProb'] || null,                 // symp_prob
          record['Diagnosis_ICD-10_Code'] || null,    // diagnosis_icd10_code
          record['ZCode_HRSN'] || null                // z_code_hrsn
        ];
        
        // Add values to the parameter array
        values.push(...rowValues);
        
        // Create placeholder for this row
        const offset = j * 8; // 8 columns per row
        const rowPlaceholders = [
          `$${offset + 1}`, 
          `$${offset + 2}`, 
          `$${offset + 3}`,
          `$${offset + 4}`,
          `$${offset + 5}`,
          `$${offset + 6}`,
          `$${offset + 7}`,
          `$${offset + 8}`
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
          diagnosis_icd10_code,
          z_code_hrsn
        ) 
        VALUES ${placeholders.join(', ')}
      `;
      
      await pool.query(insertQuery, values);
      processedCount += batch.length;
      console.log(`Loaded ${processedCount}/${records.length} records into temporary table`);
    }
    
    // Insert all records from temp table to main table
    const insertResult = await pool.query(`
      INSERT INTO symptom_master (
        symptom_id, 
        symptom_segment, 
        diagnosis, 
        diagnostic_category, 
        symptom_problem, 
        symp_prob, 
        diagnosis_icd10_code,
        z_code_hrsn
      )
      SELECT 
        symptom_id, 
        symptom_segment, 
        diagnosis, 
        diagnostic_category, 
        symptom_problem, 
        symp_prob, 
        diagnosis_icd10_code,
        z_code_hrsn
      FROM temp_symptoms
    `);
    
    // Get final count
    const finalResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const finalCount = parseInt(finalResult.rows[0].count, 10);
    
    // Check for null diagnostic categories
    const nullCategoriesResult = await pool.query(`
      SELECT COUNT(*) FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    const nullCategories = parseInt(nullCategoriesResult.rows[0].count, 10);
    
    console.log('\nIMPORT COMPLETE');
    console.log('--------------');
    console.log(`Records before: ${beforeCount}`);
    console.log(`Records after truncate: ${afterTruncateCount}`);
    console.log(`Records imported: ${finalCount}`);
    console.log(`Records with null diagnostic categories: ${nullCategories}`);
    
    // Check for duplicates
    const duplicatesResult = await pool.query(`
      SELECT symptom_id, symptom_segment, diagnosis, diagnostic_category, COUNT(*)
      FROM symptom_master
      GROUP BY symptom_id, symptom_segment, diagnosis, diagnostic_category
      HAVING COUNT(*) > 1
    `);
    
    if (duplicatesResult.rows.length > 0) {
      console.log(`WARNING: Found ${duplicatesResult.rows.length} duplicate sets`);
    } else {
      console.log('SUCCESS: No duplicates found!');
    }
    
    // Clean up
    await pool.query('DROP TABLE temp_symptoms');
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