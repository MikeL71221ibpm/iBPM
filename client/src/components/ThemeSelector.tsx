import React from 'react';
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { 
  useChartTheme, 
  COLOR_THEMES, 
  type ColorThemeName,
  type HSLColorTheme,
  type CustomPaletteTheme
} from '@/context/ChartThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Generate a preview of colors from HSL values
const getColorPreview = (saturation: number, lightness: number, count = 8) => {
  const hueStep = 360 / count;
  return Array.from({ length: count }, (_, i) => 
    `hsl(${Math.round(i * hueStep)}, ${saturation}%, ${lightness}%)`
  );
};

// Get a preview from a custom palette
const getCustomPalettePreview = (colors: string[] = []) => {
  // Return the colors or fill with placeholder if fewer than 8
  return colors.slice(0, 8);
};

export function ThemeSelector() {
  const { 
    currentTheme, 
    setCurrentTheme
  } = useChartTheme();

  // Show a color preview of the current theme
  const currentThemeData = COLOR_THEMES[currentTheme] || COLOR_THEMES.vivid;
  const currentThemeColors = (() => {
    if (currentThemeData && 'isCustomPalette' in currentThemeData && currentThemeData.isCustomPalette) {
      const customTheme = currentThemeData as CustomPaletteTheme;
      return getCustomPalettePreview(customTheme.colors);
    } else {
      const hslTheme = currentThemeData as HSLColorTheme;
      return getColorPreview(hslTheme.saturation, hslTheme.lightness);
    }
  })();
  
  // Get the display name of the current theme
  const currentThemeName = currentThemeData.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1 flex items-center"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden md:inline">{currentThemeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1">
        <DropdownMenuRadioGroup 
          value={currentTheme} 
          onValueChange={(value) => setCurrentTheme(value as ColorThemeName)}
        >
          {Object.entries(COLOR_THEMES).map(([key, theme]) => {
            const previewColors = (() => {
              if (theme && 'isCustomPalette' in theme && theme.isCustomPalette) {
                const customTheme = theme as CustomPaletteTheme;
                return getCustomPalettePreview(customTheme.colors);
              } else {
                const hslTheme = theme as HSLColorTheme;
                return getColorPreview(hslTheme.saturation, hslTheme.lightness);
              }
            })();
            
            return (
              <DropdownMenuRadioItem 
                key={key} 
                value={key}
                className="flex flex-col p-1 gap-1"
              >
                <span className="text-sm">{theme.name}</span>
                <div className="flex flex-wrap gap-0.5">
                  {previewColors.map((color, index) => (
                    <div 
                      key={index}
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSelector;