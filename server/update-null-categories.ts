/**
 * Script to update NULL diagnostic categories only
 * This avoids violating the unique constraint
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_11_21_24_MASTER.csv');

async function main() {
  try {
    console.log('Starting update of NULL diagnostic categories...');
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

    // First, check the current state of NULL categories
    const { rows: beforeStats } = await pool.query(`
      SELECT 
        CASE 
          WHEN diagnostic_category IS NULL OR diagnostic_category = '' THEN 'NULL/Empty' 
          ELSE 'Has Value' 
        END as status,
        COUNT(*) 
      FROM symptom_master 
      GROUP BY status
    `);
    
    console.log('Before update:');
    console.table(beforeStats);

    // Create a mapping from symptom_id to diagnostic_category
    const categoryMap: Record<string, string> = {};
    
    for (const record of records) {
      // Find the diagnostic category key
      let diagnosticCategory: string | null = null;
      let symptomId: string | null = null;
      
      for (const key of Object.keys(record)) {
        if (key.includes('Diagnostic_Category')) {
          diagnosticCategory = record[key];
        }
        if (key.includes('Symptom_ID')) {
          symptomId = record[key];
        }
      }
      
      if (symptomId && diagnosticCategory) {
        categoryMap[symptomId] = diagnosticCategory;
      }
    }
    
    console.log(`Created mapping for ${Object.keys(categoryMap).length} symptoms`);
    
    // Get all symptoms with NULL diagnostic_category
    const { rows: nullCategories } = await pool.query(`
      SELECT id, symptom_id FROM symptom_master
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    
    console.log(`Found ${nullCategories.length} symptoms with NULL diagnostic category`);
    
    // Update NULL categories in batches
    const batchSize = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < nullCategories.length; i += batchSize) {
      const batch = nullCategories.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(nullCategories.length / batchSize);
      
      console.log(`Processing batch ${batchNum}/${totalBatches}...`);
      
      for (const symptom of batch) {
        const category = categoryMap[symptom.symptom_id];
        
        if (category) {
          try {
            const result = await pool.query(
              `UPDATE symptom_master 
               SET diagnostic_category = $1 
               WHERE id = $2 AND (diagnostic_category IS NULL OR diagnostic_category = '')`,
              [category, symptom.id]
            );
            
            if (result.rowCount && result.rowCount > 0) {
              updatedCount++;
            }
          } catch (error) {
            console.error(`Error updating symptom ${symptom.symptom_id}:`, error);
          }
        }
      }
      
      console.log(`Completed batch ${batchNum}/${totalBatches}, updated ${updatedCount} records so far`);
    }
    
    console.log(`\nUpdate complete! Updated ${updatedCount} symptom records in the database.`);

    // Check the results after update
    const { rows: afterStats } = await pool.query(`
      SELECT 
        CASE 
          WHEN diagnostic_category IS NULL OR diagnostic_category = '' THEN 'NULL/Empty' 
          ELSE 'Has Value' 
        END as status,
        COUNT(*) 
      FROM symptom_master 
      GROUP BY status
    `);
    
    console.log('After update:');
    console.table(afterStats);
    
    // Show top diagnostic categories
    const { rows: topCategories } = await pool.query(`
      SELECT diagnostic_category, COUNT(*) 
      FROM symptom_master 
      WHERE diagnostic_category IS NOT NULL AND diagnostic_category != '' 
      GROUP BY diagnostic_category 
      ORDER BY COUNT(*) DESC 
      LIMIT 10
    `);
    
    console.log('Top diagnostic categories:');
    console.table(topCategories);

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