/**
 * Complete direct import of ALL symptom records from CSV with deduplication
 * This script handles duplicate entries in the CSV by deduplicating before import
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

// Batch size for efficient processing
const BATCH_SIZE = 200;

async function main() {
  try {
    console.log('Starting complete direct import with deduplication...');
    
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
      // Create a unique key based on the constraint fields
      const key = `${record.symptomId}|${record.symptomSegment}|${record.Diagnosis}|${record.diagnosticCategory || record['﻿diagnosticCategory']}`;
      
      // Only keep one record per unique key
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, record);
        uniqueRecords.push(record);
      }
    }
    
    console.log(`Deduplicated to ${uniqueRecords.length} unique records`);
    const records = uniqueRecords;
    
    // Check database schema
    const schemaResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'symptom_master'
    `);
    
    const dbColumns = schemaResult.rows.map(row => row.column_name);
    console.log('Database columns:', dbColumns);
    
    // Create a temporary table for efficient bulk loading
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
        
        // Handle both possible variations of the diagnostic category key (with or without BOM)
        const diagnosticCategory = record.diagnosticCategory || record['﻿diagnosticCategory'] || null;
        
        // Get values in the correct order for database columns
        const rowValues = [
          record.symptomId || null,                // symptom_id
          record.symptomSegment || null,           // symptom_segment
          record.Diagnosis || null,                // diagnosis
          diagnosticCategory,                      // diagnostic_category
          record.DSM_Symptom_Criteria || null,     // symptom_problem
          record.sympProb || null,                 // symp_prob
          record['Diagnosis_ICD-10_Code'] || null  // diagnosis_icd10_code
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
    
    // Merge temp table into main table one batch at a time
    const batches = Math.ceil(records.length / BATCH_SIZE);
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 1; i <= batches; i++) {
      try {
        console.log(`Merging batch ${i}/${batches}`);
        
        // Use a DISTINCT ON query to ensure we're only importing unique records
        const importResult = await pool.query(`
          WITH batch AS (
            SELECT DISTINCT ON (symptom_id, symptom_segment, diagnosis, diagnostic_category)
              symptom_id, symptom_segment, diagnosis, diagnostic_category,
              symptom_problem, symp_prob, diagnosis_icd10_code
            FROM temp_symptoms
            LIMIT ${BATCH_SIZE}
          ),
          deleted AS (
            DELETE FROM temp_symptoms 
            WHERE (symptom_id, symptom_segment, diagnosis, diagnostic_category) IN (
              SELECT symptom_id, symptom_segment, diagnosis, diagnostic_category FROM batch
            )
          ),
          inserted AS (
            INSERT INTO symptom_master (
              symptom_id, symptom_segment, diagnosis, diagnostic_category,
              symptom_problem, symp_prob, diagnosis_icd10_code
            )
            SELECT 
              symptom_id, symptom_segment, diagnosis, diagnostic_category,
              symptom_problem, symp_prob, diagnosis_icd10_code
            FROM batch
            ON CONFLICT (symptom_id, symptom_segment, diagnosis, diagnostic_category) 
            DO UPDATE SET
              symptom_problem = EXCLUDED.symptom_problem,
              symp_prob = EXCLUDED.symp_prob,
              diagnosis_icd10_code = EXCLUDED.diagnosis_icd10_code
            RETURNING 
              xmax = 0 as inserted,
              xmax <> 0 as updated
          )
          SELECT 
            SUM(CASE WHEN inserted THEN 1 ELSE 0 END) as inserted,
            SUM(CASE WHEN updated THEN 1 ELSE 0 END) as updated
          FROM inserted
        `);
        
        const batchInserted = parseInt(importResult.rows[0].inserted, 10) || 0;
        const batchUpdated = parseInt(importResult.rows[0].updated, 10) || 0;
        
        inserted += batchInserted;
        updated += batchUpdated;
        
        console.log(`Batch ${i}: Inserted ${batchInserted}, Updated ${batchUpdated}`);
      } catch (error) {
        console.error(`Error processing batch ${i}:`, error);
        errors++;
      }
      
      // Check if we're done
      const remainingResult = await pool.query('SELECT COUNT(*) FROM temp_symptoms');
      const remaining = parseInt(remainingResult.rows[0].count, 10);
      
      console.log(`${remaining} records remaining in temp table`);
      
      if (remaining === 0) {
        console.log('All records processed!');
        break;
      }
    }
    
    // Get counts after merge
    const afterResult = await pool.query(`
      SELECT COUNT(*) FROM symptom_master
    `);
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    
    console.log(`\nImport complete!`);
    console.log(`Records before: ${beforeCount}`);
    console.log(`Records after: ${afterCount}`);
    console.log(`New records inserted: ${inserted}`);
    console.log(`Existing records updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    
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