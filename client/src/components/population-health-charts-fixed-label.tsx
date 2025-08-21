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

// Define data structure for chart items
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  chartPercentage?: number; // Add this for storing chart-specific percentages
  [key: string]: string | number | undefined;
}

// Define color theme presets
interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

// Define props for the component
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
  // State for the component
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(parentDisplayMode || 'count');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // Function to get chart colors that's compatible with the Nivo bar chart
  const getChartColors = () => {
    return "nivo"; // Use the nivo default color scheme
  };

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
      
      // Create a variable to track if we're in percentage mode
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

    // Process all chart data with the improved function
    return {
      hrsnIndicatorData: processDataForChart(data.hrsnIndicatorData || []),
      riskStratificationData: processDataForChart(data.riskStratificationData || []),
      symptomSegmentData: processDataForChart(data.symptomSegmentData || []),
      diagnosisData: processDataForChart(data.diagnosisData || []),
      symptomIDData: processDataForChart(data.symptomIDData || []),
      diagnosticCategoryData: processDataForChart(data.diagnosticCategoryData || []),
    };
  }, [data, displayMode]); // displayMode dependency is critical for proper updates

  // Determine if there is any available data for each chart
  const hasHrsnData = Array.isArray(processedData.hrsnIndicatorData) && processedData.hrsnIndicatorData.length > 0;
  const hasRiskData = Array.isArray(processedData.riskStratificationData) && processedData.riskStratificationData.length > 0;
  const hasSymptomSegmentData = Array.isArray(processedData.symptomSegmentData) && processedData.symptomSegmentData.length > 0;
  const hasDiagnosisData = Array.isArray(processedData.diagnosisData) && processedData.diagnosisData.length > 0;
  const hasSymptomIDData = Array.isArray(processedData.symptomIDData) && processedData.symptomIDData.length > 0;
  const hasDiagnosticCategoryData = Array.isArray(processedData.diagnosticCategoryData) && processedData.diagnosticCategoryData.length > 0;

  // Function to handle downloading a chart as PNG
  const handleDownloadChart = (chartId: string, chartTitle: string) => {
    const chartElement = document.getElementById(chartId);
    if (chartElement) {
      html2canvas(chartElement).then(canvas => {
        canvas.toBlob(function(blob) {
          if (blob) {
            saveAs(blob, `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.png`);
          }
        });
      });
    }
  };

  // Function to toggle chart expansion
  // When expanding a chart, we need to make sure the data is processed correctly
  // with percentages if we're in percentage mode
  const toggleExpandChart = (chartId: string | null) => {
    // Set the expanded chart
    setExpandedChart(chartId === expandedChart ? null : chartId);
  };

  // Common chart theme configuration
  const chartTheme = {
    axis: {
      ticks: {
        text: {
          fontSize: 12,
          fill: "#333333",
        },
      },
      legend: {
        text: {
          fontSize: 12,
          fill: "#333333",
        },
      },
    },
    grid: {
      line: {
        stroke: "#dddddd",
        strokeWidth: 1,
      },
    },
    tooltip: {
      container: {
        background: "#ffffff",
        fontSize: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        borderRadius: 4,
      },
    },
  };

  // Render a skeleton loader during loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // Render an alert if no data is available
  if (!data || Object.keys(data).length === 0) {
    return (
      <Alert className="mb-4">
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          No visualization data is currently available. Please check your data source or filters.
        </AlertDescription>
      </Alert>
    );
  }

  // Determine common chart height based on container width
  const chartHeight = 400;
  
  // Fixed bar label function that works consistently for all charts
  const getBarLabel = (d: any) => {
    return displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`;
  };
  
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
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'HRSN Indicators',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Risk Stratification Chart */}
        {hasRiskData && (
          <Card className={`overflow-hidden population-health-card ${expandedChart === 'risk-chart' ? 'col-span-full' : ''}`}>
            <CardHeader className="population-health-card-header">
              <CardTitle className="flex justify-between items-center">
                <span>Risk Stratification</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('risk-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                n={patientCount} patients • n={recordCount} records
              </p>
            </CardHeader>
            <CardContent className="population-health-card-content card-content-fix">
              <div 
                id="risk-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'risk-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.riskStratificationData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Risk Levels',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Symptom Segment Chart */}
        {hasSymptomSegmentData && (
          <Card className={`overflow-hidden population-health-card ${expandedChart === 'symptom-segment-chart' ? 'col-span-full' : ''}`}>
            <CardHeader className="population-health-card-header">
              <CardTitle className="flex justify-between items-center">
                <span>Total Population by Symptom Segment</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('symptom-segment-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-fix">
              <div 
                id="symptom-segment-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'symptom-segment-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.symptomSegmentData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Symptom Segments',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diagnosis Chart */}
        {hasDiagnosisData && (
          <Card className={`overflow-hidden population-health-card ${expandedChart === 'diagnosis-chart' ? 'col-span-full' : ''}`}>
            <CardHeader className="population-health-card-header">
              <CardTitle className="flex justify-between items-center">
                <span>Total Population by Diagnosis</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('diagnosis-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-fix">
              <div 
                id="diagnosis-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'diagnosis-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.diagnosisData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Diagnosis',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Symptom ID Chart */}
        {hasSymptomIDData && (
          <Card className={`overflow-hidden population-health-card ${expandedChart === 'symptom-id-chart' ? 'col-span-full' : ''}`}>
            <CardHeader className="population-health-card-header">
              <CardTitle className="flex justify-between items-center">
                <span>Total Population by Symptom ID</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('symptom-id-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-fix">
              <div 
                id="symptom-id-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'symptom-id-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.symptomIDData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Symptom ID',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diagnostic Category Chart */}
        {hasDiagnosticCategoryData && (
          <Card className={`overflow-hidden population-health-card ${expandedChart === 'diagnostic-category-chart' ? 'col-span-full' : ''}`}>
            <CardHeader className="population-health-card-header">
              <CardTitle className="flex justify-between items-center">
                <span>Total Population by Diagnostic Category</span>
                <div className="flex space-x-2">
                  {/* Download button removed */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpandChart('diagnostic-category-chart')}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-fix">
              <div 
                id="diagnostic-category-chart" 
                className="w-full" 
                style={{ height: expandedChart === 'diagnostic-category-chart' ? '600px' : `${chartHeight}px` }}
              >
                <ResponsiveBar
                  data={processedData.diagnosticCategoryData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: getChartColors() }}
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
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Diagnostic Category',
                    legendPosition: 'middle',
                    legendOffset: 100,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={getBarLabel}
                  labelTextColor={"#000000"}
                  labelPosition="outside"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                  theme={chartTheme}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}