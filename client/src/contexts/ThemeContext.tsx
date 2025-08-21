import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the context shape
type ThemeContextType = {
  globalTheme: string;
  setGlobalTheme: (theme: string) => void;
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  globalTheme: 'vivid',
  setGlobalTheme: () => {}
});

// Provider component
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage or default to 'vivid'
  const [globalTheme, setGlobalTheme] = useState<string>(
    localStorage.getItem('globalChartTheme') || 'vivid'
  );

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('globalChartTheme', globalTheme);
  }, [globalTheme]);

  return (
    <ThemeContext.Provider value={{ globalTheme, setGlobalTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = () => useContext(ThemeContext);