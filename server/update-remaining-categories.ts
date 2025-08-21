/**
 * Script to update the remaining diagnostic categories
 * Focuses only on NULL categories to avoid duplicates
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting update of remaining NULL diagnostic categories...');
    
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
    
    // Process command line arguments
    const args = process.argv.slice(2);
    const startingId = args[0] ? parseInt(args[0], 10) : 0;
    console.log(`Starting from record ID: ${startingId || 'beginning'}`);
    
    // Process in batches
    const batchSize = 500; // Larger batch size for efficiency
    let updatedCount = 0;
    
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
    
    // Update ONLY the records with NULL categories
    const dbRecordsResult = await pool.query(
      `SELECT id, symptom_segment, diagnostic_category 
       FROM symptom_master 
       WHERE (diagnostic_category IS NULL OR diagnostic_category = '')
       AND id > $1 
       ORDER BY id`,
      [startingId]
    );
    const dbRecords = dbRecordsResult.rows;
    
    console.log(`Found ${dbRecords.length} records with NULL categories`);
    
    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dbRecords.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      let batchUpdated = 0;
      
      for (const dbRecord of batch) {
        const segmentKey = dbRecord.symptom_segment.toLowerCase().trim();
        
        if (symptomCategories.has(segmentKey)) {
          const category = symptomCategories.get(segmentKey);
          
          try {
            // Perform the update
            console.log(`Updating: ID ${dbRecord.id}, segment "${dbRecord.symptom_segment}" => category "${category}"`);
            
            const result = await pool.query(
              `UPDATE symptom_master SET diagnostic_category = $1 WHERE id = $2`,
              [category, dbRecord.id]
            );
            
            if (result.rowCount && result.rowCount > 0) {
              updatedCount++;
              batchUpdated++;
            }
          } catch (error: any) {
            // Check if it's a unique constraint violation
            if (error.code === '23505') {
              console.log(`Skipping duplicate: ID ${dbRecord.id} (unique constraint violation)`);
            } else {
              console.error(`Error updating ID ${dbRecord.id}:`, error);
            }
          }
        }
      }
      
      // Get the last ID in this batch to report for resume purposes
      const lastId = batch.length > 0 ? batch[batch.length - 1].id : startingId;
      console.log(`Batch ${batchNumber} complete. Updated ${batchUpdated} records in this batch. Last ID: ${lastId}`);
      
      // Write the last ID to a file to facilitate resuming
      try {
        fs.writeFileSync('last_updated_id.txt', lastId.toString());
      } catch (err) {
        console.warn('Could not write last processed ID to file:', err);
      }
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