// CENTRALIZED CHART THEME SYSTEM
// This is the ONLY place where chart colors and themes are defined
// All Nivo components across the platform must use this system

export interface ChartTheme {
  id: string;
  name: string;
  colors: string[];
  description: string;
}

// Standardized color themes using Nivo's built-in color schemes
export const CHART_THEMES: ChartTheme[] = [
  {
    id: 'nivo',
    name: 'Nivo Default',
    colors: ['#e8c1a0', '#f47560', '#f1e15b', '#e8a838', '#61cdbb', '#97e3d5'],
    description: 'Nivo\'s default color palette - professional and balanced'
  },
  {
    id: 'category10',
    name: 'Category 10',
    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    description: 'D3 Category 10 - widely used, colorblind-friendly'
  },
  {
    id: 'accent',
    name: 'Accent',
    colors: ['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0', '#f0027f', '#bf5b17', '#666666'],
    description: 'Accent colors - vibrant and distinct'
  },
  {
    id: 'dark2',
    name: 'Dark Theme',
    colors: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
    description: 'Dark theme - professional with high contrast'
  },
  {
    id: 'paired',
    name: 'Paired',
    colors: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00'],
    description: 'Paired colors - great for comparing related data'
  },
  {
    id: 'spectral',
    name: 'Spectral',
    colors: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
    description: 'Spectral - beautiful gradient for intensity visualization'
  }
];

// Default theme for all charts
export const DEFAULT_CHART_THEME = CHART_THEMES[0]; // Nivo default

// Get theme by ID
export const getChartTheme = (themeId: string): ChartTheme => {
  return CHART_THEMES.find(theme => theme.id === themeId) || DEFAULT_CHART_THEME;
};

// Get color array for Nivo components
export const getChartColors = (themeId: string): string[] => {
  return getChartTheme(themeId).colors;
};

// Bubble size calculation (standardized across all charts)
export const calculateStandardBubbleSize = (value: number, maxValue: number, minSize: number = 8, maxSize: number = 22): number => {
  if (maxValue === 0) return minSize;
  const normalizedValue = value / maxValue;
  return Math.max(minSize, Math.round(minSize + (maxSize - minSize) * normalizedValue));
};

// Color intensity mapping for bubble charts (replaces custom color schemes)
export const getBubbleColorByIntensity = (value: number, maxValue: number, colors: string[]): string => {
  if (maxValue === 0) return colors[0];
  const normalizedValue = value / maxValue;
  const colorIndex = Math.min(Math.floor(normalizedValue * colors.length), colors.length - 1);
  return colors[colorIndex];
};