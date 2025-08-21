/**
 * Update remaining records with null diagnostic categories
 * This script looks up categories from existing records with the same symptom ID prefix
 */
import { pool } from './db';

async function main() {
  try {
    console.log('Updating remaining records with null diagnostic categories...');
    
    // First, get count of records with null categories
    const beforeResult = await pool.query(`
      SELECT COUNT(*) 
      FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`${beforeCount} records have null categories before update`);
    
    if (beforeCount === 0) {
      console.log('No records to update!');
      return;
    }
    
    // Get all records with null categories
    const nullRecordsResult = await pool.query(`
      SELECT id, symptom_id
      FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    console.log(`Found ${nullRecordsResult.rows.length} records with null categories`);
    
    // Get a list of symptom ID prefixes (everything before the last dot)
    const idPrefixes = new Set();
    for (const row of nullRecordsResult.rows) {
      const symptomId = row.symptom_id;
      if (symptomId && symptomId.includes('.')) {
        const prefix = symptomId.substring(0, symptomId.lastIndexOf('.'));
        idPrefixes.add(prefix);
      }
    }
    console.log(`Found ${idPrefixes.size} unique symptom ID prefixes`);
    
    // Create a map of prefixes to categories from existing records
    const prefixToCategoryMap = new Map();
    let updated = 0;
    let errors = 0;
    
    for (const prefix of idPrefixes) {
      try {
        console.log(`Processing prefix: ${prefix}`);
        
        // Look up a category for this prefix from records that have categories
        const categoryResult = await pool.query(`
          SELECT DISTINCT diagnostic_category
          FROM symptom_master
          WHERE symptom_id LIKE $1 
          AND diagnostic_category IS NOT NULL 
          AND diagnostic_category != ''
          LIMIT 1
        `, [`${prefix}%`]);
        
        if (categoryResult.rows.length > 0) {
          const category = categoryResult.rows[0].diagnostic_category;
          console.log(`Found category "${category}" for prefix "${prefix}"`);
          
          // Update all records with this prefix that have null categories
          const updateResult = await pool.query(`
            UPDATE symptom_master
            SET diagnostic_category = $1
            WHERE symptom_id LIKE $2
            AND (diagnostic_category IS NULL OR diagnostic_category = '')
          `, [category, `${prefix}%`]);
          
          const count = updateResult.rowCount || 0;
          if (count > 0) {
            console.log(`Updated ${count} records for prefix "${prefix}"`);
            updated += count;
          }
        } else {
          console.log(`No category found for prefix "${prefix}"`);
        }
      } catch (error) {
        console.error(`Error processing prefix "${prefix}":`, error);
        errors++;
      }
    }
    
    // Get final count of records with null categories
    const afterResult = await pool.query(`
      SELECT COUNT(*) 
      FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    const afterCount = parseInt(afterResult.rows[0].count, 10);
    
    console.log('\nUpdate complete!');
    console.log(`Records with null categories before: ${beforeCount}`);
    console.log(`Records with null categories after: ${afterCount}`);
    console.log(`Records updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    
    if (afterCount > 0) {
      // Get some examples of remaining records with null categories
      const remainingResult = await pool.query(`
        SELECT id, symptom_id, symptom_segment, diagnosis
        FROM symptom_master
        WHERE diagnostic_category IS NULL OR diagnostic_category = ''
        LIMIT 10
      `);
      
      console.log('\nSample records still missing categories:');
      console.table(remainingResult.rows);
    }
    
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