import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';

// Define the color themes
export const COLOR_THEMES = {
  // Vivid - high-contrast, bright colors
  vivid: {
    name: "Vivid Colors",
    saturation: 100,
    lightness: 55,
    alpha: 1,
  },
  
  // Pastel - soft, light colors
  pastel: {
    name: "Pastel Colors",
    saturation: 60, 
    lightness: 80,
    alpha: 1,
  },
  
  // Dark - deep, rich colors
  dark: {
    name: "Dark Colors",
    saturation: 80,
    lightness: 35,
    alpha: 1,
  },
  
  // Muted - subdued, professional colors
  muted: {
    name: "Muted Colors", 
    saturation: 40,
    lightness: 60,
    alpha: 1,
  },
  
  // Viridis - colorblind friendly theme based on the matplotlib viridis palette
  // Enhanced with more steps for better differentiation
  viridis: {
    name: "Viridis (Colorblind Friendly)",
    isCustomPalette: true,
    colors: [
      '#440154', // Dark purple
      '#482677', // Deep purple
      '#404688', // Deep blue
      '#33638D', // Medium blue
      '#27808E', // Teal
      '#1FA187', // Blue-green
      '#49B97C', // Green
      '#6ECE58', // Light green
      '#A2DB34', // Yellow-green
      '#E0DD12', // Yellow
      '#FDE725'  // Bright yellow
    ]
  }
};

export type ColorThemeName = keyof typeof COLOR_THEMES;

// Define two types of color themes: HSL-based and custom palette
export interface HSLColorTheme {
  name: string;
  saturation: number;
  lightness: number;
  alpha: number;
}

export interface CustomPaletteTheme {
  name: string;
  isCustomPalette: boolean;
  colors: string[];
}

// Union type for all possible theme types
export type ColorThemePreset = HSLColorTheme | CustomPaletteTheme;

interface ChartThemeContextType {
  currentTheme: ColorThemeName;
  setCurrentTheme: (theme: ColorThemeName) => void;
  colorSettings: ColorThemePreset;
  displayMode: 'light' | 'dark' | 'auto';
  setDisplayMode: (mode: 'light' | 'dark' | 'auto') => void;
  theme: any; // Nivo theme object
  getColorForIndex: (index: number) => string; // Get color based on index
}

// Generate a Nivo theme object based on the current settings
const generateNivoTheme = (displayMode: 'light' | 'dark' | 'auto') => {
  const isDark = displayMode === 'dark' || 
                (displayMode === 'auto' && 
                 typeof window !== 'undefined' && 
                 window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return {
    background: 'transparent',
    textColor: isDark ? '#e1e1e1' : '#333333',
    fontSize: 12,
    axis: {
      domain: {
        line: {
          stroke: isDark ? '#555555' : '#dddddd',
          strokeWidth: 1
        }
      },
      ticks: {
        line: {
          stroke: isDark ? '#555555' : '#dddddd',
          strokeWidth: 1
        }
      }
    },
    grid: {
      line: {
        stroke: isDark ? '#444444' : '#eeeeee',
        strokeWidth: 1
      }
    },
    legends: {
      text: {
        fontSize: 11
      }
    },
    tooltip: {
      container: {
        background: isDark ? '#333333' : '#ffffff',
        color: isDark ? '#e1e1e1' : '#333333',
        fontSize: 12,
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }
    }
  };
};

// Generate a color for a specific index based on the current theme
const generateColorForIndex = (colorSettings: ColorThemePreset, index: number) => {
  // If the theme has a custom palette, use it
  if (colorSettings.isCustomPalette && colorSettings.colors) {
    return colorSettings.colors[index % colorSettings.colors.length];
  }
  
  // Otherwise generate a color using HSL
  const hue = (index * 137.5) % 360; // Use a golden ratio approach to spread colors
  return `hsl(${hue}, ${colorSettings.saturation}%, ${colorSettings.lightness}%)`;
};

const defaultContext: ChartThemeContextType = {
  currentTheme: 'muted',
  setCurrentTheme: () => {},
  colorSettings: COLOR_THEMES.muted,
  displayMode: 'light',
  setDisplayMode: () => {},
  theme: generateNivoTheme('light'),
  getColorForIndex: (index) => generateColorForIndex(COLOR_THEMES.muted, index)
};

const ChartThemeContext = createContext<ChartThemeContextType>(defaultContext);

export const ChartThemeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Load saved theme and display mode from localStorage or use defaults
  const savedTheme = typeof window !== 'undefined' 
    ? (localStorage.getItem('chartTheme') as ColorThemeName || 'muted')
    : 'muted';
  
  const savedDisplayMode = typeof window !== 'undefined'
    ? (localStorage.getItem('displayMode') as 'light' | 'dark' | 'auto' || 'light')
    : 'light';
  
  const [currentTheme, setCurrentTheme] = useState<ColorThemeName>(savedTheme);
  const [displayMode, setDisplayMode] = useState<'light' | 'dark' | 'auto'>(savedDisplayMode);
  const [colorSettings, setColorSettings] = useState<ColorThemePreset>(COLOR_THEMES[savedTheme] || COLOR_THEMES.vivid);
  const [theme, setTheme] = useState(generateNivoTheme(savedDisplayMode));

  // Update color settings when theme changes
  useEffect(() => {
    try {
      const newSettings = COLOR_THEMES[currentTheme] || COLOR_THEMES.vivid;
      setColorSettings(newSettings);
      console.log("Theme changed to:", currentTheme, newSettings);
      
      // Save current theme to localStorage
      localStorage.setItem('chartTheme', currentTheme);
    } catch (err) {
      console.error("Error updating theme settings:", err);
      setCurrentTheme('vivid');
      setColorSettings(COLOR_THEMES.vivid);
    }
  }, [currentTheme]);

  // Save display mode changes to localStorage and update theme
  useEffect(() => {
    try {
      localStorage.setItem('displayMode', displayMode);
      console.log("Display mode changed to:", displayMode);
      setTheme(generateNivoTheme(displayMode));
    } catch (err) {
      console.error("Error saving display mode:", err);
    }
  }, [displayMode]);

  // Create a memoized getColorForIndex function
  const getColorForIndex = useCallback((index: number) => {
    return generateColorForIndex(colorSettings, index);
  }, [colorSettings]);

  return (
    <ChartThemeContext.Provider 
      value={{ 
        currentTheme, 
        setCurrentTheme, 
        colorSettings,
        displayMode,
        setDisplayMode,
        theme,
        getColorForIndex
      }}
    >
      {children}
    </ChartThemeContext.Provider>
  );
};

export const useChartTheme = () => useContext(ChartThemeContext);