import { db } from './db';
import { extractedSymptoms } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Generates pivot table data for API endpoints with proper aggregation
 * to address the duplicate symptom issue for patient data
 */
export const generatePivotData = async (
  type: 'symptom' | 'diagnosis' | 'category' | 'hrsn',
  patientId?: string | string[],
  userId: number = 4
) => {
  try {
    let column = '';
    let sympProbFilter = '';
    let excludeValues: string[] = [];
    
    // Define column and filters based on pivot type
    switch (type) {
      case 'symptom':
        column = 'symptom_segment';
        sympProbFilter = 'Symptom';
        break;
      case 'diagnosis':
        column = 'diagnosis';
        sympProbFilter = 'Symptom';
        excludeValues = ['null', ''];
        break;
      case 'category':
        column = 'diagnostic_category';
        sympProbFilter = 'Symptom';
        // Don't exclude empty values for diagnostic categories to ensure proper detection
        break;
      case 'hrsn':
        column = 'symptom_segment';
        sympProbFilter = ''; // Don't filter by symp_prob for HRSN data
        // For HRSN, we want all records with HRSN indicators regardless of Problem/Symptom classification
        break;
      default:
        throw new Error('Invalid pivot type');
    }
    
    // Build filters array - ALWAYS include user_id filter first
    const filters = [
      eq(extractedSymptoms.user_id, userId),
      // Don't include nulls or empty values
      sql`${extractedSymptoms[column]} IS NOT NULL`,
      sql`${extractedSymptoms[column]} != ''`
    ];
    
    // Add patient filter if provided - handle both single and multiple patient IDs
    if (patientId) {
      if (Array.isArray(patientId)) {
        // Multiple patient IDs from filtering
        if (patientId.length > 0) {
          filters.push(sql`${extractedSymptoms.patient_id} = ANY(${patientId})`);
        }
      } else {
        // Single patient ID
        filters.push(eq(extractedSymptoms.patient_id, patientId));
      }
    }
    
    // For all types except HRSN, filter by symptom/problem type
    if (sympProbFilter) {
      filters.push(eq(extractedSymptoms.symp_prob, sympProbFilter));
    }
    
    // For HRSN type, include all records with HRSN indicators (broader filter)
    if (type === 'hrsn') {
      filters.push(sql`(
        ${extractedSymptoms.zcode_hrsn} = 'ZCode/HRSN' 
        OR ${extractedSymptoms.symp_prob} = 'Problem'
      )`);
    }
    
    // Execute the query with all filters
    // Include position_in_text and diagnosis fields for enhanced deduplication
    const results = await db
      .select({
        id: extractedSymptoms.id,
        date: extractedSymptoms.dos_date, // Using dos_date instead of note_date
        value: extractedSymptoms[column],
        patient_id: extractedSymptoms.patient_id,
        symp_prob: extractedSymptoms.symp_prob,
        zcode_hrsn: extractedSymptoms.zcode_hrsn,
        position_in_text: extractedSymptoms.position_in_text,
        diagnosis: extractedSymptoms.diagnosis
      })
      .from(extractedSymptoms)
      .where(and(...filters));
    
    console.log(`Found ${results.length} raw records for ${type} pivot`);
    
    // Handle empty results with a consistent return value
    if (results.length === 0) {
      return createEmptyDataset();
    }
    
    // For performance and data size reasons, limit to 200 most common items for visualization
    // when working with very large datasets
    const MAX_ITEMS = 400;
    
    // Enhanced pre-aggregation with type-specific deduplication strategies
    // Different deduplication logic based on visualization type:
    //  - For Symptoms: Count actual occurrences - use position info for intensity
    //  - For Diagnosis/Categories: Allow symptoms to associate with multiple diagnoses 
    const aggregatedResults: Record<string, Record<string, number>> = {};
    const valueCounts: Record<string, number> = {};
    
    // Create a map to track unique occurrences based on the visualization type
    const uniqueOccurrences = new Map<string, boolean>();
    
    // Generate the appropriate deduplication key based on visualization type
    const getDedupKey = (item: any) => {
      const value = item.value;
      const dateStr = formatDate(item.date);
      const patientId = item.patient_id;
      const position = item.position_in_text || 0;
      
      switch(type) {
        case 'symptom': 
          // For symptoms, use position_in_text to allow intensity measurement
          // This counts genuine multiple occurrences in different parts of a note
          // Position tracking ensures each symptom mention is counted accurately
          return `${patientId}-${value.toLowerCase()}-${dateStr}-${position}`;
          
        case 'diagnosis':
        case 'category': 
          // For diagnosis/categories, link symptom with its diagnosis
          // This allows a symptom to count multiple times if it's relevant to multiple diagnoses
          // For diagnostic categories, use both diagnosis and diagnostic_category
          // Include position to count multiple occurrences properly
          const diagnosis = item.diagnosis || 'unknown';
          const diagCategory = item.diagnostic_category || 'unknown';
          return `${patientId}-${value.toLowerCase()}-${dateStr}-${diagnosis}-${diagCategory}-${position}`;
          
        case 'hrsn':
          // For HRSN, include position_in_text for accurate counting
          // This ensures multiple HRSN indications in the same note are counted correctly
          return `${patientId}-${value.toLowerCase()}-${dateStr}-${position}`;
          
        default:
          // Default case - include position for accurate counting
          return `${patientId}-${value.toLowerCase()}-${dateStr}-${position}`;
      }
    };
    
    // First pass: calculate total counts for each value with appropriate deduplication
    results.forEach(item => {
      const value = item.value;
      if (!value) return;
      
      // Use appropriate deduplication key
      const uniqueKey = getDedupKey(item);
      
      // Skip if we've already counted this combination (except for intensity-based types)
      if (uniqueOccurrences.has(uniqueKey)) {
        return;
      }
      
      // Mark this combination as seen
      uniqueOccurrences.set(uniqueKey, true);
      
      // Count this as a unique occurrence based on our deduplication strategy
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    // Get the most frequent values
    const topValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ITEMS)
      .map(entry => entry[0]);
      
    // Reset unique occurrences for the second pass
    uniqueOccurrences.clear();
    
    // Second pass: only process the top values with appropriate deduplication
    results.forEach(item => {
      const value = item.value;
      const dateStr = formatDate(item.date);
      
      if (!value || !topValues.includes(value)) return;
      
      // Use type-specific deduplication key
      const uniqueKey = getDedupKey(item);
      
      // Skip if we've already processed this combination in this pass
      if (uniqueOccurrences.has(uniqueKey)) {
        return;
      }
      
      // Mark this combination as processed
      uniqueOccurrences.set(uniqueKey, true);
      
      // Initialize value entry if not exists
      if (!aggregatedResults[value]) {
        aggregatedResults[value] = {};
      }
      
      // Increment count for this value on this date
      if (!aggregatedResults[value][dateStr]) {
        aggregatedResults[value][dateStr] = 1;
      } else {
        aggregatedResults[value][dateStr]++;
      }
    });
    
    // Convert aggregated data to the format expected by the frontend
    const uniqueDates = [...new Set(results.map(item => formatDate(item.date)))].sort();
    const uniqueValues = Object.keys(aggregatedResults);
    
    // Format data for visualization - make sure every date has an entry
    const counts: Record<string, Record<string, number>> = {};
    
    uniqueValues.forEach(value => {
      counts[value] = {};
      uniqueDates.forEach(date => {
        counts[value][date] = aggregatedResults[value][date] || 0;
      });
    });
    
    // Create the final data structure
    const pivotData = {
      columns: uniqueDates,
      rows: uniqueValues,
      data: counts
    };
    
    console.log(`Aggregated to ${uniqueValues.length} unique ${type} values for visualization`);
    
    return pivotData;
  } catch (error) {
    console.error(`Error generating ${type} pivot data:`, error);
    return createEmptyDataset(); // Return consistent empty data on error
  }
};

/**
 * Make sure we have consistent empty dataset structure
 * This prevents errors when components try to iterate over undefined properties
 */
const createEmptyDataset = () => {
  return {
    columns: [],
    rows: [],
    data: {}
  };
};

/**
 * Formats dates consistently for pivot tables
 */
const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '1/1/24'; // Use current year as default
  
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return '1/1/24'; // Current year for fallback
  }
};