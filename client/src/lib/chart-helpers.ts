// Chart Helpers - May 21, 2025
// Standardized utility functions for chart components

/**
 * Generate an HSL color based on hue, saturation, and lightness
 */
export function generateHslColor(
  hue: number, 
  saturation: number = 70, 
  lightness: number = 55, 
  alpha: number = 1
): string {
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}

/**
 * Generate a set of hues evenly distributed around the color wheel
 */
export function generateHueArray(
  length: number, 
  startHue: number = 0, 
  endHue: number = 360
): number[] {
  if (length <= 1) return [startHue];
  
  const step = (endHue - startHue) / length;
  return Array.from({ length }, (_, i) => startHue + (i * step));
}

/**
 * Get color based on a named theme
 */
export function getThemeColor(
  index: number, 
  total: number, 
  theme: string = 'spectral'
): string {
  // Default to spectral if theme is invalid
  const themeName = theme?.toLowerCase() || 'spectral';
  
  // Custom color palettes
  const palettes: Record<string, string[]> = {
    blue: ['#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'],
    green: ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'],
    purple: ['#4a148c', '#6a1b9a', '#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7'],
    red: ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#f44336', '#ef5350', '#e57373', '#ef9a9a', '#ffcdd2'],
    orange: ['#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ff9800', '#ffa726', '#ffb74d', '#ffcc80', '#ffe0b2'],
    neutral: ['#212121', '#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd', '#e0e0e0', '#eeeeee', '#f5f5f5'],
    spectral: [] // This will be generated dynamically
  };
  
  // If using a predefined palette
  if (palettes[themeName] && palettes[themeName].length > 0) {
    // Pick evenly distributed colors from the palette
    const colorIndex = Math.min(Math.floor(index * palettes[themeName].length / total), palettes[themeName].length - 1);
    return palettes[themeName][colorIndex];
  }
  
  // Use spectral (color wheel) approach for other themes
  const hue = (index * 360) / Math.max(total, 1);
  
  // Different theme variations based on HSL parameters
  switch (themeName) {
    case 'pastel':
      return generateHslColor(hue, 70, 80);
    case 'dark':
      return generateHslColor(hue, 80, 30);
    case 'vibrant':
      return generateHslColor(hue, 100, 50);
    case 'muted':
      return generateHslColor(hue, 40, 60);
    case 'neon':
      return generateHslColor(hue, 100, 70);
    default: // spectral
      return generateHslColor(hue, 70, 55);
  }
}

// Standard dimensions for charts
export const CHART_DIMENSIONS = {
  // For main interactive charts on data pages
  standard: {
    height: '400px',
    className: 'w-full h-[400px] relative'
  },
  
  // For dialog/modal view, full-screen and maximized for detail
  dialog: {
    height: '550px',
    className: 'w-full h-[550px] relative'
  },
  
  // For compact versions in dashboard cards
  compact: {
    height: '250px',
    className: 'w-full h-[250px] relative'
  },
  
  // For side-by-side comparisons
  split: {
    height: '300px',
    className: 'w-full h-[300px] relative'
  }
};

/**
 * Format data values based on display mode
 */
export function formatChartValue(value: number, displayMode: 'count' | 'percentage' = 'count'): string {
  if (displayMode === 'percentage') {
    return `${Math.round(value)}%`;
  }
  return value.toLocaleString();
}

/**
 * Format date for display
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
}

/**
 * Calculate percentage safely (avoiding division by zero)
 */
export function safePercentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}