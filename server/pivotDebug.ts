/**
 * Debug utility for directly generating pivot tables for the simplified visualization
 * This module provides pivot table data in a format that's easy to visualize with the simplified component
 */

import { db } from './db';
import { SQL, sql } from 'drizzle-orm';

/**
 * Generate pivot table data for a specific patient
 * @param patientId The ID of the patient
 * @returns Object containing all four pivot tables
 */
export async function generatePivotTables(patientId: string) {
  try {
    // Fetch all extracted symptoms for the patient
    const result = await db.execute<{
      symptom_segment: string;
      diagnosis: string;
      diagnostic_category: string;
      note_date: string;
      hrsn: string;
    }>(sql`
      SELECT
        symptom_segment,
        diagnosis,
        diagnostic_category,
        TO_CHAR(dos_date, 'YYYY-MM-DD') as note_date,
        CASE
          WHEN zcode_hrsn IS NULL OR zcode_hrsn = '' OR TRIM(zcode_hrsn) = '' THEN 'Not Coded'
          WHEN zcode_hrsn = 'Non HRSN' THEN 'Non HRSN'
          WHEN zcode_hrsn = 'No' THEN 'Not HRSN Related'
          WHEN zcode_hrsn LIKE 'Problem:%' THEN TRIM(SUBSTRING(zcode_hrsn FROM 9))
          WHEN symp_prob = 'Problem' THEN symptom_segment
          ELSE TRIM(zcode_hrsn)
        END as hrsn
      FROM
        extracted_symptoms
      WHERE
        patient_id = ${patientId}
      ORDER BY
        dos_date
    `);

    // Convert the query result to an array
    const symptoms = Array.isArray(result) ? result : result.rows || [];

    // Process the results and create the pivot tables
    return createPivotData(symptoms);
  } catch (error) {
    console.error('Error generating pivot tables:', error);
    throw error;
  }
}

function createPivotData(symptoms: any[]) {
  console.log("Creating pivot data from", symptoms.length, "symptoms");
  
  // Sample a few records to check the hrsn field
  if (symptoms.length > 0) {
    console.log("HRSN field sample values:", 
      symptoms.slice(0, 5).map(s => s.hrsn));
  }
  
  // Initialize the pivot tables
  const symptomPivotTable: any = { rows: [] };
  const diagnosisPivotTable: any = { rows: [] };
  const diagnosticCategoryPivotTable: any = { rows: [] };
  const hrsnPivotTable: any = { rows: [] };

  // Process the symptoms to populate the pivot tables
  symptoms.forEach(symptom => {
    const { symptom_segment, diagnosis, diagnostic_category, note_date, hrsn } = symptom;
    
    // Skip if date is invalid
    if (!note_date) return;
    
    // Process the symptom pivot table
    if (!symptomPivotTable.rows.includes(symptom_segment)) {
      symptomPivotTable.rows.push(symptom_segment);
    }
    if (!symptomPivotTable[note_date]) {
      symptomPivotTable[note_date] = {};
    }
    if (!symptomPivotTable[note_date][symptom_segment]) {
      symptomPivotTable[note_date][symptom_segment] = 0;
    }
    symptomPivotTable[note_date][symptom_segment]++;

    // Process the diagnosis pivot table
    if (!diagnosisPivotTable.rows.includes(diagnosis)) {
      diagnosisPivotTable.rows.push(diagnosis);
    }
    if (!diagnosisPivotTable[note_date]) {
      diagnosisPivotTable[note_date] = {};
    }
    if (!diagnosisPivotTable[note_date][diagnosis]) {
      diagnosisPivotTable[note_date][diagnosis] = 0;
    }
    diagnosisPivotTable[note_date][diagnosis]++;

    // Process the diagnostic category pivot table
    if (!diagnosticCategoryPivotTable.rows.includes(diagnostic_category)) {
      diagnosticCategoryPivotTable.rows.push(diagnostic_category);
    }
    if (!diagnosticCategoryPivotTable[note_date]) {
      diagnosticCategoryPivotTable[note_date] = {};
    }
    if (!diagnosticCategoryPivotTable[note_date][diagnostic_category]) {
      diagnosticCategoryPivotTable[note_date][diagnostic_category] = 0;
    }
    diagnosticCategoryPivotTable[note_date][diagnostic_category]++;

    // Process the HRSN pivot table
    // Clean up HRSN label and handle all possible formats
    let cleanHrsn = hrsn;
    
    // Only log sample values for debugging
    if (Math.random() < 0.01) { // Log only 1% of records to avoid console spam
      console.log(`HRSN DEBUG: Original Z-Code value: "${hrsn}" for date ${note_date}`);
    }
    
    // Skip "Not HRSN Related" entries for the HRSN pivot table
    if (cleanHrsn === "Not HRSN Related" || cleanHrsn === "No") {
      return; // Skip this record for HRSN pivot
    }
    
    // Standardize all non-coded items
    if (!cleanHrsn || cleanHrsn === 'Unknown' || cleanHrsn === 'Not Coded' || 
        cleanHrsn === 'Non HRSN' || cleanHrsn === 'Non-coded') {
      cleanHrsn = 'Not Coded';
    }
    
    // For all HRSN heatmap entries, use the original symptom_segment as the row label
    // This preserves the intended data structure while filtering by ZCode/HRSN
    
    // Standardize all prefixes
    if (typeof cleanHrsn === 'string') {
      // Remove "Problem:" prefix
      if (cleanHrsn.startsWith('Problem:')) {
        cleanHrsn = cleanHrsn.substring(8).trim();
      }
      
      // Remove "Z-Code:" prefix if present
      if (cleanHrsn.startsWith('Z-Code:')) {
        cleanHrsn = cleanHrsn.substring(7).trim();
      }
      
      // If after cleaning we have an empty string, mark as Not Coded
      if (cleanHrsn.trim() === '') {
        cleanHrsn = 'Not Coded';
      }
    }
    
    if (!hrsnPivotTable.rows.includes(cleanHrsn)) {
      hrsnPivotTable.rows.push(cleanHrsn);
    }
    if (!hrsnPivotTable[note_date]) {
      hrsnPivotTable[note_date] = {};
    }
    if (!hrsnPivotTable[note_date][cleanHrsn]) {
      hrsnPivotTable[note_date][cleanHrsn] = 0;
    }
    hrsnPivotTable[note_date][cleanHrsn]++;
  });

  // Sort rows alphabetically for consistent display
  symptomPivotTable.rows.sort();
  diagnosisPivotTable.rows.sort();
  diagnosticCategoryPivotTable.rows.sort();
  
  // For HRSN, ensure "Unknown" is last if it exists
  hrsnPivotTable.rows.sort((a: string, b: string) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return a.localeCompare(b);
  });

  return {
    symptomPivotTable,
    diagnosisPivotTable,
    diagnosticCategoryPivotTable,
    hrsnPivotTable
  };
}