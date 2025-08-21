import React, { useState, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define PieDataItem type
interface PieDataItem {
  id: string;
  value: number;
  label?: string;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface HrsnPieChartProps {
  data: PieDataItem[];
  title?: string;
  colorScheme?: string;
  showLegend?: boolean;
  showValues?: boolean;
  tooltipFormat?: (value: number) => string;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function HrsnPieChartV31({
  data,
  title = "",
  colorScheme = "blues" as any,
  showLegend = true,
  showValues = true,
  tooltipFormat,
  displayMode = "count",
  onDisplayModeChange
}: HrsnPieChartProps) {
  
  // Local display mode state if no external control is provided
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">(displayMode);
  
  // Use either external or local display mode
  const currentDisplayMode = onDisplayModeChange ? displayMode : localDisplayMode;
  
  // Create a formatted data version that works with the current display mode
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", label: "No data", value: 100 }];
    }
    
    return data.map(item => {
      // Ensure value is always a number
      const value = currentDisplayMode === "percentage" 
        ? (typeof item.percentage === 'number' ? item.percentage : 0)
        : (typeof item.value === 'number' ? item.value : 0);
        
      return {
        id: item.id,
        label: item.label || item.id,
        value: value
      };
    });
  }, [data, currentDisplayMode]);
  
  // Handle display mode toggle
  const handleDisplayModeToggle = () => {
    const newMode = currentDisplayMode === "count" ? "percentage" : "count";
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    } else {
      setLocalDisplayMode(newMode);
    }
  };
  
  // Custom label formatter to prevent NaN in animations
  const formatLabel = (d: any) => {
    // During animation, ensure we always return a valid string
    if (d === null || d === undefined || isNaN(d.value) || typeof d.value !== 'number') {
      return currentDisplayMode === "percentage" ? "0%" : "0";
    }
    
    const formattedValue = Math.max(0, Number(d.value)); // Ensure it's a positive number
    return currentDisplayMode === "percentage" ? `${formattedValue}%` : `${formattedValue}`;
  };

  return (
    <Card className="w-full h-full">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDisplayModeToggle}
            className="ml-auto"
          >
            {currentDisplayMode === "count" ? "Count" : "%"}
          </Button>
        </div>
        <div className="flex-1 p-2" style={{ minHeight: '300px' }}>
          <ResponsivePie
            data={formattedData}
            margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            colors={{ scheme: colorScheme as any }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor="#ffffff"
            enableArcLabels={showValues}
            arcLabel={formatLabel}
            animate={true}
            legends={showLegend ? [
              {
                anchor: 'right',
                direction: 'column',
                justify: false,
                translateX: 0,
                translateY: 0,
                itemsSpacing: 0,
                itemWidth: 100,
                itemHeight: 20,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 12,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemTextColor: '#000'
                    }
                  }
                ]
              }
            ] : []}
            tooltip={(props) => {
              const datum = props.datum || {};
              return (
                <div
                  style={{
                    padding: 12,
                    background: '#fff',
                    boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: datum.color }}>
                    {datum.id}: {tooltipFormat ? tooltipFormat(datum.value) : datum.value}
                    {currentDisplayMode === "percentage" ? "%" : ""}
                  </strong>
                </div>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}