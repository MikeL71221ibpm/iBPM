/**
 * Date Filter Utilities
 * 
 * This module contains functions for handling date filtering operations
 * in the HRSN Behavioral Health Analytics application
 */

/**
 * Formats a date string to YYYY-MM-DD format for server requests
 * @param dateStr Date string in any valid format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDateForServer = (dateStr: string): string => {
  try {
    // Handle MM/DD/YYYY format conversion
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      // If in MM/DD/YYYY format, convert to YYYY-MM-DD
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    // Otherwise use standard date parsing
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error('Invalid date format:', dateStr);
      return dateStr;
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr; // Return original if can't format
  }
};

/**
 * Formats a date string to MM/DD/YYYY format for display
 * @param dateStr Date string in any valid format
 * @returns Formatted date string in MM/DD/YYYY format
 */
export const formatDateForDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${
      date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return dateStr; // Return original if can't format
  }
};

/**
 * Filters records by date range
 * Makes a direct fetch request to the server API
 * 
 * @param startDate Start date string
 * @param endDate End date string
 * @returns Promise resolving to the filtered data or an error
 */
export const filterByDateRange = async (
  startDate: string, 
  endDate: string
): Promise<{
  success: boolean;
  noteCount?: number;
  patientCount?: number;
  error?: string;
}> => {
  try {
    if (!startDate || !endDate) {
      return {
        success: false,
        error: 'Start date and end date are required'
      };
    }
    
    // Call the API to filter data
    const response = await fetch('/api/filter-by-date', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        startDate: formatDateForServer(startDate), 
        endDate: formatDateForServer(endDate) 
      }),
    });
    
    // Parse the response
    const data = await response.json();
    console.log('Date filter API response:', data);
    
    if (response.ok && data) {
      return {
        success: true,
        noteCount: data.noteCount || 0,
        patientCount: data.patientCount || 0,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to filter records by date range'
      };
    }
  } catch (error) {
    console.error('Error filtering by date:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while filtering by date'
    };
  }
};