// Color schemes for data visualization
// Used by heatmaps, bubble charts, and other visualizations

export const colorSchemes = {
  vivid: {
    name: "Vivid",
    colors: [
      "#fde725", // Yellow
      "#a0da39", // Yellow-Green
      "#4ac16d", // Green
      "#1fa187", // Teal
      "#277f8e", // Teal-Blue
      "#365c8d", // Blue
      "#46327e", // Indigo
      "#440154"  // Purple
    ]
  },
  pastel: {
    name: "Pastel",
    colors: [
      "#fbb4ae", // Salmon
      "#b3cde3", // Light Blue
      "#ccebc5", // Light Green
      "#decbe4", // Light Purple
      "#fed9a6", // Light Orange
      "#ffffcc", // Light Yellow
      "#e5d8bd", // Beige
      "#fddaec"  // Light Pink
    ]
  },
  muted: {
    name: "Muted",
    colors: [
      "#4e79a7", // Blue
      "#f28e2c", // Orange
      "#e15759", // Red
      "#76b7b2", // Teal
      "#59a14f", // Green
      "#edc949", // Yellow
      "#af7aa1", // Purple
      "#ff9da7"  // Pink
    ]
  },
  dark: {
    name: "Dark",
    colors: [
      "#1b1b1b", // Almost Black
      "#242424", // Very Dark Gray
      "#333333", // Dark Gray
      "#444444", // Medium Dark Gray
      "#666666", // Gray
      "#888888", // Medium Gray
      "#aaaaaa", // Light Gray
      "#cccccc"  // Very Light Gray
    ]
  },
  light: {
    name: "Light",
    colors: [
      "#f7fbff", // Very Light Blue
      "#e3eef9", // Light Blue
      "#cfe1f2", // Pale Blue
      "#b5d4e9", // Sky Blue
      "#93c4df", // Medium Light Blue
      "#6baed6", // Medium Blue
      "#4292c6", // Saturated Blue
      "#2171b5"  // Deep Blue
    ]
  },
  viridis: [
    "#440154", // Dark Purple
    "#482878", // Purple
    "#3e4989", // Indigo
    "#31688e", // Blue
    "#26828e", // Teal
    "#1f9e89", // Green-Teal
    "#35b779", // Green
    "#6ece58", // Light Green
    "#b5de2b", // Yellow-Green
    "#fde725"  // Yellow
  ],
  plasma: [
    "#0d0887", // Deep Blue
    "#41049d", // Purple
    "#6a00a8", // Violet
    "#8f0da4", // Magenta
    "#b12a90", // Pink
    "#cc4678", // Rose
    "#e16462", // Salmon
    "#f1834b", // Orange
    "#fca636", // Yellow-Orange
    "#fcce25"  // Yellow
  ],
  inferno: [
    "#000004", // Black
    "#1b0c41", // Dark Purple
    "#4a0c6b", // Purple
    "#781c6d", // Magenta
    "#a52c60", // Pink
    "#cf4446", // Red
    "#ed6925", // Orange
    "#fb9b06", // Yellow-Orange
    "#f7d13d", // Yellow
    "#fcffa4"  // Light Yellow
  ],
  spectral: [
    "#9e0142", // Dark Red
    "#d53e4f", // Red
    "#f46d43", // Orange
    "#fdae61", // Light Orange
    "#fee08b", // Light Yellow
    "#e6f598", // Light Green
    "#abdda4", // Green
    "#66c2a5", // Teal
    "#3288bd", // Blue
    "#5e4fa2"  // Purple
  ],
  blues: [
    "#f7fbff", // Lightest Blue
    "#deebf7", // Very Light Blue
    "#c6dbef", // Light Blue
    "#9ecae1", // Medium Light Blue
    "#6baed6", // Medium Blue
    "#4292c6", // Medium Dark Blue
    "#2171b5", // Dark Blue
    "#08519c", // Very Dark Blue
    "#08306b"  // Darkest Blue
  ]
};

// Default color schemes for different visualization types
export const defaultColorSchemes = {
  heatmap: "vivid",
  scatterplot: "vivid",
  barChart: "vivid",
  pieChart: "vivid",
  bubbleChart: "vivid",
  circlePacking: "vivid",
  treemap: "vivid"
};

export const getColorFromScheme = (value: number, maxValue: number, isEmpty: boolean, colorScheme = "vivid") => {
  if (isEmpty) return "#f8f9fa"; // Very light gray background for empty cells
  
  const normalizedValue = Math.min(Math.max(value / maxValue, 0), 1);
  const schemeColors = colorSchemes[colorScheme] || colorSchemes.vivid;
  
  // Handle both array and object formats of color schemes
  if (Array.isArray(schemeColors)) {
    const colorIndex = Math.floor(normalizedValue * (schemeColors.length - 1));
    return schemeColors[colorIndex];
  } else if (schemeColors.colors) {
    const colorIndex = Math.floor(normalizedValue * (schemeColors.colors.length - 1));
    return schemeColors.colors[colorIndex];
  }
  
  // Default discrete color scale for blues
  if (value <= 5) return "#d1e5f0"; // Very light blue
  if (value <= 10) return "#92c5de"; // Light blue
  if (value <= 15) return "#4393c3"; // Medium blue
  if (value <= 20) return "#2166ac"; // Darker blue
  return "#053061"; // Darkest blue
};