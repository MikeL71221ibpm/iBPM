// Population Health Charts - Fixed Toggle Implementation - May 21, 2025
// Based on the diagnostic-category-chart pattern

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveBar } from '@nivo/bar';
import { Maximize2, Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Color theme presets for consistent visualization
const COLOR_THEMES = {
  // Default theme with vivid colors
  vivid: {
    name: "Vivid Colors",
    saturation: 90,
    lightness: 50,
    alpha: 1,
  },
  
  // High contrast theme for accessibility
  highContrast: {
    name: "High Contrast",
    saturation: 85,
    lightness: 45,
    alpha: 1,
  },
  
  // Dark theme for better visibility in dark mode
  dark: {
    name: "Dark Colors",
    saturation: 85,
    lightness: 35,
    alpha: 1,
  },
  
  // Light theme for better visibility in light mode
  light: {
    name: "Light Colors",
    saturation: 60,
    lightness: 65,
    alpha: 0.9,
  },
  
  // Viridis - colorblind friendly theme
  viridis: {
    name: "Viridis (Colorblind Friendly)",
    isCustomPalette: true,
    colors: [
      '#440154', '#482677', '#404688', '#33638D', '#27808E', 
      '#1FA187', '#49B97C', '#6ECE58', '#A2DB34', '#E0DD12', '#FDE725'
    ]
  }
};

interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
}

// Simple data item format for charts
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

export default function PopulationHealthCharts({ 
  data = {},
  isLoading = false,
  displayMode = "count",
  onDisplayModeChange
}: PopulationHealthChartsProps) {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<string>("vivid");
  const [colorSettings, setColorSettings] = useState<ColorThemePreset>(COLOR_THEMES.vivid);
  
  // Update color settings when theme changes
  useEffect(() => {
    setColorSettings(COLOR_THEMES[currentTheme] || COLOR_THEMES.vivid);
  }, [currentTheme]);
  
  // Handle display mode changes
  const handleDisplayModeChange = (mode: "count" | "percentage") => {
    console.log("Changing display mode to:", mode);
    
    // Notify parent component if callback provided
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    }
  };
  
  // Generate colors based on theme settings
  const getChartColors = () => {
    if (colorSettings.isCustomPalette && colorSettings.colors) {
      return colorSettings.colors;
    }
    return {
      scheme: 'nivo',
    };
  };
  
  // Return loading state if data not ready
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="w-full h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          {/* Chart Controls */}
          <div className="flex flex-wrap justify-between items-center gap-2 pb-2">
            <div className="text-lg font-bold">Population Health Data</div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Display Mode Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={displayMode === "count" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDisplayModeChange("count")}
                  className="h-7 px-2 text-xs"
                >
                  Count
                </Button>
                <Button
                  variant={displayMode === "percentage" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDisplayModeChange("percentage")}
                  className="h-7 px-2 text-xs font-semibold"
                >
                  %
                </Button>
              </div>

              {/* Chart Theme Selector */}
              <div className="flex items-center gap-1">
                <Palette className="h-3.5 w-3.5 opacity-70" />
                <Select
                  value={currentTheme}
                  onValueChange={setCurrentTheme}
                >
                  <SelectTrigger className="h-7 text-xs w-[150px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLOR_THEMES).map(([id, theme]) => (
                      <SelectItem key={id} value={id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Placeholder for charts - will be replaced with actual charts */}
          <div className="w-full h-[400px] flex items-center justify-center bg-muted/20 rounded-md">
            <div className="text-center p-6">
              <Maximize2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                Charts will render here based on <strong>{displayMode}</strong> mode
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}