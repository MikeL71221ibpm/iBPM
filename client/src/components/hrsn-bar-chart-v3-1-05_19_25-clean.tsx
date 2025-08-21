import React, { useState, useMemo, useRef } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize } from "lucide-react";

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
  colorScheme = "category10",
  groupMode = "grouped", 
  keys = ["value"],
  indexBy = "id",
  showValues = true,
  showGridLines = true,
  tooltipFormat,
  displayMode,
  onDisplayModeChange
}: HrsnBarChartProps) {
  // State
  const [currentDisplayMode, setCurrentDisplayMode] = useState<"count" | "percentage">(
    displayMode || "count"
  );
  
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Update parent component's display mode if provided
  const handleDisplayModeChange = (mode: "count" | "percentage") => {
    setCurrentDisplayMode(mode);
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    }
  };
  
  // Create formatted data based on current display mode
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", value: 0 }];
    }
    
    return data.map(item => {
      const dataItem = { ...item };
      
      // If in percentage mode, replace the value with percentage
      if (currentDisplayMode === "percentage" && typeof item.percentage === 'number') {
        // Update keys with percentage values 
        keys.forEach(key => {
          if (key === 'value' && typeof item.percentage === 'number') {
            dataItem[key] = item.percentage;
          }
        });
      }
      
      return dataItem;
    });
  }, [data, currentDisplayMode, keys]);
  
  // Format for tooltip
  const formatTooltipValue = (value: number) => {
    if (tooltipFormat) {
      return tooltipFormat(value);
    }
    
    if (currentDisplayMode === "percentage") {
      return `${value.toFixed(1)}%`;
    }
    
    return value.toString();
  };
  
  return (
    <Card className="w-full h-full">
      <CardContent className="p-4">
        {/* Title and Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-md font-bold">{title}</div>
          
          {/* Display Mode Controls */}
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant={currentDisplayMode === "count" ? "default" : "outline"}
              onClick={() => handleDisplayModeChange("count")}
              className="h-7 px-2 text-xs"
            >
              Count
            </Button>
            <Button 
              size="sm" 
              variant={currentDisplayMode === "percentage" ? "default" : "outline"}
              onClick={() => handleDisplayModeChange("percentage")}
              className="h-7 px-2 text-xs"
            >
              Percentage
            </Button>
            
            {/* Enlarge Chart Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  <Maximize className="h-4 w-4 mr-1" />
                  Enlarge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-4/5 h-4/5">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="h-full">
                  <ResponsiveBar
                    data={formattedData}
                    keys={keys}
                    indexBy={indexBy}
                    margin={{ top: 30, right: 30, bottom: 50, left: 60 }}
                    padding={0.3}
                    groupMode={groupMode}
                    layout="vertical"
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={{ scheme: colorScheme as any }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: xAxisLabel,
                      legendPosition: 'middle',
                      legendOffset: 32,
                      truncateTickAt: 0
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: yAxisLabel,
                      legendPosition: 'middle',
                      legendOffset: -40,
                      truncateTickAt: 0
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    tooltip={({ id, value, color }) => (
                      <div
                        style={{
                          padding: 12,
                          background: '#fff',
                          boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            background: color,
                            display: 'inline-block',
                            marginRight: 7,
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{id}</span>
                        <span>: </span>
                        <span style={{ fontWeight: 600 }}>
                          {formatTooltipValue(value)}
                        </span>
                      </div>
                    )}
                    role="application"
                    ariaLabel={`Bar chart showing ${title}`}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Chart */}
        <div 
          ref={chartRef}
          className="w-full" 
          style={{ height: '300px' }}
        >
          <ResponsiveBar
            data={formattedData}
            keys={keys}
            indexBy={indexBy}
            margin={{ top: 30, right: 30, bottom: 50, left: 60 }}
            padding={0.3}
            groupMode={groupMode}
            layout="vertical"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: colorScheme as any }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: xAxisLabel,
              legendPosition: 'middle',
              legendOffset: 32,
              truncateTickAt: 0
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: yAxisLabel,
              legendPosition: 'middle',
              legendOffset: -40,
              truncateTickAt: 0
            }}
            enableGridX={showGridLines}
            enableGridY={showGridLines}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            enableLabel={showValues}
            animate={true}
            motionConfig="gentle"
            tooltip={({ id, value, color }) => (
              <div
                style={{
                  padding: 12,
                  background: '#fff',
                  boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: color,
                    display: 'inline-block',
                    marginRight: 7,
                  }}
                />
                <span style={{ fontWeight: 500 }}>{id}</span>
                <span>: </span>
                <span style={{ fontWeight: 600 }}>
                  {formatTooltipValue(value)}
                </span>
              </div>
            )}
            role="application"
            ariaLabel={`Bar chart showing ${title}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}