import { sql } from 'drizzle-orm';
import { db } from './db';

export async function getHrsnData(patientId: string | string[], userId: number = 4) {
  try {
    console.log(`🔍 getHrsnData: Starting HRSN data retrieval for patient ID(s): ${patientId}`);
    console.log(`📊 getHrsnData: Using corrected column names and user filter`);
    
    // Handle both single patient ID and array of patient IDs
    const patientFilter = Array.isArray(patientId) 
      ? sql`patient_id = ANY(${patientId})` 
      : sql`patient_id = ${patientId}`;
    
    // Direct SQL query to get HRSN data with corrected column names and user filter
    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(dos_date, 'YYYY-MM-DD') as date,
        symptom_segment as hrsn_code,
        COUNT(*) as occurrence_count
      FROM
        extracted_symptoms
      WHERE
        user_id = ${userId}
        AND ${patientFilter}
        AND (
          -- Check for any Problem type indicators (corrected column name)
          symp_prob = 'Problem' 
          -- Check for any ZCode/HRSN markers (corrected column name)
          OR zcode_hrsn IN ('ZCode/HRSN', 'Z-Code', 'Z Code', 'HRSN', 'Yes')
          -- Check for any Z codes in the diagnosis code
          OR diagnosis_icd10_code LIKE 'Z%'
          -- Check for any Z codes in the symptom ID
          OR symptom_id LIKE 'Z%'
          -- Check for HRSN mappings indicators (corrected column name)
          OR hrsn_mappings IS NOT NULL
          -- Check for social determinants in symptom segment
          OR LOWER(symptom_segment) LIKE '%insecurity%'
          OR LOWER(symptom_segment) LIKE '%instability%'
          OR LOWER(symptom_segment) LIKE '%homelessness%'
          OR LOWER(symptom_segment) LIKE '%transportation%'
          OR LOWER(symptom_segment) LIKE '%unemployment%'
          OR LOWER(symptom_segment) LIKE '%education%'
          OR LOWER(symptom_segment) LIKE '%literacy%'
          OR LOWER(symptom_segment) LIKE '%poverty%'
        )
      GROUP BY
        date, hrsn_code
      HAVING
        hrsn_code IS NOT NULL
      ORDER BY
        date
    `);
    
    console.log(`HRSN query executed, processing results`);
    
    // Format the results into a pivot table structure
    const hrsnPivotTable: any = { rows: [] };
    const rows = Array.isArray(result) ? result : result.rows || [];
    
    console.log(`Found ${rows.length} HRSN data points for patient ID: ${patientId}`);
    
    // Log a sample of the data for debugging
    if (rows.length > 0) {
      console.log('Sample HRSN data:', rows[0]);
    } else {
      console.log('No HRSN data found for this patient');
    }
    
    // Process the raw data
    rows.forEach((row: any) => {
      const { date, hrsn_code, occurrence_count } = row;
      
      // Skip null codes
      if (!hrsn_code) return;
      
      // Clean up HRSN code by removing any prefixes (if applicable)
      let cleanCode = hrsn_code;
      
      // Add to rows if not already there
      if (cleanCode && !hrsnPivotTable.rows.includes(cleanCode)) {
        hrsnPivotTable.rows.push(cleanCode);
      }
      
      // Initialize date column if needed
      if (!hrsnPivotTable[date]) {
        hrsnPivotTable[date] = {};
      }
      
      // Add count to the pivot cell
      hrsnPivotTable[date][cleanCode] = parseInt(occurrence_count, 10);
    });
    
    // Sort rows alphabetically
    hrsnPivotTable.rows.sort();
    
    console.log(`HRSN pivot table generated with ${hrsnPivotTable.rows.length} unique codes`);
    
    // If we didn't find any real data, let's do a diagnostic query to see what data is available
    if (hrsnPivotTable.rows.length === 0) {
      console.log('No HRSN data found, running diagnostic query');
      const diagnosticResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN "ZCode_HRSN" = 'ZCode/HRSN' THEN 1 END) as zcode_hrsn_count,
          COUNT(CASE WHEN "ZCode_HRSN" = 'No' THEN 1 END) as zcode_no_count,
          COUNT(CASE WHEN "ZCode_HRSN" IS NOT NULL THEN 1 END) as total_zcode_count,
          COUNT(CASE WHEN "sympProb" = 'Problem' THEN 1 END) as problem_count,
          COUNT(CASE WHEN "sympProb" = 'Symptom' THEN 1 END) as symptom_count,
          COUNT(CASE WHEN "sympProb" IS NOT NULL THEN 1 END) as total_symprob_count,
          COUNT(CASE WHEN diagnosis_icd10_code LIKE 'Z%' THEN 1 END) as z_diag_count,
          COUNT(CASE WHEN symptom_id LIKE 'Z%' THEN 1 END) as z_symptom_count
        FROM extracted_symptoms
        WHERE patient_id = ${patientId}
      `);
      // Handle different possible result formats safely
      let diagnosticDataObj: Record<string, any> | null = null;
      
      if (diagnosticResult.rows && diagnosticResult.rows.length > 0) {
        diagnosticDataObj = diagnosticResult.rows[0];
      } else if (Array.isArray(diagnosticResult) && diagnosticResult.length > 0) {
        diagnosticDataObj = diagnosticResult[0];
      }
      
      const diagnosticSummary = diagnosticDataObj 
        ? JSON.stringify(diagnosticDataObj, null, 2)
        : 'No diagnostic data';
        
      console.log('Diagnostic data:', diagnosticSummary);
    }
    
    return hrsnPivotTable;
  } catch (error) {
    console.error('Error fetching HRSN data:', error);
    throw error;
  }
}