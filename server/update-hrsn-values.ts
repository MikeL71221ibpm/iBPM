/**
 * One-time script to update the ZCode_HRSN field for problem records
 * This addresses the HRSN Z-Codes heatmap issue showing generic "ZCode/HRSN" instead of actual problem categories
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function updateHrsnValues() {
  try {
    console.log("Starting HRSN update process...");
    
    // First, count how many records need updating
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM extracted_symptoms
      WHERE symp_prob = 'Problem'
        AND "ZCode_HRSN" = 'ZCode/HRSN'
    `);
    
    // Handle the array result appropriately
    const firstRow = Array.isArray(countResult) && countResult.length > 0 ? countResult[0] : null;
    const countValue = firstRow && typeof firstRow === 'object' ? (firstRow as any).count : '0';
    const count = parseInt(countValue || '0', 10);
    console.log(`Found ${count} Problem records with generic HRSN values that need updating`);
    
    if (count === 0) {
      console.log("No records to update, exiting");
      return;
    }
    
    // Update ZCode_HRSN to use the symptom_segment value for Problem records
    const updateResult = await db.execute(sql`
      UPDATE extracted_symptoms
      SET "ZCode_HRSN" = CONCAT('Problem: ', symptom_segment)
      WHERE symp_prob = 'Problem'
        AND "ZCode_HRSN" = 'ZCode/HRSN'
    `);
    
    console.log(`Successfully updated ${count} problem records with meaningful HRSN categories`);
    console.log(`Update result:`, updateResult);
    
    // Verify the update worked by sampling a few records
    const verifyResult = await db.execute(sql`
      SELECT
        id,
        patient_id,
        symptom_segment,
        symp_prob,
        "ZCode_HRSN"
      FROM
        extracted_symptoms
      WHERE 
        symp_prob = 'Problem'
      LIMIT 10
    `);
    
    console.log(`Verification - sample updated records:`);
    const resultArray = Array.isArray(verifyResult) ? verifyResult : [];
    resultArray.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ID=${row.id}, ZCode_HRSN="${row['ZCode_HRSN']}", segment="${row.symptom_segment}", symProb="${row.symp_prob}"`);
    });
    
    console.log("HRSN update process completed successfully");
  } catch (error) {
    console.error("Error updating HRSN values:", error);
    throw error;
  }
}

// ESM doesn't have require.main, so just run the function
updateHrsnValues()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

export default updateHrsnValues;