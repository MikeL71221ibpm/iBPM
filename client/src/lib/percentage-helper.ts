/**
 * Helper functions for calculating accurate percentages
 * for population health charts
 */

/**
 * Calculates percentages for a data set based on the total of all values
 * @param data Array of data items with a value property
 * @returns The same array with percentage property added to each item
 */
export function calculateChartPercentages<T extends { value?: number }>(data: T[]): (T & { percentage: number })[] {
  // Calculate the total of all values
  const chartTotal = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Calculate percentage for each item based on chart total
  return data.map(item => ({
    ...item,
    percentage: chartTotal > 0 ? Math.round(((item.value || 0) / chartTotal) * 100) : 0
  }));
}

/**
 * Helper to format a percentage value for display
 * @param value The percentage value to format
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | undefined): string {
  if (value === undefined || isNaN(value)) {
    return "0%";
  }
  return `${value}%`;
}