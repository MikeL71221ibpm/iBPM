/**
 * Simple, direct import script for symptoms
 * This script directly transfers data from CSV to database with minimal complexity
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting direct symptom import from CSV...');
    
    // Path to the CSV file
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Check database status before import
    const beforeResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`Database has ${beforeCount} records before import`);
    
    // Find the correct column names in the CSV
    const recordKeys = Object.keys(records[0]);
    console.log('CSV columns:', recordKeys);
    
    // Map CSV column names to database field names (using actual database schema)
    const columnMap = {
      '﻿diagnosticCategory': 'diagnostic_category',
      'Diagnosis_ICD-10_Code': 'diagnosis_icd10_code',
      'Diagnosis': 'diagnosis',
      'symptomId': 'symptom_id',
      'symptomSegment': 'symptom_segment',
      'sympProb': 'symp_prob'
    };
    
    // Process records in batches
    const batchSize = 100;
    let processed = 0;
    let added = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} records)`);
      
      for (const record of batch) {
        try {
          // Map fields from CSV to database columns
          const dbRecord: any = {};
          for (const [csvField, dbField] of Object.entries(columnMap)) {
            dbRecord[dbField] = record[csvField] || null;
          }
          
          // Check if record already exists (based on unique constraint fields)
          const checkResult = await pool.query(
            `SELECT id FROM symptom_master 
             WHERE symptom_id = $1 
             AND symptom_segment = $2 
             AND diagnosis = $3 
             AND (diagnostic_category = $4 OR (diagnostic_category IS NULL AND $4 IS NULL))`,
            [dbRecord.symptom_id, dbRecord.symptom_segment, dbRecord.diagnosis, dbRecord.diagnostic_category]
          );
          
          if (checkResult.rows.length > 0) {
            // Record already exists
            duplicates++;
          } else {
            // Insert new record
            const fields = Object.keys(dbRecord);
            const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
            const values = fields.map(field => dbRecord[field]);
            
            const query = `
              INSERT INTO symptom_master (${fields.join(', ')})
              VALUES (${placeholders})
              RETURNING id
            `;
            
            await pool.query(query, values);
            added++;
          }
          
          processed++;
          
          // Show progress periodically
          if (processed % 100 === 0 || processed === records.length) {
            console.log(`Progress: ${processed}/${records.length} (${Math.round(processed/records.length*100)}%)`);
            console.log(`Added: ${added}, Duplicates: ${duplicates}, Errors: ${errors}`);
          }
        } catch (error) {
          console.error(`Error processing record:`, error);
          errors++;
        }
      }
    }
    
    // Check database status after import
    const afterResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    
    console.log('\nImport complete!');
    console.log(`Records before: ${beforeCount}`);
    console.log(`Records after: ${afterCount}`);
    console.log(`Records added: ${added}`);
    console.log(`Duplicates skipped: ${duplicates}`);
    console.log(`Errors: ${errors}`);
    
    // Check for records with missing diagnostic categories
    const missingCategoriesResult = await pool.query(
      `SELECT COUNT(*) FROM symptom_master WHERE diagnostic_category IS NULL OR diagnostic_category = ''`
    );
    const missingCategories = parseInt(missingCategoriesResult.rows[0].count, 10);
    console.log(`Records with missing diagnostic categories: ${missingCategories}`);
    
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});