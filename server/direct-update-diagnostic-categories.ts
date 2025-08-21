/**
 * Direct SQL update script to fix the diagnostic categories
 */
import { pool, db } from './db';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_11_21_24_MASTER.csv');

async function main() {
  try {
    console.log('Starting direct diagnostic category update...');
    console.log('Reading CSV file...');

    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }

    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const records = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });

    console.log(`Parsed ${records.length} records from CSV`);

    // Get a sample of records
    const sample = records.slice(0, 5);
    sample.forEach((record: any, i: number) => {
      console.log(`Sample ${i + 1}:`, JSON.stringify(record));
    });

    // Direct SQL update using a prepared statement
    let updateCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      console.log(`Processing batch ${batchNum}/${totalBatches}...`);
      
      for (const record: any of batch) {
        // Extract values from record (being careful with column names)
        const symptomId = record['Symptom_ID'];
        
        // Get the diagnostic category, accounting for the BOM character
        let diagnosticCategory;
        for (const key of Object.keys(record)) {
          if (key.includes('Diagnostic_Category')) {
            diagnosticCategory = record[key];
            break;
          }
        }
        
        if (symptomId && diagnosticCategory) {
          try {
            const result = await pool.query(
              `UPDATE symptom_master
               SET diagnostic_category = $1
               WHERE symptom_id = $2 AND (diagnostic_category IS NULL OR diagnostic_category = '')`,
              [diagnosticCategory, symptomId]
            );
            
            updateCount += result.rowCount || 0;
          } catch (error) {
            console.error(`Error updating symptom ${symptomId}:`, error);
          }
        }
      }
      
      console.log(`Completed batch ${batchNum}/${totalBatches}, updated ${updateCount} records so far`);
    }

    console.log(`\nUpdate complete! Updated ${updateCount} symptom records in the database.`);

    // Verify the update
    const { rows: categoryStats } = await pool.query(
      `SELECT diagnostic_category, COUNT(*) FROM symptom_master GROUP BY diagnostic_category ORDER BY COUNT(*) DESC LIMIT 10`
    );
    
    console.log('Top diagnostic categories after update:');
    console.table(categoryStats);

  } catch (error) {
    console.error('Error updating diagnostic categories:', error);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});