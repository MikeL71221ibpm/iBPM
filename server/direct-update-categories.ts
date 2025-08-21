/**
 * Simple direct update script for diagnostic categories
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting direct update of diagnostic categories...');
    
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read and parse the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    console.log('First record:', records[0]);
    
    // Count records with diagnostic categories before update
    const beforeResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
    );
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`Before update: ${beforeCount} records have diagnostic categories`);
    
    // Process in batches
    const batchSize = 100;
    let updatedCount = 0;
    let totalProcessed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      
      for (const record of batch) {
        totalProcessed++;
        
        if (totalProcessed % 100 === 0) {
          console.log(`Progress: ${Math.round((totalProcessed / records.length) * 100)}%`);
        }
        
        // Get data from record - match column names exactly as in CSV
        const diagnosticCategory = record.diagnosticCategory;
        const symptomSegment = record.symptomSegment;
        const diagnosis = record.Diagnosis;
        const diagnosisIcd10Code = record['Diagnosis_ICD-10_Code'];
        
        if (!symptomSegment || !diagnosticCategory) {
          continue;
        }
        
        try {
          // Update based on symptom segment only as the main matching key
          const result = await pool.query(
            `UPDATE symptom_master 
             SET diagnostic_category = $1 
             WHERE symptom_segment = $2`,
            [diagnosticCategory, symptomSegment]
          );
          
          updatedCount += result.rowCount || 0;
        } catch (error) {
          console.error(`Error updating symptom: ${symptomSegment}`, error);
        }
      }
      
      console.log(`Batch ${batchNumber} complete. Updated ${updatedCount} records so far.`);
    }
    
    // Count records with diagnostic categories after update
    const afterResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
    );
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    
    console.log('\nUpdate complete!');
    console.log(`Before: ${beforeCount} records had diagnostic categories`);
    console.log(`After: ${afterCount} records have diagnostic categories`);
    console.log(`Total updated: ${updatedCount} records`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});