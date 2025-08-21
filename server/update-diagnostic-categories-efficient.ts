/**
 * More efficient approach to update the diagnostic categories
 * Uses a temporary table to map all symptom_ids to their diagnostic categories
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_11_21_24_MASTER.csv');

async function main() {
  try {
    console.log('Starting efficient diagnostic category update...');
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

    // Create a temporary mapping table
    await pool.query(`
      CREATE TEMP TABLE symptom_category_map (
        symptom_id TEXT PRIMARY KEY,
        diagnostic_category TEXT NOT NULL
      )
    `);

    // Prepare all symptom_id to diagnostic_category mappings
    const insertPromises = [];
    const categorysByKey: Record<string, string> = {};
    
    for (const record of records) {
      // Get the diagnostic category from the record
      let diagnosticCategory = null;
      let symptomId = null;
      
      for (const key of Object.keys(record)) {
        if (key.includes('Diagnostic_Category')) {
          diagnosticCategory = record[key];
        }
        if (key.includes('Symptom_ID')) {
          symptomId = record[key];
        }
      }
      
      if (symptomId && diagnosticCategory) {
        categorysByKey[symptomId] = diagnosticCategory;
      }
    }
    
    console.log(`Prepared ${Object.keys(categorysByKey).length} category mappings`);
    
    // Insert mappings in batches
    const batchSize = 1000;
    const entries = Object.entries(categorysByKey);
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const values = batch.map(([symptomId, category]) => `('${symptomId}', '${category.replace(/'/g, "''")}')`).join(', ');
      
      await pool.query(`
        INSERT INTO symptom_category_map (symptom_id, diagnostic_category)
        VALUES ${values}
        ON CONFLICT (symptom_id) DO NOTHING
      `);
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)} into temp table`);
    }
    
    // Update the symptom_master table using a single efficient query
    const updateResult = await pool.query(`
      UPDATE symptom_master sm
      SET diagnostic_category = scm.diagnostic_category
      FROM symptom_category_map scm
      WHERE sm.symptom_id = scm.symptom_id
      AND (sm.diagnostic_category IS NULL OR sm.diagnostic_category = '')
    `);
    
    console.log(`Updated ${updateResult.rowCount || 0} symptom records with diagnostic categories`);
    
    // Check the results
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