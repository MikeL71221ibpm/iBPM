/**
 * One-time script to update existing extracted_symptoms with correct ZCode/HRSN values
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function updateHrsnData() {
  try {
    console.log("Starting HRSN data fix process...");
    
    // First, count how many records with Problem type need updating
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM extracted_symptoms
      WHERE symp_prob = 'Problem'
        AND zcode_hrsn = 'No'
    `);
    
    // Handle the array result appropriately
    const firstRow = Array.isArray(countResult) && countResult.length > 0 ? countResult[0] : null;
    const countValue = firstRow && typeof firstRow === 'object' ? (firstRow as any).count : '0';
    const count = parseInt(countValue || '0', 10);
    console.log(`Found ${count} Problem records that need updating to ZCode/HRSN`);
    
    if (count === 0) {
      console.log("No Problem records to update, checking for other Z-code indicators...");
    } else {
      // Update ZCode_HRSN for all Problem records
      const updateResult = await db.execute(sql`
        UPDATE extracted_symptoms
        SET zcode_hrsn = 'ZCode/HRSN'
        WHERE symp_prob = 'Problem'
          AND zcode_hrsn = 'No'
      `);
      
      console.log(`Successfully updated ${count} Problem records with ZCode/HRSN value`);
    }
    
    // Also find and update any symptom_id starting with Z
    const zCodeCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM extracted_symptoms
      WHERE symptom_id LIKE 'Z%'
        AND zcode_hrsn = 'No'
    `);
    
    const zCodeRow = Array.isArray(zCodeCountResult) && zCodeCountResult.length > 0 ? zCodeCountResult[0] : null;
    const zCodeCount = zCodeRow && typeof zCodeRow === 'object' ? (zCodeRow as any).count : '0';
    const zCodeTotal = parseInt(zCodeCount || '0', 10);
    console.log(`Found ${zCodeTotal} Z-code records that need updating to ZCode/HRSN`);
    
    if (zCodeTotal > 0) {
      // Update ZCode_HRSN for all Z-code symptom_id records
      const updateZCodesResult = await db.execute(sql`
        UPDATE extracted_symptoms
        SET zcode_hrsn = 'ZCode/HRSN'
        WHERE symptom_id LIKE 'Z%'
          AND zcode_hrsn = 'No'
      `);
      
      console.log(`Successfully updated ${zCodeTotal} Z-code records with ZCode/HRSN value`);
    }
    
    // Verify the update worked by checking the current counts
    const verifyResult = await db.execute(sql`
      SELECT
        COUNT(*) as total_count,
        COUNT(CASE WHEN zcode_hrsn = 'ZCode/HRSN' THEN 1 END) as hrsn_count,
        COUNT(CASE WHEN symp_prob = 'Problem' THEN 1 END) as problem_count
      FROM extracted_symptoms
    `);
    
    console.log('Updated data counts:');
    console.log(verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error updating HRSN data:', error);
  }
}

// Execute the update function
updateHrsnData()
  .then(() => {
    console.log('HRSN data fix complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in fix-hrsn-data script:', err);
    process.exit(1);
  });