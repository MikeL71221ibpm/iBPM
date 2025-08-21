/**
 * PivotTableGenerator component
 * Creates and caches pivot tables for different visualizations
 * Completely rewritten based on the successful Streamlit implementation
 */
import { useMemo } from 'react';
import { ExtractedSymptom } from './DataProcessing';
import { createPivotTable, createSymptomOnlyPivot, createProblemOnlyPivot, PivotTable } from '../utils/pivotTableUtils';

// Interface for the result from usePivotTables
export interface PivotTables {
  // Direct pivot tables for each visualization type
  symptomPivot: PivotTable;
  diagnosisPivot: PivotTable;
  categoryPivot: PivotTable;
  problemPivot: PivotTable;  // Added for symptom problems
  hrsnPivot: PivotTable;
}

/**
 * Hook to generate pivot tables for visualizations
 * This is a new implementation following the Streamlit pattern
 * @param allSymptoms - All symptom records for the patient
 * @param symptomRecords - Pre-filtered symptom records (sympProb="Symptom")
 * @param problemRecords - Pre-filtered problem records (sympProb="Problem")
 */
export function usePivotTables(
  allSymptoms: ExtractedSymptom[], 
  symptomRecords?: ExtractedSymptom[],
  problemRecords?: ExtractedSymptom[]
): PivotTables {
  // Generate all pivot tables in one pass
  return useMemo(() => {
    console.log(`Generating pivot tables from ${allSymptoms.length} total records`);
    
    // Skip processing if we don't have any data
    if (!allSymptoms || allSymptoms.length === 0) {
      console.log("No symptoms data to process");
      return {
        symptomPivot: { rows: [], columns: [], data: {} },
        diagnosisPivot: { rows: [], columns: [], data: {} },
        categoryPivot: { rows: [], columns: [], data: {} },
        problemPivot: { rows: [], columns: [], data: {} },
        hrsnPivot: { rows: [], columns: [], data: {} }
      };
    }
    
    // If we don't have pre-filtered records, create them now
    const filteredSymptomRecords = symptomRecords || allSymptoms.filter(symptom => {
      // Get the sympProb value
      const sympProb = symptom.sympProb || symptom.symp_prob || '';
      
      // Must exactly match "Symptom" - nothing else counts
      return typeof sympProb === 'string' && sympProb === 'Symptom';
    });
    
    const filteredProblemRecords = problemRecords || allSymptoms.filter(symptom => {
      // Get the sympProb value
      const sympProb = symptom.sympProb || symptom.symp_prob || '';
      
      // Must exactly match "Problem" - nothing else counts
      return typeof sympProb === 'string' && sympProb === 'Problem';
    });
    
    console.log(`Using ${filteredSymptomRecords.length} symptom records and ${filteredProblemRecords.length} problem records from ${allSymptoms.length} total symptoms`);
    
    // Create the basic pivot tables using our specialized function that guarantees only symptom records
    // This ensures problems and HRSNs are excluded
    const symptomPivot = createSymptomOnlyPivot(allSymptoms, 'symptom_segment', 'dos_date');
    const diagnosisPivot = createSymptomOnlyPivot(allSymptoms, 'diagnosis', 'dos_date');
    const categoryPivot = createSymptomOnlyPivot(allSymptoms, 'diagnostic_category', 'dos_date');
    
    // Create the symptom problem pivot table with all records
    // This allows seeing the distribution of both "Symptom" and "Problem" values
    const problemPivot = createPivotTable(allSymptoms, 'symp_prob', 'dos_date');
    
    // Log statistical information about our data
    console.log(`Generated basic pivot tables:
      - ${symptomPivot.rows.length} symptom segments across ${symptomPivot.columns.length} dates
      - ${diagnosisPivot.rows.length} diagnoses across ${diagnosisPivot.columns.length} dates
      - ${categoryPivot.rows.length} diagnostic categories across ${categoryPivot.columns.length} dates
      - ${problemPivot.rows.length} symptom problems across ${problemPivot.columns.length} dates`);
    
    // Sample some data for debugging
    if (allSymptoms.length > 0) {
      console.log("Sample symptom record:", {
        id: allSymptoms[0].id,
        dosDate: allSymptoms[0].dos_date || allSymptoms[0].dosDate,
        symptomSegment: allSymptoms[0].symptom_segment || allSymptoms[0].symptomSegment,
        diagnosis: allSymptoms[0].diagnosis,
        ZCode_HRSN: allSymptoms[0].ZCode_HRSN || allSymptoms[0].zCodeHrsn,
        sympProb: allSymptoms[0].symp_prob || allSymptoms[0].sympProb
      });
    }
    
    // For HRSN visualization, we only want "Problem" records 
    // The filteredProblemRecords should already only contain these
    const hrsnSymptoms = filteredProblemRecords;
    
    console.log(`PivotTableGenerator: Using ${hrsnSymptoms.length} Problem records for HRSN visualization`);
    
    // For debugging, show some examples
    if (hrsnSymptoms.length > 0) {
      console.log("Sample HRSN problems from PivotTableGenerator:", hrsnSymptoms.slice(0, 3).map((s: ExtractedSymptom) => ({
        id: s.id,
        segment: s.symptom_segment || s.symptomSegment,
        sympProb: s.sympProb || s.symp_prob,
        ZCodeHrsn: s.ZCodeHrsn || s.ZCode_HRSN,
        dosDate: s.dos_date || s.dosDate
      })));
      
      // Log unique problem segments
      const uniqueSegments = new Set<string>();
      hrsnSymptoms.forEach(s => {
        const segment = s.symptom_segment || s.symptomSegment;
        if (segment) uniqueSegments.add(segment);
      });
      
      console.log(`Found ${uniqueSegments.size} unique problem segments in PivotTableGenerator`);
      console.log("Unique problem segments:", Array.from(uniqueSegments).slice(0, 10));
    }
    
    // Create HRSN pivot table using the actual problem symptom segments
    // This ensures we see the actual categories (housing instability, etc.) not just "Problem" or "ZCode/HRSN"
    const hrsnPivot = createPivotTable(hrsnSymptoms, 'symptom_segment', 'dos_date');
    
    // Log details about the pivot table for debugging
    console.log(`HRSN pivot table has ${hrsnPivot.rows.length} unique problem categories as rows`);
    
    if (hrsnPivot.rows.length > 0) {
      console.log("HRSN row samples:", hrsnPivot.rows.slice(0, 5));
    }
    console.log(`HRSN pivot table has ${hrsnPivot.rows.length} rows and ${hrsnPivot.columns.length} columns`);
    
    // Log row information for debugging
    if (hrsnPivot.rows.length > 0) {
      console.log("HRSN pivot rows:", hrsnPivot.rows.slice(0, 5));
    } else {
      console.warn("No rows found in HRSN pivot table!");
    }
    
    return {
      symptomPivot,
      diagnosisPivot,
      categoryPivot,
      problemPivot,
      hrsnPivot
    };
  }, [allSymptoms, symptomRecords, problemRecords]);
}

export default usePivotTables;