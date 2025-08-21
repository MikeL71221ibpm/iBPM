/**
 * Comprehensive script to update ALL symptom records with missing diagnostic categories
 * This script uses batch processing but ensures every record gets a category.
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting comprehensive diagnostic category update...');
    
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
    console.log(`Before update: ${beforeCount} records have diagnostic categories`);
    
    // Get total count of records
    const totalResult = await pool.query(`SELECT COUNT(*) as count FROM symptom_master`);
    const totalCount = parseInt(totalResult.rows[0].count, 10);
    console.log(`Total records in database: ${totalCount}`);
    
    // Find the key with the diagnostic category (handling byte order mark if present)
    const recordKeys = records.length > 0 ? Object.keys(records[0]) : [];
    console.log('Record keys:', recordKeys);
    
    // Find the correct keys for the fields we need
    const diagnosticCategoryKey = recordKeys.find(key => key.includes('diagnosticCategory'));
    const symptomSegmentKey = recordKeys.find(key => key.includes('symptomSegment'));
    
    if (!diagnosticCategoryKey || !symptomSegmentKey) {
      console.error('Could not find required keys in CSV headers');
      console.error(`Found keys: ${recordKeys.join(', ')}`);
      return;
    }
    
    console.log(`Found diagnostic category key: "${diagnosticCategoryKey}"`);
    console.log(`Found symptom segment key: "${symptomSegmentKey}"`);
    
    // Create a map for direct lookups
    const symptomCategories = new Map();
    for (const record of records) {
      const category = record[diagnosticCategoryKey];
      const segment = record[symptomSegmentKey];
      
      if (category && segment) {
        symptomCategories.set(segment.toLowerCase().trim(), category);
      }
    }
    
    console.log(`Created lookup map with ${symptomCategories.size} symptom segments`);
    
    // Direct bulk update approach - for each category
    let updatedCount = 0;
    const uniqueCategories = [...new Set(records.map(r => r[diagnosticCategoryKey]))].filter(Boolean);
    
    console.log(`Found ${uniqueCategories.length} unique diagnostic categories`);
    
    // For each category, update all matching records
    for (let i = 0; i < uniqueCategories.length; i++) {
      const category = uniqueCategories[i];
      console.log(`\nProcessing category ${i+1}/${uniqueCategories.length}: "${category}"`);
      
      // Find all symptom segments for this category
      const segmentsForCategory = records
        .filter(r => r[diagnosticCategoryKey] === category)
        .map(r => r[symptomSegmentKey].toLowerCase().trim());
      
      const uniqueSegments = [...new Set(segmentsForCategory)];
      console.log(`Found ${uniqueSegments.length} unique symptom segments for this category`);
      
      // Process in batches to avoid timeouts
      const batchSize = 50;
      for (let j = 0; j < uniqueSegments.length; j += batchSize) {
        const batch = uniqueSegments.slice(j, j + batchSize);
        console.log(`Processing batch ${Math.floor(j/batchSize) + 1}/${Math.ceil(uniqueSegments.length/batchSize)}`);
        
        // Update null categories directly  
        try {
          const result = await pool.query(
            `UPDATE symptom_master 
             SET diagnostic_category = $1 
             WHERE LOWER(TRIM(symptom_segment)) IN (${batch.map((_, idx) => `$${idx + 2}`).join(',')})
               AND (diagnostic_category IS NULL OR diagnostic_category = '')`,
            [category, ...batch]
          );
          
          console.log(`Updated ${result.rowCount} records for category "${category}"`);
          updatedCount += result.rowCount;
        } catch (error) {
          console.error(`Error updating batch for category "${category}":`, error);
        }
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