/**
 * Script to update existing extracted_symptoms records with ZCode_HRSN values
 * 
 * This script populates the ZCode_HRSN field based on the following rules:
 * 1. If the diagnosis is a Z-code (starts with Z), use that as the HRSN category
 * 2. If there's a problem value (sympProb field), use that to create an HRSN category
 * 3. Otherwise, mark as 'Non HRSN'
 * 
 * Note: The schema uses camelCase field 'ZCodeHrsn' in TypeScript 
 * but the actual database column is "ZCode_HRSN"
 */
import { db } from './db';
import { extractedSymptoms } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting HRSN Z-Codes update process...');
    
    // Check if column exists
    const columnCheckResult = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'extracted_symptoms' 
            AND column_name = 'ZCode_HRSN'`
    );
    
    if (columnCheckResult.rows.length === 0) {
      console.error('Error: ZCode_HRSN column does not exist in the extracted_symptoms table');
      console.log('Did you run the migration to add this column?');
      process.exit(1);
    }
    
    // Count total records first
    const countResult = await db.execute(
      sql`SELECT COUNT(*) FROM "extracted_symptoms"`
    );
    const totalRecords = parseInt(String(countResult.rows[0].count));
    console.log(`Found ${totalRecords} total extracted symptoms records`);
    
    // Update records with Z-codes first (where diagnosis starts with Z)
    const diagnosisZCodeResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = diagnosis
          WHERE diagnosis LIKE 'Z%'
          RETURNING id`
    );
    
    console.log(`Updated ${diagnosisZCodeResults.rowCount} records based on Z-code diagnoses`);
      
    // Update records with symptom_id as Z-codes (if available)
    const symptomZCodeResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = symptom_id
          WHERE "ZCode_HRSN" IS NULL AND symptom_id LIKE 'Z%'
          RETURNING id`
    );
    
    console.log(`Updated ${symptomZCodeResults.rowCount} records based on Z-code symptom IDs`);
    
    // Update records with sympProb values (if sympProb is "Problem")
    const sympProbResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = 'ZCode/HRSN'
          WHERE "ZCode_HRSN" IS NULL AND symp_prob = 'Problem'
          RETURNING id`
    );
    
    console.log(`Updated ${sympProbResults.rowCount} records based on sympProb values`);
    
    // Set remaining records to 'No'
    const nonHrsnResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = 'No'
          WHERE "ZCode_HRSN" IS NULL
          RETURNING id`
    );
    
    console.log(`Updated ${nonHrsnResults.rowCount} records as 'No'`);
    
    // Count all HRSN categories to verify results
    const hrsnCategories = await db.execute(
      sql`SELECT "ZCode_HRSN", COUNT(*) 
          FROM "extracted_symptoms" 
          GROUP BY "ZCode_HRSN" 
          ORDER BY COUNT(*) DESC`
    );
    
    console.log('HRSN Categories count:');
    hrsnCategories.rows.forEach((row) => {
      console.log(`- ${row.ZCode_HRSN || 'NULL'}: ${row.count}`);
    });
    
    // Calculate summary statistics
    const totalUpdated = 
        (diagnosisZCodeResults.rowCount || 0) + 
        (symptomZCodeResults.rowCount || 0) + 
        (sympProbResults.rowCount || 0) + 
        (nonHrsnResults.rowCount || 0);
    
    console.log('\nSummary:');
    console.log(`Total records: ${totalRecords}`);
    console.log(`Total updated: ${totalUpdated}`);
    console.log(`Z-code from diagnosis: ${diagnosisZCodeResults.rowCount || 0}`);
    console.log(`Z-code from symptom_id: ${symptomZCodeResults.rowCount || 0}`);
    console.log(`Problem-based HRSN: ${sympProbResults.rowCount || 0}`);
    console.log(`'No' symptom records: ${nonHrsnResults.rowCount || 0}`);
    
    // Look for any potentially missed records
    if (totalUpdated < totalRecords) {
      console.log(`Warning: ${totalRecords - totalUpdated} records may not have been updated`);
    }
    
    console.log('HRSN Z-Codes update completed successfully');
  } catch (error) {
    console.error('Error updating HRSN Z-Codes:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });