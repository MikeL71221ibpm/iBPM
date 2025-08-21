/**
 * Fix symptom fields to ensure consistent values for sympProb and ZCode_HRSN
 * 
 * This script updates all symptom records to ensure:
 * 1. sympProb contains only "Problem" or "Symptom" values
 * 2. ZCode_HRSN contains "ZCode/HRSN" for Problem records or "No" for symptom records
 * 
 * This ensures consistent filtering and visualization across the application
 */

import { sql } from 'drizzle-orm';
import { db } from './db';

async function main() {
  try {
    console.log('Starting fix-symptom-fields process...');
    
    // Count total records first
    const countResult = await db.execute(
      sql`SELECT COUNT(*) FROM "extracted_symptoms"`
    );
    const totalRecords = parseInt(String(countResult.rows[0].count));
    console.log(`Found ${totalRecords} total extracted symptoms records`);
    
    // Log sample of current data structure
    const sampleResult = await db.execute(
      sql`SELECT id, symptom_segment, symp_prob, "ZCode_HRSN", diagnosis_icd10_code
          FROM "extracted_symptoms"
          LIMIT 5`
    );
    console.log('Sample of current data structure:');
    sampleResult.rows.forEach(row => console.log(JSON.stringify(row)));
    
    // Step 1: Fix the sympProb field to only contain "Problem" or "Symptom"
    console.log('Standardizing symp_prob field values...');
    
    // First, check the ZCode_HRSN field for any values that start with "Problem:"
    const fixProblemFromZCodeResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "symp_prob" = 'Problem'
          WHERE "ZCode_HRSN" LIKE 'Problem:%'
          RETURNING id`
    );
    
    console.log(`Updated ${fixProblemFromZCodeResults.rowCount || 0} Problem records from ZCode_HRSN`);
    
    // Next, check for any fields where symp_prob itself contains Problem-like values
    const fixProblemResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "symp_prob" = 'Problem'
          WHERE ("symp_prob" LIKE 'Problem%' OR "symp_prob" LIKE '%problem%')
            AND "symp_prob" != 'Problem' -- Skip if already set to just 'Problem'
          RETURNING id`
    );
    
    console.log(`Updated ${fixProblemResults.rowCount || 0} Problem records from sympProb values`);
    
    // Then, set everything else to "Symptom"
    const fixSymptomResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "symp_prob" = 'Symptom'
          WHERE "symp_prob" IS NULL OR ("symp_prob" != 'Problem' AND "symp_prob" != 'Symptom')
          RETURNING id`
    );
    
    console.log(`Updated ${fixSymptomResults.rowCount || 0} Symptom records`);
    
    // Step 2: Update ZCode_HRSN field based on sympProb, Z-codes, and other indicators
    
    // First fix any records with Z-code in diagnosis to have ZCode_HRSN = "ZCode/HRSN"
    const fixZCodeDiagnosisResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = 'ZCode/HRSN'
          WHERE diagnosis_icd10_code LIKE 'Z%'
          RETURNING id`
    );
    
    console.log(`Updated ${fixZCodeDiagnosisResults.rowCount || 0} Z-code diagnosis records`);
    
    // Then set any Problem records to have ZCode_HRSN = "ZCode/HRSN"
    const fixProblemZCodeResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = 'ZCode/HRSN'
          WHERE "symp_prob" = 'Problem'
          RETURNING id`
    );
    
    console.log(`Updated ${fixProblemZCodeResults.rowCount || 0} Problem records to have ZCode_HRSN = "ZCode/HRSN"`);
    
    // Finally set all other records to have ZCode_HRSN = "No"
    const fixNonHrsnResults = await db.execute(
      sql`UPDATE "extracted_symptoms" 
          SET "ZCode_HRSN" = 'No'
          WHERE "ZCode_HRSN" IS NULL OR "ZCode_HRSN" != 'ZCode/HRSN'
          RETURNING id`
    );
    
    console.log(`Updated ${fixNonHrsnResults.rowCount || 0} records to have ZCode_HRSN = "No"`);
    
    // Verify results with counts
    const resultsQuery = await db.execute(
      sql`SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN "symp_prob" = 'Problem' THEN 1 END) as problem_count,
            COUNT(CASE WHEN "symp_prob" = 'Symptom' THEN 1 END) as symptom_count,
            COUNT(CASE WHEN "ZCode_HRSN" = 'ZCode/HRSN' THEN 1 END) as zcode_hrsn_count,
            COUNT(CASE WHEN "ZCode_HRSN" = 'No' THEN 1 END) as no_zcode_count
          FROM "extracted_symptoms"`
    );
    
    console.log('Final data structure counts:');
    console.log(resultsQuery.rows[0]);
    
    // Sample updated data to verify changes
    const updatedSampleResult = await db.execute(
      sql`SELECT id, symptom_segment, symp_prob, "ZCode_HRSN", diagnosis_icd10_code
          FROM "extracted_symptoms"
          LIMIT 5`
    );
    console.log('Sample of updated data structure:');
    updatedSampleResult.rows.forEach(row => console.log(JSON.stringify(row)));
    
    console.log('Fix symptom fields process completed successfully');
  } catch (error) {
    console.error('Error fixing symptom fields:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });