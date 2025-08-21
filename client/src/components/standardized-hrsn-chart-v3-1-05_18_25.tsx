import React, { useState } from 'react';
import HrsnBarChartV31 from './hrsn-bar-chart-v3-1-05_18_25';
import HrsnPieChartV31 from './hrsn-pie-chart-v3-1-05_18_25';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface StandardizedHrsnChartProps {
  data: ChartDataItem[];
  title: string;
  subtitle?: string;
  chartType: "bar" | "pie" | "both";
  defaultTab?: "bar" | "pie";
  colorScheme?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showGridLines?: boolean;
  showLegend?: boolean;
  groupMode?: "grouped" | "stacked";
  keys?: string[];
  indexBy?: string;
  tooltipFormat?: (value: number) => string;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function StandardizedHrsnChartV31({
  data,
  title,
  subtitle,
  chartType = "bar",
  defaultTab = "bar",
  colorScheme = "blues",
  xAxisLabel = "",
  yAxisLabel = "",
  showGridLines = true,
  showLegend = true,
  groupMode = "grouped",
  keys,
  indexBy = "id",
  tooltipFormat,
  displayMode: externalDisplayMode,
  onDisplayModeChange: externalOnDisplayModeChange
}: StandardizedHrsnChartProps) {
  const [internalDisplayMode, setInternalDisplayMode] = useState<"count" | "percentage">("count");
  
  // Use external state if provided, otherwise use internal state
  const displayMode = externalDisplayMode !== undefined ? externalDisplayMode : internalDisplayMode;

  // Handle display mode switch
  const handleDisplayModeChange = (mode: "count" | "percentage") => {
    // Update internal state
    setInternalDisplayMode(mode);
    
    // Notify parent component if callback provided
    if (externalOnDisplayModeChange) {
      externalOnDisplayModeChange(mode);
    }
  };

  // Simple helper to check if we have valid data
  const hasValidData = data && data.length > 0 && data.some(item => item.value > 0);

  // Render a message if no data is available
  if (!hasValidData) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
          <p className="text-center text-muted-foreground py-8">No data available for this chart.</p>
        </CardContent>
      </Card>
    );
  }

  // Render a single chart type
  if (chartType !== "both") {
    return (
      <div className="w-full h-full">
        {chartType === "bar" ? (
          <HrsnBarChartV31
            data={data}
            title={title}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
            colorScheme={colorScheme}
            groupMode={groupMode}
            keys={keys}
            indexBy={indexBy}
            showGridLines={showGridLines}
            tooltipFormat={tooltipFormat}
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
          />
        ) : (
          <HrsnPieChartV31
            data={data}
            title={title}
            colorScheme={colorScheme}
            showLegend={showLegend}
            tooltipFormat={tooltipFormat}
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
          />
        )}
        {subtitle && (
          <div className="text-sm text-center text-muted-foreground mt-2 px-4">
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  // Render both chart types with tabs
  return (
    <Card className="w-full h-full">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleDisplayModeChange(displayMode === "count" ? "percentage" : "count")}
            className="ml-auto mr-2"
          >
            {displayMode === "count" ? "Count" : "%"}
          </Button>
        </div>
        
        <Tabs defaultValue={defaultTab} className="w-full flex-1 flex flex-col">
          <div className="px-4 border-b">
            <TabsList className="h-10">
              <TabsTrigger value="bar">Bar Chart</TabsTrigger>
              <TabsTrigger value="pie">Pie Chart</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="bar" className="flex-1 data-[state=active]:flex">
            <div className="w-full h-full" style={{ minHeight: '300px' }}>
              <HrsnBarChartV31
                data={data}
                title=""
                xAxisLabel={xAxisLabel}
                yAxisLabel={yAxisLabel}
                colorScheme={colorScheme}
                groupMode={groupMode}
                keys={keys}
                indexBy={indexBy}
                showGridLines={showGridLines}
                tooltipFormat={tooltipFormat}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="flex-1 data-[state=active]:flex">
            <div className="w-full h-full" style={{ minHeight: '300px' }}>
              <HrsnPieChartV31
                data={data}
                title=""
                colorScheme={colorScheme}
                showLegend={showLegend}
                tooltipFormat={tooltipFormat}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {subtitle && (
          <div className="text-sm text-center text-muted-foreground p-2 border-t">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}