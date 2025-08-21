// Theme hook - May 13, 2025
// Simple hook to get the current theme

import { useState, useEffect, createContext, useContext } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always default to light theme
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Force light theme and clear any stored theme
    localStorage.setItem('theme', 'light');
    document.documentElement.className = 'light';
    
    // Remove any dark mode classes that might be on the HTML element
    document.documentElement.classList.remove('dark');
    
    // Force a background color refresh
    document.body.style.backgroundColor = '';
    document.documentElement.style.backgroundColor = '';
  }, []);

  const setThemeAndStore = (newTheme: Theme) => {
    // For now, we're always using light theme
    const themeToUse = 'light';
    setTheme(themeToUse);
    localStorage.setItem('theme', themeToUse);
    document.documentElement.className = themeToUse;
    
    // Remove any dark mode classes
    document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    // Force light theme
    document.documentElement.className = 'light';
    document.documentElement.classList.remove('dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeAndStore }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Default values if used outside provider
    return {
      theme: 'light' as Theme,
      setTheme: () => console.warn('useTheme() used outside of ThemeProvider')
    };
  }
  return context;
}