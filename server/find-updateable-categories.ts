/**
 * Find which records can have their diagnostic categories updated without conflicts
 * This script identifies records that can be safely updated without duplicate key violations
 */
import { pool } from './db';

async function main() {
  try {
    console.log('Finding records that can have diagnostic categories updated safely...');
    
    // First, get count of records with null categories
    const beforeResult = await pool.query(`
      SELECT COUNT(*) 
      FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
    `);
    const beforeCount = parseInt(beforeResult.rows[0].count, 10);
    console.log(`${beforeCount} records have null categories`);
    
    if (beforeCount === 0) {
      console.log('No records to update!');
      return;
    }
    
    // Get records that need updates
    const recordsToUpdateResult = await pool.query(`
      SELECT id, symptom_id, symptom_segment, diagnosis, diagnostic_category
      FROM symptom_master 
      WHERE diagnostic_category IS NULL OR diagnostic_category = ''
      ORDER BY symptom_id
      LIMIT 1000
    `);
    
    console.log(`Examining ${recordsToUpdateResult.rows.length} records...`);
    
    // Check each record for existing duplicates
    let canUpdate = 0;
    let conflicts = 0;
    
    for (const record of recordsToUpdateResult.rows) {
      // Find a diagnostic category from a related record with the same prefix
      const prefix = record.symptom_id.substring(0, record.symptom_id.lastIndexOf('.'));
      
      const categoryResult = await pool.query(`
        SELECT diagnostic_category
        FROM symptom_master
        WHERE symptom_id LIKE $1
        AND diagnostic_category IS NOT NULL 
        AND diagnostic_category != ''
        LIMIT 1
      `, [`${prefix}%`]);
      
      if (categoryResult.rows.length === 0) {
        continue; // No category found for this prefix
      }
      
      const category = categoryResult.rows[0].diagnostic_category;
      
      // Check if updating would create a duplicate
      const duplicateCheckResult = await pool.query(`
        SELECT COUNT(*) 
        FROM symptom_master
        WHERE symptom_id = $1
        AND symptom_segment = $2
        AND diagnosis = $3
        AND diagnostic_category = $4
      `, [record.symptom_id, record.symptom_segment, record.diagnosis, category]);
      
      const duplicateCount = parseInt(duplicateCheckResult.rows[0].count, 10);
      
      if (duplicateCount > 0) {
        conflicts++;
        if (conflicts <= 5) {
          console.log(`Conflict: would create duplicate for ID ${record.id}, symptom ${record.symptom_id}, category ${category}`);
        }
      } else {
        canUpdate++;
        if (canUpdate <= 5) {
          console.log(`Can update: ID ${record.id}, symptom ${record.symptom_id} to category ${category}`);
        }
      }
    }
    
    console.log(`\nAnalysis complete:`);
    console.log(`Records examined: ${recordsToUpdateResult.rows.length}`);
    console.log(`Records that can be updated safely: ${canUpdate}`);
    console.log(`Records that would create conflicts: ${conflicts}`);
    
    // Verify what's going on with these records - check for actual duplicates
    console.log('\nChecking for existing duplicate records...');
    
    const duplicatesResult = await pool.query(`
      SELECT symptom_id, symptom_segment, diagnosis, COUNT(*)
      FROM symptom_master
      GROUP BY symptom_id, symptom_segment, diagnosis
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    
    if (duplicatesResult.rows.length > 0) {
      console.log(`Found ${duplicatesResult.rows.length} sets of duplicates:`);
      console.table(duplicatesResult.rows);
      
      // Show full details for one duplicate set
      if (duplicatesResult.rows.length > 0) {
        const example = duplicatesResult.rows[0];
        console.log('\nDetails for duplicate set:');
        
        const detailsResult = await pool.query(`
          SELECT id, symptom_id, symptom_segment, diagnosis, diagnostic_category
          FROM symptom_master
          WHERE symptom_id = $1
          AND symptom_segment = $2
          AND diagnosis = $3
          ORDER BY id
        `, [example.symptom_id, example.symptom_segment, example.diagnosis]);
        
        console.table(detailsResult.rows);
      }
    } else {
      console.log('No duplicate sets found.');
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