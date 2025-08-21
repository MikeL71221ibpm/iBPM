/**
 * View duplicate records with different values
 * This script shows the exact records that have differences
 */
import { pool } from './db';

async function main() {
  try {
    console.log('Finding duplicate records with differences...');
    
    // Find duplicates with different symptom_problem values
    const diffResult = await pool.query(`
      WITH duplicates AS (
        SELECT symptom_id, symptom_segment, diagnosis, diagnostic_category
        FROM symptom_master
        GROUP BY symptom_id, symptom_segment, diagnosis, diagnostic_category
        HAVING COUNT(*) > 1
      )
      SELECT DISTINCT d.symptom_id, d.symptom_segment, d.diagnosis, d.diagnostic_category
      FROM duplicates d
      JOIN symptom_master s1 USING (symptom_id, symptom_segment, diagnosis, diagnostic_category)
      JOIN symptom_master s2 USING (symptom_id, symptom_segment, diagnosis, diagnostic_category)
      WHERE s1.id < s2.id AND (
        s1.symptom_problem IS DISTINCT FROM s2.symptom_problem OR
        s1.diagnosis_icd10_code IS DISTINCT FROM s2.diagnosis_icd10_code OR
        s1.symp_prob IS DISTINCT FROM s2.symp_prob OR
        s1.z_code_hrsn IS DISTINCT FROM s2.z_code_hrsn
      )
      LIMIT 10
    `);
    
    console.log(`Found ${diffResult.rows.length} duplicate sets with differences. Examining:`);
    
    // Examine each duplicate set with differences
    for (let i = 0; i < diffResult.rows.length; i++) {
      const record = diffResult.rows[i];
      console.log(`\n[Different Set ${i+1}] ${record.symptom_id} - ${record.symptom_segment}`);
      
      // Get all instances of this record
      const instances = await pool.query(`
        SELECT id, symptom_id, symptom_segment, diagnosis, diagnostic_category, 
               symptom_problem, symp_prob, diagnosis_icd10_code, z_code_hrsn
        FROM symptom_master
        WHERE symptom_id = $1 
          AND symptom_segment = $2 
          AND diagnosis = $3
          AND diagnostic_category = $4
        ORDER BY id
      `, [record.symptom_id, record.symptom_segment, record.diagnosis, record.diagnostic_category]);
      
      // Print each instance with all fields
      instances.rows.forEach((rec, idx) => {
        console.log(`\nInstance ${idx+1} (ID: ${rec.id}):`);
        console.log(`  symptom_id: ${rec.symptom_id}`);
        console.log(`  symptom_segment: ${rec.symptom_segment}`);
        console.log(`  diagnosis: ${rec.diagnosis}`);
        console.log(`  diagnostic_category: ${rec.diagnostic_category}`);
        console.log(`  symptom_problem: ${rec.symptom_problem}`);
        console.log(`  symp_prob: ${rec.symp_prob}`);
        console.log(`  diagnosis_icd10_code: ${rec.diagnosis_icd10_code}`);
        console.log(`  z_code_hrsn: ${rec.z_code_hrsn}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('\nAnalysis complete');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});