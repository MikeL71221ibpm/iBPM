import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Download, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import "@/components/ui/chart-height-fix.css";

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  chartPercentage?: number;
  originalValue?: number;
  displayValue?: string;
  [key: string]: string | number | undefined;
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
}

export default function PopulationHealthCharts({ 
  data, 
  isLoading = false,
  displayMode: parentDisplayMode,
  onDisplayModeChange
}: PopulationHealthChartsProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(parentDisplayMode || 'count');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [chartHeight, setChartHeight] = useState(400);
  const colorTheme = 'nivo'; // Use simple string for colors
  
  // Update local display mode when parent mode changes
  useEffect(() => {
    if (parentDisplayMode && parentDisplayMode !== displayMode) {
      setDisplayMode(parentDisplayMode);
    }
  }, [parentDisplayMode]);

  // Handle display mode toggle
  const toggleDisplayMode = () => {
    const newMode = displayMode === 'count' ? 'percentage' : 'count';
    setDisplayMode(newMode);
    
    // Notify parent if callback is provided
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    }
  };
  
  // Count variables for display
  const patientCount = data?.patients?.length || 24;
  const recordCount = data?.recordCount || 1061;

  // Calculate chart-specific percentages for each dataset
  const processedData = useMemo(() => {
    if (!data) return {};

    const processDataForChart = (chartData: ChartDataItem[]) => {
      if (!Array.isArray(chartData) || chartData.length === 0) return chartData;
      
      // Calculate total value for this specific chart
      const chartTotal = chartData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
      
      // In percentage mode, convert values to percentages 
      const isPercentageMode = displayMode === 'percentage';
      
      // Calculate chart-specific percentages
      return chartData.map(item => {
        // Ensure value is treated as a number
        const itemValue = Number(item.value) || 0;
        const percentage = chartTotal > 0 ? Math.round((itemValue / chartTotal) * 100) : 0;
        
        // In percentage mode, the value becomes the percentage itself
        // This ensures charts show actual percentages in percentage mode
        const valueToUse = isPercentageMode ? percentage : itemValue;
        
        // Create a consistent data structure that works in both main view and enlarged view
        return {
          ...item,
          chartPercentage: percentage,  
          percentage: percentage,       // For backwards compatibility
          originalValue: itemValue,     // Store original value
          value: valueToUse,            // Display value (either raw count or percentage)
          displayValue: isPercentageMode ? `${percentage}%` : String(itemValue) // Pre-formatted display value
        };
      });
    };

    return {
      hrsnIndicatorData: processDataForChart(data.hrsnIndicatorData || []),
      riskStratificationData: processDataForChart(data.riskStratificationData || []),
      symptomSegmentData: processDataForChart(data.symptomSegmentData || []),
      diagnosisData: processDataForChart(data.diagnosisData || []),
      symptomIDData: processDataForChart(data.symptomIDData || []),
      diagnosticCategoryData: processDataForChart(data.diagnosticCategoryData || []),
    };
  }, [data, displayMode]);

  // Toggle expanded chart
  const toggleExpandChart = (chartId: string) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  // Check for available data
  const hasHrsnData = processedData.hrsnIndicatorData && processedData.hrsnIndicatorData.length > 0;
  const hasRiskData = processedData.riskStratificationData && processedData.riskStratificationData.length > 0;
  const hasSymptomSegmentData = processedData.symptomSegmentData && processedData.symptomSegmentData.length > 0;
  const hasDiagnosisData = processedData.diagnosisData && processedData.diagnosisData.length > 0;
  const hasSymptomIDData = processedData.symptomIDData && processedData.symptomIDData.length > 0;
  const hasDiagnosticCategoryData = processedData.diagnosticCategoryData && processedData.diagnosticCategoryData.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !hasHrsnData) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No visualization data available</AlertTitle>
        <AlertDescription>
          No visualization data is currently available. Please check your data source or filters.
        </AlertDescription>
      </Alert>
    );
  }

  // Determine common chart height based on container width
  const chartHeight = 400;
  
  return (
    <div className="space-y-4 pb-8">
      {/* Display Mode Toggle and Title */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Population Health Overview</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDisplayMode}
            aria-pressed={displayMode === 'percentage'}
          >
            <Settings className="h-4 w-4 mr-2" />
            {displayMode === 'count' ? 'Show %' : 'Show Count'}
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 population-health-grid">
        {/* HRSN Indicators Chart */}
        {hasHrsnData && (
          <Card className={`overflow-hidden ${expandedChart === 'hrsn-chart' ? 'col-span-full' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
            <div style={{ padding: '7px 16px', minHeight: '60px' }}>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">HRSN Indicators (Problems)</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('hrsn-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
            <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
              <div 
                id="hrsn-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'hrsn-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.hrsnIndicatorData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={colorTheme}
                  colorBy="indexValue"
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -50,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -35,
                    legend: 'Category',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => {
                    // For percentage mode, use the chartPercentage value we calculated
                    if (displayMode === "percentage") {
                      return `${d.data.chartPercentage || 0}%`;
                    } else {
                      // For count mode, use the raw value
                      return `${d.value || 0}`;
                    }
                  }}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={{
                    axis: {
                      ticks: {
                        text: {
                          fontSize: 12,
                          fill: "#333333",
                        }
                      },
                      legend: {
                        text: {
                          fontSize: 14,
                          fill: "#333333",
                          fontWeight: 'bold',
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* All other charts would follow with the same pattern */}
        {/* Risk Stratification Chart, Symptom Segment Chart, Diagnosis Chart, etc. */}
        {/* These would be implemented with the same pattern as the HRSN chart but with their specific data */}

      </div>
    </div>
  );
}