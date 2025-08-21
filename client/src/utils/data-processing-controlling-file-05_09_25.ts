/**
 * Data Processing Utilities
 * Last updated: May 9, 2025 - 7:33 PM
 * 
 * This module contains utilities for data processing, pivoting, and manipulation
 * Used throughout the application for consistent data transformations
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
      data = data.filter(item => item.mention_type === sympProbType);
      console.log(`After filtering for ${sympProbType} records: ${data.length} records remaining`);
    }

    // Initialize pivot table structure
    const pivotTable: PivotTable = {
      rows: [],
      columns: [],
      data: {},
    };

    // Special handling for non-standard field access
    const getFieldValue = (item: any, field: string): string => {
      // Handle special case for symptom_segment (which might be listed as symptomSegment in some data)
      if (field === 'symptom_segment' && !item.symptom_segment && item.symptomSegment) {
        return item.symptomSegment;
      }

      // Handle special case for dos_date (which might be listed as dosDate in some data)
      if (field === 'dos_date' && !item.dos_date && item.dosDate) {
        return item.dosDate;
      }

      // Handle nested fields with dot notation
      if (field.includes('.')) {
        const parts = field.split('.');
        let value = item;
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      }

      return item[field];
    };

    // Extract unique row and column values (use Set for deduplication)
    const rowsSet = new Set<string>();
    const columnsSet = new Set<string>();

    // First pass: collect unique row and column values
    for (const item of data) {
      const rowValue = getFieldValue(item, rowField);
      const columnValue = getFieldValue(item, columnField);

      if (rowValue && columnValue) {
        rowsSet.add(rowValue);
        columnsSet.add(columnValue);
      }
    }

    // Convert sets to sorted arrays (ensures consistent order)
    // For date columns, we want chronological order
    if (columnField === 'dos_date') {
      pivotTable.columns = Array.from(columnsSet).sort((a, b) => {
        // Handle various date formats we might encounter
        return new Date(a).getTime() - new Date(b).getTime();
      });
    } else {
      // For non-date columns, sort alphabetically
      pivotTable.columns = Array.from(columnsSet).sort();
    }

    // For rows, sort alphabetically by default
    pivotTable.rows = Array.from(rowsSet).sort();

    // Initialize data structure
    for (const row of pivotTable.rows) {
      pivotTable.data[row] = {};
      for (const col of pivotTable.columns) {
        pivotTable.data[row][col] = { count: 0 };
      }
    }

    // Second pass: populate the data
    for (const item of data) {
      const rowValue = getFieldValue(item, rowField);
      const columnValue = getFieldValue(item, columnField);

      if (rowValue && columnValue && pivotTable.data[rowValue]?.[columnValue]) {
        // Increment count
        pivotTable.data[rowValue][columnValue].count += 1;

        // If the item has a mentions field, track that too
        if (item.mentions) {
          pivotTable.data[rowValue][columnValue].mentions = 
            (pivotTable.data[rowValue][columnValue].mentions || 0) + item.mentions;
        }
      }
    }

    return pivotTable;
  } catch (error) {
    console.error('Error creating pivot table:', error);
    return { rows: [], columns: [], data: {} };
  }
}

/**
 * Calculate the total for each row in a pivot table
 * @param pivotTable The pivot table to calculate totals for
 * @returns Array of objects with row and total
 */
export function calculateRowTotals(pivotTable: PivotTable): { row: string; total: number }[] {
  const totals: { row: string; total: number }[] = [];

  for (const row of pivotTable.rows) {
    let total = 0;
    for (const col of pivotTable.columns) {
      total += pivotTable.data[row]?.[col]?.count || 0;
    }
    totals.push({ row, total });
  }

  return totals;
}

/**
 * Sort a pivot table's rows based on row totals
 * @param pivotTable The pivot table to sort
 * @param sortOrder 'asc' or 'desc' (default: 'desc')
 * @returns A new pivot table with sorted rows
 */
export function sortPivotTableByRowTotals(
  pivotTable: PivotTable, 
  sortOrder: 'asc' | 'desc' = 'desc'
): PivotTable {
  const rowTotals = calculateRowTotals(pivotTable);
  
  // Sort row totals
  rowTotals.sort((a, b) => {
    const comparison = a.total - b.total;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Create new pivot table with sorted rows
  const sortedPivotTable: PivotTable = {
    rows: rowTotals.map(item => item.row),
    columns: [...pivotTable.columns],
    data: { ...pivotTable.data },
  };

  return sortedPivotTable;
}

/**
 * Convert pivot table to format suitable for Nivo heatmap component
 * @param pivotTable The pivot table to convert
 * @returns Data formatted for Nivo heatmap
 */
export function convertPivotTableToNivoHeatmap(pivotTable: PivotTable): any[] {
  const heatmapData: any[] = [];

  for (const row of pivotTable.rows) {
    const rowData: any = { id: row };
    
    for (const col of pivotTable.columns) {
      // You can use this for standard format
      rowData[col] = pivotTable.data[row]?.[col]?.count || 0;
      
      // Nivo also accepts data in "data" array format, when needed
      // If using the data array format, transform it separately
    }
    
    heatmapData.push(rowData);
  }

  return heatmapData;
}

/**
 * Convert pivot table to format suitable for scatterplot/bubble chart
 * @param pivotTable The pivot table to convert
 * @returns Data formatted for scatterplot with size values 
 */
export function convertPivotTableToScatterplot(pivotTable: PivotTable): any[] {
  const scatterData: { id: string; data: any[] }[] = [
    { id: 'symptoms', data: [] }
  ];

  for (const row of pivotTable.rows) {
    for (const col of pivotTable.columns) {
      const count = pivotTable.data[row]?.[col]?.count || 0;
      
      if (count > 0) {
        scatterData[0].data.push({
          x: col,
          y: row,
          value: count,
          size: count,
        });
      }
    }
  }

  return scatterData;
}

/**
 * Format dates consistently across the application
 * @param dateStr Date string in various formats
 * @returns Formatted date in MM/DD/YY format for consistent display
 */
export function formatDateForDisplay(dateStr: string): string {
  try {
    // Handle MM/DD/YY format (already formatted)
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
      return dateStr; // Already in our target format
    } 
    // Handle MM/DD/YYYY format
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/').map(Number);
      // Return in MM/DD/YY format
      return `${month}/${day}/${year.toString().substr(2)}`;
    }
    // Handle ISO format (YYYY-MM-DD) or ISO with timezone
    else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().substr(2);
      return `${month}/${day}/${year}`;
    }
    // Add more format handlers as needed
  } catch (e) {
    console.error('Error formatting date:', e);
  }
  
  // Return original if we couldn't format it
  return dateStr;
}

/**
 * Sorts dates chronologically and returns them in display format (MM/DD/YY)
 * @param dateStrings Array of date strings
 * @returns Sorted array of date strings in MM/DD/YY format
 */
export function sortDatesChronologically(dateStrings: string[]): string[] {
  try {
    // Helper function to convert any date format to Date object
    function parseAnyDate(dateStr: string): Date {
      // Try to parse as is first
      let date = new Date(dateStr);
      
      // If invalid, try MM/DD/YY format
      if (isNaN(date.getTime()) && /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('/').map(Number);
        date = new Date(2000 + year, month - 1, day);
      }
      
      // If still invalid, return a far-future date to sort bad dates last
      if (isNaN(date.getTime())) {
        console.warn(`Unable to parse date: ${dateStr}`);
        return new Date(9999, 11, 31);
      }
      
      return date;
    }
    
    // Sort dates by timestamp
    return [...dateStrings].sort((a, b) => {
      const dateA = parseAnyDate(a);
      const dateB = parseAnyDate(b);
      return dateA.getTime() - dateB.getTime();
    })
    // Convert back to MM/DD/YY format
    .map(dateStr => formatDateForDisplay(dateStr));
  } catch (e) {
    console.error('Error sorting dates:', e);
    return dateStrings; // Return original array in case of error
  }
}

/**
 * Deduplicate items by specified fields
 * @param items Array of items to deduplicate
 * @param keys Array of keys to use for deduplication comparison
 * @returns Deduplicated array of items
 */
export function deduplicateByKeys<T>(items: T[], keys: (keyof T)[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  
  for (const item of items) {
    // Create a compound key from the specified fields
    const compoundKey = keys.map(key => String(item[key])).join('|');
    
    if (!seen.has(compoundKey)) {
      seen.add(compoundKey);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Group items by a key and return an object with arrays of items for each key value
 * @param items Array of items to group
 * @param keyFn Function that returns the key to group by
 * @returns Object with groups of items
 */
export function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);
}

/**
 * Calculate frequencies and percentages from arrays of items
 * @param items Array of values to analyze
 * @returns Array of objects with value, count, and percentage
 */
export function calculateFrequencies<T>(items: T[]): { value: T; count: number; percentage: number }[] {
  const frequencies: Record<string, number> = {};
  const total = items.length;
  
  // Count occurrences of each value
  for (const item of items) {
    const key = String(item);
    frequencies[key] = (frequencies[key] || 0) + 1;
  }
  
  // Convert to array with percentages
  return Object.entries(frequencies).map(([key, count]) => {
    return {
      value: key as unknown as T,
      count,
      percentage: (count / total) * 100
    };
  })
  // Sort by count (descending)
  .sort((a, b) => b.count - a.count);
}

/**
 * Export data to CSV format
 * @param data Array of objects to export
 * @param fields Object mapping field names to display names
 * @returns CSV string
 */
export function exportToCSV<T>(data: T[], fields: Record<keyof T, string>): string {
  // Get headers from fields object
  const headers = Object.values(fields);
  const keys = Object.keys(fields) as (keyof T)[];
  
  // Build CSV string
  let csv = headers.join(',') + '\n';
  
  // Add rows
  for (const item of data) {
    const row = keys.map(key => {
      const value = item[key];
      // Wrap strings containing commas in quotes
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    });
    csv += row.join(',') + '\n';
  }
  
  return csv;
}

/**
 * Standard bubble sizing utility for consistent sizing across all visualizations
 * @param value The value to calculate size for (typically frequency or intensity)
 * @returns Bubble radius in pixels (5px to 23px)
 */
export function calculateBubbleSize(value: number): number {
  // Make sure value is a positive number
  const validValue = Math.max(0, Math.round(value));
  
  // Ensure strict ordering - larger values MUST always get larger bubbles
  // Using Math.floor to ensure we get correct integer sizing 
  if (validValue >= 10) return 23; // Value 10+: 23px radius
  if (validValue === 9) return 21; // Value 9: 21px radius  
  if (validValue === 8) return 19; // Value 8: 19px radius
  if (validValue === 7) return 17; // Value 7: 17px radius
  if (validValue === 6) return 15; // Value 6: 15px radius
  if (validValue === 5) return 13; // Value 5: 13px radius
  if (validValue === 4) return 11; // Value 4: 11px radius
  if (validValue === 3) return 9;  // Value 3: 9px radius
  if (validValue === 2) return 7;  // Value 2: 7px radius
  if (validValue === 1) return 5;  // Value 1: 5px radius
  return 0;                      // Value 0: No radius (shouldn't be visible)
}

/**
 * BubbleSize scale lookup for quick reference
 */
export const BUBBLE_SIZE_SCALE = {
  VALUE_1: 5,  // 5px radius
  VALUE_2: 7,  // 7px radius
  VALUE_3: 9,  // 9px radius
  VALUE_4: 11, // 11px radius
  VALUE_5: 13, // 13px radius
  VALUE_6: 15, // 15px radius
  VALUE_7: 17, // 17px radius
  VALUE_8: 19, // 19px radius
  VALUE_9: 21, // 21px radius
  VALUE_10_PLUS: 23 // 23px radius
};