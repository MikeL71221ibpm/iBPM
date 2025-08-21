/**
 * Safe script to update diagnostic categories, avoiding duplicate key errors
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting safe update of diagnostic categories...');
    
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
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    console.log('First record:', records[0]);
    
    // Examine the first 10 records in detail
    console.log("\nDetailed examination of first 10 records:");
    for (let i = 0; i < 10 && i < records.length; i++) {
      const record = records[i];
      console.log(`Record ${i+1}:`);
      
      // Check if diagnosticCategory exists
      if ('diagnosticCategory' in record) {
        console.log(`  - diagnosticCategory exists: "${record.diagnosticCategory}"`);
      } else {
        console.log("  - diagnosticCategory does NOT exist");
      }
      
      // Check if symptomSegment exists
      if ('symptomSegment' in record) {
        console.log(`  - symptomSegment exists: "${record.symptomSegment}"`);
      } else {
        console.log("  - symptomSegment does NOT exist");
      }
      
      // Check if Diagnosis exists
      if ('Diagnosis' in record) {
        console.log(`  - Diagnosis exists: "${record.Diagnosis}"`);
      } else {
        console.log("  - Diagnosis does NOT exist");
      }
    }
    
    // Count valid records
    let validRecordsCount = 0;
    let invalidRecordsCount = 0;
    
    for (const record of records) {
      if ('diagnosticCategory' in record && 
          record.diagnosticCategory && 
          record.diagnosticCategory !== 'undefined' && 
          'symptomSegment' in record && 
          record.symptomSegment && 
          record.symptomSegment !== 'undefined') {
        validRecordsCount++;
      } else {
        invalidRecordsCount++;
      }
    }
    
    console.log(`\nValid records with diagnostic categories: ${validRecordsCount}`);
    console.log(`Invalid records without categories: ${invalidRecordsCount}`);
    
    // Get current data for comparison
    console.log('Fetching current database records...');
    const dbRecordsResult = await pool.query(
      `SELECT id, symptom_id, symptom_segment, diagnosis, diagnostic_category, diagnosis_icd10_code 
       FROM symptom_master`
    );
    const dbRecords = dbRecordsResult.rows;
    console.log(`Found ${dbRecords.length} records in database`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    // Create a map for quick lookup
    const dbRecordsMap = new Map();
    dbRecords.forEach(record => {
      const key = record.symptom_segment.toLowerCase().trim();
      if (!dbRecordsMap.has(key)) {
        dbRecordsMap.set(key, []);
      }
      dbRecordsMap.get(key).push(record);
    });
    
    console.log(`Created lookup map with ${dbRecordsMap.size} unique symptom segments`);
    
    // Sample database records for debugging
    console.log("Sample DB records:");
    const sampleIds = [4774, 4775, 4776, 4777, 4778];
    for (const id of sampleIds) {
      const record = dbRecords.find(r => r.id === id);
      if (record) {
        console.log(`ID: ${record.id}, Segment: "${record.symptom_segment}", Category: "${record.diagnostic_category}", Diagnosis: "${record.diagnosis}"`);
      }
    }
    
    // Sample CSV records for debugging
    console.log("\nSample CSV records:");
    for (let i = 0; i < 5; i++) {
      const record = records[i];
      console.log(`Segment: "${record.symptomSegment}", Category: "${record.diagnosticCategory}", Diagnosis: "${record.Diagnosis}"`);
    }
    
    // Process in batches
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      let batchUpdated = 0;
      
      for (const record of batch) {
        const diagnosticCategory = record.diagnosticCategory;
        const symptomSegment = record.symptomSegment;
        const diagnosis = record.Diagnosis;
        const diagnosisIcd10Code = record['Diagnosis_ICD-10_Code'];
        const symptomId = record.symptomId;
        
        if (!symptomSegment || !diagnosticCategory) {
          skippedCount++;
          continue;
        }
        
        // Look up in our map
        const key = symptomSegment.toLowerCase().trim();
        const matchingRecords = dbRecordsMap.get(key) || [];
        
        if (matchingRecords.length === 0) {
          notFoundCount++;
          continue;
        }
        
        // Try to find exact matches first
        const exactMatches = matchingRecords.filter(
          (r: any) => r.diagnosis === diagnosis && 
               r.diagnosis_icd10_code === diagnosisIcd10Code
        );
        
        const recordsToUpdate = exactMatches.length > 0 ? exactMatches : matchingRecords;
        
        for (const dbRecord of recordsToUpdate) {
          try {
            // Debug output for all matching records
            console.log(`MATCH: ID: ${dbRecord.id}, Segment: "${dbRecord.symptom_segment}", Current category: "${dbRecord.diagnostic_category}", New category: "${diagnosticCategory}"`);
            
            // Skip if category is already set and matches (check trimmed values)
            const currentCategory = (dbRecord.diagnostic_category || '').trim();
            const newCategory = diagnosticCategory.trim();
            
            if (currentCategory === newCategory) {
              console.log(`SKIP: Already matches (ID: ${dbRecord.id})`);
              skippedCount++;
              continue;
            }
            
            // Update with direct parameterized query
            const result = await pool.query(
              `UPDATE symptom_master 
               SET diagnostic_category = $1 
               WHERE id = $2`,
              [diagnosticCategory, dbRecord.id]
            );
            
            if (result.rowCount && result.rowCount > 0) {
              updatedCount++;
              batchUpdated++;
            } else {
              skippedCount++;
            }
          } catch (error: any) {
            console.error(`Error updating record ID ${dbRecord.id}: ${error.message || 'Unknown error'}`);
            errorCount++;
          }
        }
      }
      
      console.log(`Batch ${batchNumber} complete. Updated ${batchUpdated} records in this batch.`);
    }
    
    console.log('\nUpdate complete!');
    console.log(`Total records processed: ${records.length}`);
    console.log(`Records updated: ${updatedCount}`);
    console.log(`Records skipped (already up-to-date or non-modifiable): ${skippedCount}`);
    console.log(`Records not found in database: ${notFoundCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    
    // Final check
    const afterResult = await pool.query(
      `SELECT COUNT(*) as count FROM symptom_master WHERE diagnostic_category IS NOT NULL AND diagnostic_category != ''`
    );
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    console.log(`Records with diagnostic categories after update: ${afterCount}`);
    
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