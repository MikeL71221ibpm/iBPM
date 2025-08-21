/**
 * Analyze duplicate records to understand differences between duplicates
 * This script examines all fields across duplicate records to identify subtle differences
 */
import { pool } from './db';

async function main() {
  try {
    console.log('Analyzing duplicate records in symptom_master...');
    
    // Get all duplicate sets
    const duplicateSets = await pool.query(`
      SELECT symptom_id, symptom_segment, diagnosis, diagnostic_category, COUNT(*) as count
      FROM symptom_master
      GROUP BY symptom_id, symptom_segment, diagnosis, diagnostic_category
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    
    console.log(`Found ${duplicateSets.rows.length} sets of duplicate records.`);
    
    // Analyze a sample of the duplicates
    const sampleSize = Math.min(10, duplicateSets.rows.length);
    console.log(`\nAnalyzing ${sampleSize} sample duplicate sets:`);
    
    for (let i = 0; i < sampleSize; i++) {
      const dupSet = duplicateSets.rows[i];
      console.log(`\n[Set ${i+1}] ${dupSet.symptom_id} - ${dupSet.symptom_segment} (${dupSet.count} duplicates)`);
      
      // Get the full records for this duplicate set
      const records = await pool.query(`
        SELECT * 
        FROM symptom_master
        WHERE symptom_id = $1 
          AND symptom_segment = $2 
          AND diagnosis = $3
          AND diagnostic_category = $4
        ORDER BY id
      `, [dupSet.symptom_id, dupSet.symptom_segment, dupSet.diagnosis, dupSet.diagnostic_category]);
      
      // Display ID of each record
      console.log(`IDs: ${records.rows.map(r => r.id).join(', ')}`);
      
      // Check each column for differences
      const columns = ['symptom_problem', 'symp_prob', 'diagnosis_icd10_code', 'z_code_hrsn'];
      let hasDifferences = false;
      
      for (const column of columns) {
        const values = new Set(records.rows.map(r => r[column]));
        if (values.size > 1) {
          console.log(`  ⚠️ Different ${column} values:`);
          records.rows.forEach(r => {
            console.log(`    ID ${r.id}: "${r[column]}"`);
          });
          hasDifferences = true;
        }
      }
      
      if (!hasDifferences) {
        console.log('  ✓ All records are identical (perfect duplicates)');
      }
    }
    
    // Analyze broader patterns
    console.log('\n\n=== Duplicate Records Analysis Summary ===');
    
    // Check if any duplicates have differences
    const columnsToCheck = ['symptom_problem', 'symp_prob', 'diagnosis_icd10_code', 'z_code_hrsn'];
    let totalWithDifferences = 0;
    
    for (const column of columnsToCheck) {
      const diffResult = await pool.query(`
        WITH duplicates AS (
          SELECT symptom_id, symptom_segment, diagnosis, diagnostic_category
          FROM symptom_master
          GROUP BY symptom_id, symptom_segment, diagnosis, diagnostic_category
          HAVING COUNT(*) > 1
        )
        SELECT COUNT(DISTINCT d.symptom_id) as count
        FROM duplicates d
        JOIN symptom_master s1 USING (symptom_id, symptom_segment, diagnosis, diagnostic_category)
        JOIN symptom_master s2 USING (symptom_id, symptom_segment, diagnosis, diagnostic_category)
        WHERE s1.id < s2.id AND s1.${column} IS DISTINCT FROM s2.${column}
      `);
      
      const diffCount = parseInt(diffResult.rows[0].count, 10);
      if (diffCount > 0) {
        console.log(`${diffCount} duplicate sets have different ${column} values`);
        totalWithDifferences += diffCount;
      }
    }
    
    if (totalWithDifferences === 0) {
      console.log('All duplicates are perfect duplicates (identical in all columns)');
    }
    
    // Get distribution of duplicate counts
    const countDistribution = await pool.query(`
      WITH dup_counts AS (
        SELECT symptom_id, COUNT(*) as count
        FROM symptom_master
        GROUP BY symptom_id, symptom_segment, diagnosis, diagnostic_category
        HAVING COUNT(*) > 1
      )
      SELECT count, COUNT(*) as frequency
      FROM dup_counts
      GROUP BY count
      ORDER BY count
    `);
    
    console.log('\nDistribution of duplicates:');
    countDistribution.rows.forEach(row => {
      console.log(`  ${row.count} duplicates: ${row.frequency} symptom sets`);
    });
    
  } catch (error) {
    console.error('Error analyzing duplicates:', error);
  } finally {
    await pool.end();
    console.log('\nAnalysis complete');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});