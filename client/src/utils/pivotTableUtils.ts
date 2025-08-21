/**
 * Utility functions for creating and manipulating pivot tables
 * This module is completely redone based on the working Streamlit code
 */

// Define the structure of our pivot table
export interface PivotTable {
  rows: string[];        // Row labels (segments, diagnoses, etc)
  columns: string[];     // Column labels (dates)
  data: Record<string, Record<string, { count: number; mentions?: number }>>;
}

/**
 * Create a pivot table from an array of data
 * @param data The array of data to pivot
 * @param rowField The field to use for rows (e.g., 'symptom_segment', 'diagnosis', etc)
 * @param columnField The field to use for columns (typically 'dos_date')
 * @param sympProbType Optional param to restrict to only 'Symptom' or 'Problem' records
 */
export function createPivotTable(
  data: any[], 
  rowField: string, 
  columnField: string,
  sympProbType?: 'Symptom' | 'Problem'
): PivotTable {
  try {
    console.log(`Creating pivot table: ${rowField} by ${columnField} with ${data.length} records${sympProbType ? `, filtered to ${sympProbType} records only` : ''}`);

    // If sympProbType is specified, filter the data first
    if (sympProbType) {
      // Debug the actual fields in the data
      if (data.length > 0) {
        const sampleItem = data[0];
        console.log("FIELD VALUES INSPECTION (createPivotTable):", {
          symp_prob: sampleItem.symp_prob,
          sympProb: sampleItem.sympProb,
          fieldNames: Object.keys(sampleItem).filter(key => 
            key.includes('prob') || key.includes('code') || key.includes('hrsn') || key.includes('HRSN')
          )
        });
      }
    
      // This will filter the data to only include records matching the specified type
      const originalCount = data.length;
      data = data.filter(item => {
        // Check the symp_prob field (snake_case from database)
        const sympProbValue = item.symp_prob || '';
        return typeof sympProbValue === 'string' && sympProbValue === sympProbType;
      });
      console.log(`Applied ${sympProbType} filter: ${data.length} records remaining from ${originalCount}`);
    }
    
    // Handle snakeCase to camelCase field names
    const getFieldValue = (item: any, field: string): any => {
      // Check for the snake_case version
      if (item[field] !== undefined) {
        return item[field];
      }
      
      // Check for camelCase version
      const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (item[camelField] !== undefined) {
        return item[camelField];
      }
      
      // Special case for ZCode_HRSN which might be stored differently
      if (field === 'ZCode_HRSN' && item.zCodeHrsn !== undefined) {
        return item.zCodeHrsn;
      }
      
      return undefined;
    };
    
    // Create sets for unique row and column values
    const rowValues = new Set<string>();
    const columnValues = new Set<string>();
    
    // Create an object to hold our pivot data
    const pivotData: Record<string, Record<string, { count: number; mentions?: number }>> = {};
    
    // Process each data item
    for (const item of data) {
      // Extract row value (segment, diagnosis, etc)
      let rowValue = getFieldValue(item, rowField);
      
      // Preserve the actual field value instead of replacing with "Unknown"
      // This prevents the issue where all segments/diagnoses show as "Unknown"
      if (!rowValue || rowValue === 'null' || rowValue === 'undefined') {
        // Use a more descriptive value specific to the row field
        rowValue = rowField === 'symptom_segment' ? 'Unspecified Symptom' : 
                  rowField === 'diagnosis' ? 'Unclassified Diagnosis' :
                  rowField === 'diagnostic_category' ? 'Other Category' : 'Unknown';
      }
      rowValue = String(rowValue);
      
      // Clean up Problem prefix if needed
      if (rowValue.startsWith('Problem:')) {
        rowValue = rowValue.substring(8).trim();
      }
      
      // Extract column value (date)
      let columnValue = getFieldValue(item, columnField);
      if (!columnValue || columnValue === 'null' || columnValue === 'undefined') {
        continue; // Skip items without a date
      }
      
      // Format date as MM/DD/YY consistently regardless of input format
      try {
        let date;
        
        // Handle different date formats
        if (typeof columnValue === 'string') {
          // If it's in ISO format (with T)
          if (columnValue.includes('T')) {
            date = new Date(columnValue);
          }
          // If it's in MM/DD/YYYY format
          else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(columnValue)) {
            const [month, day, year] = columnValue.split('/').map(Number);
            date = new Date(year, month - 1, day);
          }
          // If it's in MM/DD/YY format
          else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(columnValue)) {
            const [month, day, year] = columnValue.split('/').map(Number);
            date = new Date(2000 + year, month - 1, day);
          }
          // If it's in YYYY-MM-DD format
          else if (/^\d{4}-\d{2}-\d{2}$/.test(columnValue)) {
            date = new Date(columnValue);
          }
          else {
            // Try direct parsing as a fallback
            date = new Date(columnValue);
          }
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date found: ${columnValue}, using as-is`);
            columnValue = String(columnValue);
          } else {
            // Format date consistently as MM/DD/YY
            columnValue = date.toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: '2-digit'
            });
          }
        } else {
          // If it's not a string, convert it to string
          columnValue = String(columnValue);
        }
      } catch (error) {
        console.error(`Error formatting date ${columnValue}:`, error);
        // Fall back to the original value if formatting fails
        columnValue = String(columnValue);
      }
      
      // Add to sets of unique values
      rowValues.add(rowValue);
      columnValues.add(columnValue);
      
      // Initialize nested objects if needed
      if (!pivotData[rowValue]) {
        pivotData[rowValue] = {};
      }
      
      if (!pivotData[rowValue][columnValue]) {
        pivotData[rowValue][columnValue] = { count: 0 };
      }
      
      // Increment count
      pivotData[rowValue][columnValue].count++;
      
      // Track mention ID if available
      const mentionId = getFieldValue(item, 'mention_id');
      if (mentionId && pivotData[rowValue] && pivotData[rowValue][columnValue]) {
        if (!pivotData[rowValue][columnValue].mentions) {
          pivotData[rowValue][columnValue].mentions = 1;
        } else {
          pivotData[rowValue][columnValue].mentions = (pivotData[rowValue][columnValue].mentions || 0) + 1;
        }
      }
    }
    
    // Convert sets to arrays
    const rows = Array.from(rowValues);
    const columns = Array.from(columnValues);
    
    // Sort rows alphabetically (except "Unknown" which should be last)
    rows.sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
    
    // Sort date columns chronologically
    columns.sort((a, b) => {
      // Helper function to parse MM/DD/YY dates
      const parseDate = (dateStr: string): number => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1;
          const day = parseInt(parts[1], 10);
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
          return new Date(year, month, day).getTime();
        }
        return new Date(dateStr).getTime();
      };
      
      return parseDate(a) - parseDate(b);
    });
    
    console.log(`Pivot table created with ${rows.length} rows and ${columns.length} columns`);
    
    // Debug output
    if (rows.length > 0) {
      console.log('First 3 rows:', rows.slice(0, 3));
    }
    if (columns.length > 0) {
      console.log('First 3 columns:', columns.slice(0, 3));
    }
    
    return {
      rows,
      columns,
      data: pivotData
    };
  } catch (error) {
    console.error("Error creating pivot table:", error);
    return {
      rows: [],
      columns: [],
      data: {}
    };
  }
}

/**
 * Convert a pivot table to a format suitable for a heatmap
 */
export function pivotToHeatmapData(pivotTable: PivotTable): Array<{id: string, data: Array<{x: string, y: number}>}> {
  const result: Array<{id: string, data: Array<{x: string, y: number}>}> = [];
  
  try {
    // Skip processing if pivot table is empty
    if (!pivotTable.rows || pivotTable.rows.length === 0 || 
        !pivotTable.columns || pivotTable.columns.length === 0) {
      console.log("Empty pivot table, returning empty heatmap data");
      return []; // Return empty array instead of fallback data
    }
    
    // Convert each row in the pivot table to a heatmap data object
    for (const row of pivotTable.rows) {
      const rowData: Array<{x: string, y: number}> = [];
      
      // For each column (date), get the count
      for (const col of pivotTable.columns) {
        const cell = pivotTable.data[row]?.[col];
        rowData.push({
          x: col,
          y: cell?.count || 0
        });
      }
      
      // Add this row to our result array
      result.push({
        id: row,
        data: rowData
      });
    }
    
    console.log(`Generated heatmap data with ${result.length} entries`);
  } catch (error) {
    console.error("Error converting pivot to heatmap data:", error);
    // Return empty array instead of fallback data
    return [];
  }
  
  return result;
}

/**
 * Convert a pivot table to a format suitable for a bubble chart
 */
export function pivotToBubbleChartData(pivotTable: PivotTable): Array<{date: string, segment: string, count: number}> {
  const result: Array<{date: string, segment: string, count: number}> = [];
  
  try {
    console.log(`Processing ${pivotTable.rows.length} rows for bubble visualization`);
    
    // Sample the data structure to help debugging
    if (pivotTable.rows.length > 0 && pivotTable.columns.length > 0) {
      const sampleRow = pivotTable.rows[0];
      const sampleCol = pivotTable.columns[0];
      const sampleCell = pivotTable.data[sampleRow]?.[sampleCol];
      console.log("Bubble data sample cell:", { row: sampleRow, col: sampleCol, data: sampleCell });
    }
    
    // Convert pivot table to bubble chart data
    for (const row of pivotTable.rows) {
      for (const col of pivotTable.columns) {
        const count = pivotTable.data[row]?.[col]?.count || 0;
        
        // Only include non-zero counts
        if (count > 0) {
          result.push({
            date: col,            // Date (x-axis)
            segment: row,         // Segment (y-axis)
            count: count          // Size of bubble
          });
        }
      }
    }
    
    console.log(`Generated bubble chart data with ${result.length} entries`);
  } catch (error) {
    console.error("Error converting pivot to bubble chart data:", error);
  }
  
  return result;
}

/**
 * Convert a pivot table to a format suitable for a pie chart
 */
export function pivotToPieChartData(pivotTable: PivotTable): Array<{id: string, value: number}> {
  const result: Array<{id: string, value: number}> = [];
  
  try {
    // For each row, sum up the counts across all columns
    for (const row of pivotTable.rows) {
      let total = 0;
      
      for (const col of pivotTable.columns) {
        total += pivotTable.data[row]?.[col]?.count || 0;
      }
      
      // Only include rows with non-zero totals
      if (total > 0) {
        result.push({
          id: row,
          value: total
        });
      }
    }
    
    // Sort by value descending so larger slices are shown first
    result.sort((a, b) => b.value - a.value);
    
    console.log(`Generated pie chart data with ${result.length} entries`);
  } catch (error) {
    console.error("Error converting pivot to pie chart data:", error);
  }
  
  return result;
}

/**
 * Convert a pivot table to a format suitable for a bar chart
 * This is the same format as pie chart data
 */
export function pivotToBarChartData(pivotTable: PivotTable): Array<{id: string, value: number}> {
  return pivotToPieChartData(pivotTable);
}

/**
 * Direct method to create a pivot table from a list of extracted symptoms
 * This is specifically for our raw pivot table view
 */
export function pivotDataFromSymptoms(
  symptoms: any[], 
  rowField: string, 
  columnField: string,
  sympProbType?: 'Symptom' | 'Problem'
): PivotTable {
  return createPivotTable(symptoms, rowField, columnField, sympProbType);
}

/**
 * Interface for HRSN heatmap data returned by pivot table functions
 */
export interface HrsnPivotData {
  rows: string[];                               // Row categories
  columns: string[];                            // Column categories
  data: Record<string, Record<string, number>>; // Percentages by row and column
  maxValue: number;                             // Maximum percentage value for scaling
  totalRecords: number;                         // Total number of records processed
}

/**
 * Identifies the type of field for processing purposes
 */
enum FieldType {
  BOOLEAN = "boolean",   // Fields like housing_insecurity that are Yes/No or true/false
  DEMOGRAPHIC = "demographic", // Fields like gender, race, etc. with categorical values
  UNKNOWN = "unknown"    // Unrecognized field type
}

/**
 * Mapping of field names to their types
 */
const FIELD_TYPE_MAP: Record<string, FieldType> = {
  // Boolean fields
  housing_insecurity: FieldType.BOOLEAN,
  food_insecurity: FieldType.BOOLEAN,
  veteran_status: FieldType.BOOLEAN,
  access_to_transportation: FieldType.BOOLEAN,
  has_a_car: FieldType.BOOLEAN,
  
  // Demographic fields
  gender: FieldType.DEMOGRAPHIC,
  race: FieldType.DEMOGRAPHIC,
  ethnicity: FieldType.DEMOGRAPHIC,
  financial_status: FieldType.DEMOGRAPHIC,
  education_level: FieldType.DEMOGRAPHIC,
  zip_code: FieldType.DEMOGRAPHIC,
  transportation: FieldType.DEMOGRAPHIC,
  age_range: FieldType.DEMOGRAPHIC
};

/**
 * Determines the type of a field based on its name
 */
function getFieldType(fieldName: string): FieldType {
  return FIELD_TYPE_MAP[fieldName] || FieldType.UNKNOWN;
}

/**
 * Checks if a field value should be counted based on its type
 */
function shouldCountFieldValue(fieldType: FieldType, value: any): boolean {
  if (fieldType === FieldType.BOOLEAN) {
    return value === "Yes" || value === true;
  } else if (fieldType === FieldType.DEMOGRAPHIC) {
    return !!value && value !== "" && value !== "null" && value !== "undefined";
  }
  return false;
}

/**
 * Group patients by a specific field and create a mapping of field values to patient lists
 */
function groupPatientsByField(
  patientData: any[],
  fieldName: string,
  possibleValues: string[]
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  // Initialize groups with empty arrays
  possibleValues.forEach(value => {
    groups[value] = [];
  });
  
  // Add fallback group if not already included
  if (!groups["No Data Available"]) {
    groups["No Data Available"] = [];
  }
  
  // Assign patients to their groups
  patientData.forEach(patient => {
    const fieldValue = patient[fieldName] || "No Data Available";
    
    if (groups[fieldValue] !== undefined) {
      groups[fieldValue].push(patient);
    } else {
      groups["No Data Available"].push(patient);
    }
  });
  
  return groups;
}

/**
 * General-purpose function to create a pivot table for any HRSN category
 * 
 * @param patientData Array of patient records
 * @param rowField Field name to use for rows
 * @param rowValues Possible values for the row field
 * @param columnField Field name to use for columns
 * @param columnValues Possible values for the column field
 * @param countFields Array of field names to count occurrences of
 * @returns Pivot table formatted for heatmap visualization
 */
export function createHrsnPivot(
  patientData: any[],
  rowField: string,
  rowValues: string[],
  columnField: string,
  columnValues: string[],
  countFields: string[] = []
): HrsnPivotData {
  console.log(`Creating HRSN pivot with ${patientData?.length || 0} patient records`);
  console.log(`Row field: ${rowField}, Column field: ${columnField}`);
  
  try {
    // Skip if no patient data
    if (!patientData || patientData.length === 0) {
      console.log("No patient data provided for HRSN pivot");
      return {
        rows: rowValues,
        columns: columnValues,
        data: {},
        maxValue: 0,
        totalRecords: 0
      };
    }
    
    // Group patients by column field
    const columnGroups = groupPatientsByField(patientData, columnField, columnValues);
    
    // Log the distribution for debugging
    let totalGrouped = 0;
    Object.entries(columnGroups).forEach(([value, patients]) => {
      console.log(`${columnField} ${value}: ${patients.length} patients`);
      totalGrouped += patients.length;
    });
    console.log(`Total patients grouped by ${columnField}: ${totalGrouped}`);
    
    // Initialize count and percentage data structures
    const counts: Record<string, Record<string, number>> = {};
    const percentages: Record<string, Record<string, number>> = {};
    
    // Initialize the row structures
    rowValues.forEach(rowValue => {
      counts[rowValue] = {};
      percentages[rowValue] = {};
      
      columnValues.forEach(colValue => {
        counts[rowValue][colValue] = 0;
        percentages[rowValue][colValue] = 0;
      });
    });
    
    // If specific fields to count were provided, use those
    // Otherwise count occurrences of the row field values themselves
    const fieldsToCount = countFields.length > 0 ? countFields : [rowField];
    
    // Count occurrences
    patientData.forEach(patient => {
      const columnValue = patient[columnField] || "No Data Available";
      
      // If counting row field values
      if (countFields.length === 0) {
        const rowValue = patient[rowField];
        if (rowValue && rowValues.includes(rowValue)) {
          counts[rowValue][columnValue] = (counts[rowValue][columnValue] || 0) + 1;
        }
      } 
      // If counting specific fields
      else {
        fieldsToCount.forEach(field => {
          const fieldType = getFieldType(field);
          if (shouldCountFieldValue(fieldType, patient[field])) {
            counts[field][columnValue] = (counts[field][columnValue] || 0) + 1;
          }
        });
      }
    });
    
    // Calculate percentages and find max value
    let maxPercentage = 0;
    
    rowValues.forEach(rowValue => {
      columnValues.forEach(colValue => {
        const columnTotal = columnGroups[colValue].length;
        const count = counts[rowValue][colValue];
        
        // Calculate percentage (avoid division by zero)
        let percentage = 0;
        if (columnTotal > 0) {
          percentage = (count / columnTotal) * 100;
          percentage = Math.round(percentage * 10) / 10; // Round to 1 decimal place
        }
        
        percentages[rowValue][colValue] = percentage;
        
        // Update max percentage
        if (percentage > maxPercentage) {
          maxPercentage = percentage;
        }
      });
    });
    
    // Log a sample of results
    if (rowValues.length > 0) {
      console.log(`Sample percentages for ${rowValues[0]}:`, percentages[rowValues[0]]);
    }
    
    return {
      rows: rowValues,
      columns: columnValues,
      data: percentages,
      maxValue: maxPercentage,
      totalRecords: patientData.length
    };
  } catch (error) {
    console.error(`Error creating HRSN pivot for ${rowField} by ${columnField}:`, error);
    return {
      rows: rowValues,
      columns: columnValues,
      data: {},
      maxValue: 0,
      totalRecords: 0
    };
  }
}

/**
 * Specialized function to create a pivot table for HRSN indicators by age range
 * This is a convenience wrapper around createHrsnPivot
 * 
 * @param patientData Array of patient records with demographic and HRSN fields
 * @param hrsnCategories Array of HRSN category field names to include
 * @param ageRanges Array of age range categories
 * @returns Pivot table formatted for the HRSN heatmap
 */
export function createHrsnByAgeRangePivot(
  patientData: any[],
  hrsnCategories: string[],
  ageRanges: string[]
): HrsnPivotData {
  console.log(`Creating HRSN by age range pivot with ${patientData?.length || 0} patient records`);
  
  // Use the general-purpose pivot function with age_range as the column field
  // and HRSN categories as the fields to count
  return createHrsnPivot(
    patientData,
    "category", // Placeholder row field (we're counting hrsnCategories directly)
    hrsnCategories,
    "age_range",
    ageRanges,
    hrsnCategories
  );
}

/**
 * Specialized method for creating symptom-only pivot tables
 * This explicitly filters to include ONLY "Symptom" records
 */
export function createSymptomOnlyPivot(
  data: any[],
  rowField: string,
  columnField: string
): PivotTable {
  console.log(`SPECIALIZED: Creating symptom-only pivot with ${data.length} total records`);

  // Debug the actual data fields that are coming from the server
  if (data.length > 0) {
    const sampleItem = data[0];
    console.log("FIELD VALUES INSPECTION (from server, symptom pivot):", {
      symp_prob: sampleItem.symp_prob,
      sympProb: sampleItem.sympProb,
      zcode_hrsn: sampleItem.zcode_hrsn,
      ZCodeHrsn: sampleItem.ZCodeHrsn,
      ZCode_HRSN: sampleItem.ZCode_HRSN,
      fieldNames: Object.keys(sampleItem).filter(key => 
        key.includes('prob') || key.includes('code') || key.includes('hrsn') || key.includes('HRSN')
      )
    });
  }

  // Explicitly filter to only include symp_prob="Symptom" records
  const originalCount = data.length;
  const filteredData = data.filter(item => {
    // Use symp_prob (snake_case) from the database
    const sympProbValue = item.symp_prob || '';
    const isSymptom = typeof sympProbValue === 'string' && sympProbValue === 'Symptom';
    
    // Use zcode_hrsn (snake_case, no capital) from the database
    const zCodeValue = item.zcode_hrsn || '';
    const hasZCodeHrsn = typeof zCodeValue === 'string' && zCodeValue === 'ZCode/HRSN';
    
    // Only include true symptoms with no HRSN indicators
    return isSymptom && !hasZCodeHrsn;
  });

  console.log(`SPECIALIZED: After strict symptom filtering: ${filteredData.length} of ${originalCount} records remain`);
  
  // Create the pivot table with the filtered data
  return createPivotTable(filteredData, rowField, columnField);
}

/**
 * Specialized method for creating problem-only pivot tables
 * This explicitly filters to include ONLY "Problem" records
 */
export function createProblemOnlyPivot(
  data: any[],
  rowField: string,
  columnField: string
): PivotTable {
  console.log(`SPECIALIZED: Creating problem-only pivot with ${data.length} total records`);

  // Debug the actual data fields that are coming from the server
  if (data.length > 0) {
    const sampleItem = data[0];
    console.log("FIELD VALUES INSPECTION (from server, problem pivot):", {
      symp_prob: sampleItem.symp_prob,
      sympProb: sampleItem.sympProb,
      zcode_hrsn: sampleItem.zcode_hrsn,
      ZCodeHrsn: sampleItem.ZCodeHrsn,
      ZCode_HRSN: sampleItem.ZCode_HRSN,
      fieldNames: Object.keys(sampleItem).filter(key => 
        key.includes('prob') || key.includes('code') || key.includes('hrsn') || key.includes('HRSN')
      )
    });
  }

  // Explicitly filter to only include symp_prob="Problem" records
  const originalCount = data.length;
  const filteredData = data.filter(item => {
    // Use symp_prob (snake_case) from the database
    const sympProbValue = item.symp_prob || '';
    return typeof sympProbValue === 'string' && sympProbValue === 'Problem';
  });

  console.log(`SPECIALIZED: After strict problem filtering: ${filteredData.length} of ${originalCount} records remain`);
  
  // Create the pivot table with the filtered data
  return createPivotTable(filteredData, rowField, columnField);
}