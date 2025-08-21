// Fixed Chart Component - May 21, 2025
// This component directly fixes the percentage display issues in the existing population health charts

import React, { useState, useCallback, useEffect } from "react";
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Percent, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useChartTheme } from "@/context/ChartThemeContext";

interface FixedChartComponentProps {
  data?: any[];
  title: string;
  description?: string;
  height?: number;
  showPercentage?: boolean;
}

export default function FixedChartComponent({
  data = [],
  title,
  description,
  height = 300,
  showPercentage = false
}: FixedChartComponentProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(showPercentage ? 'percentage' : 'count');
  const [expanded, setExpanded] = useState(false);
  const { currentTheme, colorSettings, theme } = useChartTheme();
  
  // Process data for either count or percentage display
  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    const totalCount = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map(item => ({
      ...item,
      id: item.id || 'Unknown',
      // Store original count value
      originalValue: item.value || 0,
      // Calculate percentage
      percentage: totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0,
      // The displayed value depends on the mode
      value: displayMode === 'percentage' 
        ? (totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0)
        : (item.value || 0)
    }));
  }, [data, displayMode]);

  // Toggle between count and percentage displays
  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => prev === 'count' ? 'percentage' : 'count');
  }, []);

  // Format labels and values
  const formatValue = (value: number) => {
    if (displayMode === 'percentage') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center p-6 text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = (containerHeight: number | string, isExpanded: boolean = false) => (
    <div style={{ height: containerHeight }}>
      <ResponsiveBar
        data={chartData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={(bar) => {
          const index = chartData.findIndex(d => d.id === bar.id);
          if ('isCustomPalette' in colorSettings && colorSettings.isCustomPalette && 'colors' in colorSettings) {
            return colorSettings.colors[index % colorSettings.colors.length];
          } else if ('saturation' in colorSettings && 'lightness' in colorSettings) {
            const hue = (index * 137.5) % 360; // Golden ratio approach for color distribution
            return `hsl(${hue}, ${colorSettings.saturation}%, ${colorSettings.lightness}%)`;
          }
          // Fallback if theme is not properly defined
          return `hsl(${index * 30}, 70%, 60%)`;
        }}
        theme={theme}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 45,
          legendPosition: 'middle',
          legendOffset: 50
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        label={d => formatValue(d.value)}
        labelSkipWidth={20}
        labelSkipHeight={16}
        labelTextColor="#ffffff"
        animate={true}
        motionConfig="gentle"
        tooltip={({ id, value, data }) => (
          <div style={{
            background: 'white',
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: '3px'
          }}>
            <div><strong>{id}</strong></div>
            <div>
              {displayMode === 'percentage' 
                ? `${value}% (${data.originalValue} of ${chartData.reduce((sum, item) => sum + item.originalValue, 0)})` 
                : `${value} (${data.percentage}% of total)`}
            </div>
          </div>
        )}
      />
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleDisplayMode}
            >
              {displayMode === 'count' 
                ? <Percent className="h-4 w-4 mr-1" /> 
                : <Hash className="h-4 w-4 mr-1" />}
              {displayMode === 'count' ? 'Show %' : 'Show Count'}
            </Button>
            
            <Dialog open={expanded} onOpenChange={setExpanded}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleDisplayMode}
                    >
                      {displayMode === 'count' 
                        ? <Percent className="h-4 w-4 mr-1" /> 
                        : <Hash className="h-4 w-4 mr-1" />}
                      {displayMode === 'count' ? 'Show %' : 'Show Count'}
                    </Button>
                  </div>
                  {renderChart(500, true)}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {renderChart(height)}
      </CardContent>
    </Card>
  );
}