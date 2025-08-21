/**
 * Script to update diagnostic categories based on diagnosis name
 * This approach avoids constraint issues by matching on diagnosis names
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting diagnostic category update by diagnosis name...');
    
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
    
    // Count records with diagnostic categories before update
    const beforeResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
    );
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    
    // Count total records
    const totalResult = await pool.query(`SELECT COUNT(*) as count FROM symptom_master`);
    const totalCount = parseInt(totalResult.rows[0].count, 10);
    
    // Count missing categories
    const missingResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NULL OR diagnostic_category = ''`
    );
    const missingCount = parseInt(missingResult.rows[0].count, 10);
    
    console.log(`Before update: ${beforeCount}/${totalCount} records have diagnostic categories (${missingCount} missing)`);
    
    // Find the key with the diagnostic category (handling byte order mark if present)
    const recordKeys = records.length > 0 ? Object.keys(records[0]) : [];
    console.log('Record keys:', recordKeys);
    
    // Find the correct keys for the fields we need
    const diagnosticCategoryKey = recordKeys.find(key => key.includes('diagnosticCategory'));
    const diagnosisKey = recordKeys.find(key => key.includes('Diagnosis'));
    
    if (!diagnosticCategoryKey || !diagnosisKey) {
      console.error('Could not find required keys in CSV headers');
      console.error(`Found keys: ${recordKeys.join(', ')}`);
      return;
    }
    
    console.log(`Found diagnostic category key: "${diagnosticCategoryKey}"`);
    console.log(`Found diagnosis key: "${diagnosisKey}"`);
    
    // Create a map from diagnosis to category
    const diagnosisToCategory = new Map();
    for (const record of records) {
      const category = record[diagnosticCategoryKey];
      const diagnosis = record[diagnosisKey];
      
      if (category && diagnosis && !diagnosisToCategory.has(diagnosis)) {
        diagnosisToCategory.set(diagnosis, category);
      }
    }
    
    console.log(`Created diagnosis-to-category map with ${diagnosisToCategory.size} entries`);
    
    // Get distinct diagnoses in the database with missing categories
    const diagnosesResult = await pool.query(
      `SELECT DISTINCT diagnosis 
       FROM symptom_master 
       WHERE diagnostic_category IS NULL OR diagnostic_category = ''`
    );
    
    const diagnoses = diagnosesResult.rows.map(row => row.diagnosis);
    console.log(`Found ${diagnoses.length} distinct diagnoses with missing categories`);
    
    // Update each diagnosis
    let updatedCount = 0;
    for (const diagnosis of diagnoses) {
      const category = diagnosisToCategory.get(diagnosis);
      
      if (category) {
        try {
          console.log(`Updating category for diagnosis "${diagnosis}" => "${category}"`);
          
          const result = await pool.query(
            `UPDATE symptom_master 
             SET diagnostic_category = $1 
             WHERE diagnosis = $2 AND (diagnostic_category IS NULL OR diagnostic_category = '')`,
            [category, diagnosis]
          );
          
          console.log(`Updated ${result.rowCount} records for diagnosis "${diagnosis}"`);
          updatedCount += result.rowCount;
        } catch (error) {
          console.error(`Error updating category for diagnosis "${diagnosis}":`, error);
        }
      } else {
        console.warn(`No category found for diagnosis "${diagnosis}" in CSV data`);
      }
    }
    
    // Count records with diagnostic categories after update
    const afterResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
    );
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    
    // Count remaining records without categories
    const remainingResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NULL OR diagnostic_category = ''`
    );
    const remainingCount = parseInt(remainingResult.rows[0].count, 10);
    
    console.log('\nUpdate complete!');
    console.log(`Before: ${beforeCount} records had diagnostic categories`);
    console.log(`After: ${afterCount} records have diagnostic categories`);
    console.log(`Updated: ${updatedCount} records`);
    console.log(`Remaining records without categories: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('\nFetching sample of remaining records without categories:');
      const samplesResult = await pool.query(
        `SELECT id, symptom_id, symptom_segment, diagnosis 
         FROM symptom_master 
         WHERE diagnostic_category IS NULL OR diagnostic_category = '' 
         LIMIT 10`
      );
      console.log('Sample records:', samplesResult.rows);
      
      // Try to find diagnoses without a category
      const missingDiagnosesResult = await pool.query(
        `SELECT DISTINCT diagnosis
         FROM symptom_master 
         WHERE diagnostic_category IS NULL OR diagnostic_category = ''`
      );
      
      if (missingDiagnosesResult.rows.length > 0) {
        console.log('\nDiagnoses still missing categories:');
        missingDiagnosesResult.rows.forEach(row => {
          console.log(`- "${row.diagnosis}"`);
        });
      }
    }
    
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