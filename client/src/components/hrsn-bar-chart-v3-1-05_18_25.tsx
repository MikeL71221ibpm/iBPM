import React, { useState, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define BarDataItem type
interface BarDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface HrsnBarChartProps {
  data: BarDataItem[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  colorScheme?: string;
  groupMode?: "grouped" | "stacked";
  keys?: string[];
  indexBy?: string;
  showValues?: boolean;
  showGridLines?: boolean;
  tooltipFormat?: (value: number) => string;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function HrsnBarChartV31({
  data,
  xAxisLabel = "",
  yAxisLabel = "",
  title = "",
  colorScheme = "blues" as any,
  groupMode = "grouped",
  keys = undefined,
  indexBy = "id",
  showValues = true,
  showGridLines = true,
  tooltipFormat,
  displayMode = "count",
  onDisplayModeChange
}: HrsnBarChartProps) {
  
  // Local display mode state if no external control is provided
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">(displayMode);
  
  // Use either external or local display mode
  const currentDisplayMode = onDisplayModeChange ? displayMode : localDisplayMode;
  
  // Create a formatted data version that works with the current display mode
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", value: 0, percentage: 0 }];
    }
    
    return data.map(item => {
      // Ensure value is always a number
      const value = currentDisplayMode === "percentage" 
        ? (typeof item.percentage === 'number' ? item.percentage : 0)
        : (typeof item.value === 'number' ? item.value : 0);
        
      return {
        ...item,
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
          <ResponsiveBar
            data={formattedData}
            keys={keys || ['value']}
            indexBy={indexBy}
            margin={{ top: 30, right: 50, bottom: 60, left: 70 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            groupMode={groupMode}
            colors={{ scheme: colorScheme as any }}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 1.6]]
            }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: xAxisLabel,
              legendPosition: 'middle',
              legendOffset: 45
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: yAxisLabel,
              legendPosition: 'middle',
              legendOffset: -50,
              format: (value) => Math.round(value).toString()
            }}
            enableLabel={showValues}
            label={formatLabel}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={'#ffffff'}
            animate={true}
            legends={[]}
            tooltip={(props) => {
              const data = props.data || {};
              // Ensure we have valid values to prevent NaN
              const safeValue = !isNaN(data.value) ? data.value : 0;
              const safeId = data.id || 'Unknown';
              
              return (
                <div
                  style={{
                    padding: 12,
                    background: '#fff',
                    boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: props.color }}>
                    {safeId}: {tooltipFormat ? tooltipFormat(safeValue) : safeValue}
                    {currentDisplayMode === "percentage" ? "%" : ""}
                  </strong>
                </div>
              );
            }}
            theme={{
              tooltip: {
                container: {
                  fontSize: '12px',
                },
              },
              grid: {
                line: {
                  stroke: showGridLines ? '#ddd' : 'transparent',
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}