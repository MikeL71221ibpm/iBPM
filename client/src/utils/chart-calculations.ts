/**
 * Chart Calculation Utilities
 * Client-side percentage calculations for all chart types
 */

export interface ChartDataItem {
  id: string;
  label?: string;
  value: number;
  percentage?: number;
  formattedValue?: string;
  rawCount?: number;
  total?: number;
  [key: string]: any; // For Nivo chart compatibility
}

/**
 * Calculate percentages for chart data array
 * This ensures consistent percentage calculations across all charts
 */
export const calculatePercentages = (dataArray: ChartDataItem[]): ChartDataItem[] => {
  if (dataArray.length === 0) return [];
  
  const total = dataArray.reduce((sum, item) => sum + (item.value || 0), 0);
  if (total === 0) return dataArray;
  
  return dataArray.map(item => ({
    ...item,
    percentage: Math.round(((item.value || 0) / total) * 100)
  }));
};

/**
 * Process chart data for display mode (count vs percentage)
 * Uses correct total for percentage calculation
 */
export const processChartData = (
  rawData: any[], 
  displayMode: 'count' | 'percentage',
  totalRecords?: number
): ChartDataItem[] => {
  if (!rawData || rawData.length === 0) return [];

  // Convert raw server data to standard format
  const standardData = rawData.map(item => {
    const count = parseInt(item.count) || parseInt(item.value) || 0;
    return {
      id: item.id || item.label || 'Unknown',
      label: item.label || item.id || 'Unknown', 
      rawCount: count
    };
  });
  
  // Calculate correct total for percentages
  const total = totalRecords || standardData.reduce((sum, item) => sum + item.rawCount, 0);
  
  // Process data based on display mode
  return standardData.map(item => {
    const percentage = total > 0 ? Math.round((item.rawCount / total) * 100) : 0;
    
    if (displayMode === 'percentage') {
      return {
        id: item.id,
        label: item.label,
        value: percentage,
        percentage: percentage,
        formattedValue: `${percentage}%`,
        rawCount: item.rawCount,
        total: total
      };
    } else {
      return {
        id: item.id,
        label: item.label,
        value: item.rawCount,
        percentage: percentage,
        formattedValue: item.rawCount.toString(),
        rawCount: item.rawCount,
        total: total
      };
    }
  }).sort((a, b) => (b.value || 0) - (a.value || 0));
};