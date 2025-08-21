/**
 * Redistribute existing symptoms across multiple patients
 * 
 * This script updates the existing symptoms in the database to distribute them
 * across multiple test patients, fixing the issue where all symptoms were
 * assigned to patient_id 1 (Bob Test1).
 */

import { sql } from 'drizzle-orm';
import { db, pool } from './db';

// Number of test patients to distribute across
const NUM_TEST_PATIENTS = 10;
// Batch size for efficient processing
const BATCH_SIZE = 200;

async function main() {
  try {
    console.log('Starting symptom redistribution process...');
    
    // Check if there are records in the table
    const recordsResult = await db.execute(sql`SELECT COUNT(*) FROM "extracted_symptoms"`);
    const totalRecords = parseInt(String(recordsResult.rows[0].count));
    
    if (totalRecords === 0) {
      console.log('No records found in the database. Nothing to redistribute.');
      return;
    }
    
    console.log(`Found ${totalRecords} symptoms to redistribute across ${NUM_TEST_PATIENTS} patients`);
    
    // Get counts per patient before redistribution
    const beforeCountsResult = await db.execute(sql`
      SELECT patient_id, COUNT(*) as count
      FROM "extracted_symptoms"
      GROUP BY patient_id
      ORDER BY count DESC
    `);
    
    console.log('Before redistribution - symptoms per patient:');
    beforeCountsResult.rows.forEach(row => {
      console.log(`Patient ${row.patient_id}: ${row.count} symptoms`);
    });
    
    // Get all symptom IDs and divide them among patients
    const symptomsResult = await db.execute(sql`
      SELECT id
      FROM "extracted_symptoms"
      ORDER BY id
    `);
    
    const totalSymptoms = symptomsResult.rows.length;
    console.log(`Retrieved ${totalSymptoms} symptom IDs for redistribution`);
    
    // Update symptoms in batches
    let updatedCount = 0;
    
    for (let i = 0; i < totalSymptoms; i++) {
      const symptomId = symptomsResult.rows[i].id;
      // Assign patient ID based on index (distribute evenly)
      const patientId = String((i % NUM_TEST_PATIENTS) + 1);
      
      try {
        await db.execute(sql`
          UPDATE "extracted_symptoms"
          SET patient_id = ${patientId}
          WHERE id = ${symptomId}
        `);
        
        updatedCount++;
        
        // Log progress in batches
        if (updatedCount % BATCH_SIZE === 0 || updatedCount === totalSymptoms) {
          const percentComplete = (updatedCount / totalSymptoms) * 100;
          console.log(`Progress: ${updatedCount}/${totalSymptoms} symptoms updated (${percentComplete.toFixed(1)}%)`);
        }
      } catch (error) {
        console.error(`Error updating symptom ID ${symptomId}:`, error);
      }
    }
    
    console.log(`Completed redistribution. Updated ${updatedCount} symptoms.`);
    
    // Get counts per patient after redistribution
    const afterCountsResult = await db.execute(sql`
      SELECT patient_id, COUNT(*) as count
      FROM "extracted_symptoms"
      GROUP BY patient_id
      ORDER BY patient_id
    `);
    
    console.log('After redistribution - symptoms per patient:');
    afterCountsResult.rows.forEach(row => {
      console.log(`Patient ${row.patient_id}: ${row.count} symptoms`);
    });
    
    // Fix the zcode_hrsn lowercase/uppercase issue while we're at it
    console.log('Fixing ZCode_HRSN case sensitivity issues...');
    
    const zcodeCaseFixResult = await db.execute(sql`
      UPDATE "extracted_symptoms"
      SET "zcode_hrsn" = "ZCode_HRSN"
      WHERE "zcode_hrsn" IS NULL AND "ZCode_HRSN" IS NOT NULL
    `);
    
    console.log(`Fixed ${zcodeCaseFixResult.rowCount || 0} records with ZCode_HRSN case issues`);
    
    console.log('Symptom redistribution process completed successfully');
  } catch (error) {
    console.error('Error in symptom redistribution process:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });