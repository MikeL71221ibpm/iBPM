// STANDARDIZED SCATTER VISUALIZATION COMPONENT
// This is the ONLY ScatterPlot component that should be used across the platform
// Replaces all custom implementations with consistent, centralized approach

import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { CHART_THEMES, getChartColors, calculateStandardBubbleSize, getBubbleColorByIntensity } from '@/lib/chart-theme-system';
import { useToast } from '@/hooks/use-toast';

interface ScatterDataPoint {
  x: string;
  y: string;
  size: number;
  frequency: number;
  [key: string]: any;
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

interface StandardizedScatterVisualizationProps {
  data: ScatterGroupData[];
  title: string;
  isLoading?: boolean;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  onBubbleClick?: (data: ScatterDataPoint) => void;
  enableTooltips?: boolean;
  defaultTheme?: string;
  showThemeSelector?: boolean;
}

export default function StandardizedScatterVisualization({
  data,
  title,
  isLoading = false,
  height = 400,
  margin = { top: 20, right: 120, bottom: 60, left: 250 },
  onBubbleClick,
  enableTooltips = true,
  defaultTheme = 'nivo',
  showThemeSelector = true
}: StandardizedScatterVisualizationProps) {
  const [selectedTheme, setSelectedTheme] = useState(defaultTheme);
  const { toast } = useToast();

  // Calculate max values for consistent bubble sizing
  const maxValue = Math.max(...data.flatMap(series => series.data.map(point => point.size)));
  const maxFrequency = Math.max(...data.flatMap(series => series.data.map(point => point.frequency)));

  // Process data with standardized coloring and sizing
  const processedData = data.map(series => ({
    ...series,
    data: series.data.map(point => ({
      ...point,
      // Standardized bubble size
      size: calculateStandardBubbleSize(point.frequency, maxFrequency),
      // Standardized color using theme
      color: getBubbleColorByIntensity(point.size, maxValue, getChartColors(selectedTheme))
    }))
  }));

  // Handle bubble clicks
  const handleNodeClick = useCallback((node: any) => {
    if (onBubbleClick) {
      onBubbleClick(node.data);
    }
    
    if (enableTooltips) {
      toast({
        title: node.data.y,
        description: `Date: ${node.data.x}, Value: ${node.data.size}, Frequency: ${node.data.frequency}`,
        duration: 3000,
      });
    }
  }, [onBubbleClick, enableTooltips, toast]);

  // Custom tooltip component
  const CustomTooltip = ({ node }: any) => (
    <div className="bg-white p-3 border rounded-lg shadow-lg">
      <div className="font-semibold">{node.data.y}</div>
      <div className="text-sm text-gray-600">
        <div>Date: {node.data.x}</div>
        <div>Value: {node.data.size}</div>
        <div>Frequency: {node.data.frequency}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {showThemeSelector && (
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_THEMES.map(theme => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveScatterPlot
            data={processedData}
            margin={margin}
            xScale={{ type: 'point' }}
            yScale={{ type: 'point' }}
            colors={getChartColors(selectedTheme)}
            nodeSize={(node: any) => node.data.size}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 15,
              tickRotation: 45,
              legend: 'Date',
              legendPosition: 'middle',
              legendOffset: 46
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Indicators',
              legendPosition: 'middle',
              legendOffset: -200
            }}
            onClick={handleNodeClick}
            tooltip={enableTooltips ? CustomTooltip : () => null}
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 130,
                translateY: 0,
                itemWidth: 100,
                itemHeight: 12,
                itemsSpacing: 5,
                itemDirection: 'left-to-right',
                symbolSize: 12,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemOpacity: 1
                    }
                  }
                ]
              }
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}