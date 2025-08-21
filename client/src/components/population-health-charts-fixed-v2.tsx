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

  // Handle opening chart in expanded view
  const handleExpandChart = (chartId: string) => {
    setExpandedChart(chartId);
  };

  // Handle closing expanded chart view
  const handleCloseExpandedChart = () => {
    setExpandedChart(null);
  };

  // Process data for the charts
  const processedData = useMemo(() => {
    if (!data) return {};

    // Function to calculate percentages for a dataset
    const calculatePercentages = (dataset: ChartDataItem[]) => {
      const total = dataset.reduce((sum, item) => sum + (item.value || 0), 0);
      return dataset.map(item => ({
        ...item,
        chartPercentage: total > 0 ? Number(((item.value || 0) / total * 100).toFixed(1)) : 0,
        percentage: item.percentage || (total > 0 ? Number(((item.value || 0) / total * 100).toFixed(1)) : 0),
        originalValue: item.value,
        displayValue: displayMode === 'percentage' 
          ? `${(total > 0 ? Number(((item.value || 0) / total * 100).toFixed(1)) : 0)}%` 
          : `${item.value || 0}`
      }));
    };

    // Function to apply display mode to a dataset
    const applyDisplayMode = (dataset: ChartDataItem[]) => {
      const withPercentages = calculatePercentages(dataset);
      
      if (displayMode === 'percentage') {
        return withPercentages.map(item => ({
          ...item,
          value: item.chartPercentage || 0
        }));
      }
      
      return withPercentages;
    };

    // Process datasets for each chart
    return {
      hrsnIndicatorData: data.hrsnIndicatorData ? applyDisplayMode(data.hrsnIndicatorData) : [],
      diagnosisData: data.diagnosisData ? applyDisplayMode(data.diagnosisData) : [],
      diagnosticCategoryData: data.diagnosticCategoryData ? applyDisplayMode(data.diagnosticCategoryData) : [],
      symptomIDData: data.symptomIDData ? applyDisplayMode(data.symptomIDData) : [],
      symptomSegmentData: data.symptomSegmentData ? applyDisplayMode(data.symptomSegmentData.slice(0, 10)) : [],
      riskStratificationData: data.riskStratificationData ? applyDisplayMode(data.riskStratificationData) : []
    };
  }, [data, displayMode]);

  // Setting up chart heights
  const chartHeight = 200;
  const expandedChartHeight = 500;

  // Get patient and record counts for total n values
  const patientCount = data?.patients?.length || 0;
  const recordCount = data?.symptomSegmentData?.length || 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          Please select patient data to view population health analytics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* HRSN Indicators Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">HRSN Indicators (Problems)</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('hrsn-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Distribution by category
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
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
                colors={getChartColors()}
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
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Diagnosis</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('diagnosis-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Distribution by diagnosis
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
          </div>
          <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
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
                colors={getChartColors()}
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
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Category Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Diagnostic Category</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('diagnostic-category-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Distribution by category
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
          </div>
          <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
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
                colors={getChartColors()}
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
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptom ID Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Symptom ID</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('symptom-id-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Distribution by symptom ID
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
          </div>
          <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
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
                colors={getChartColors()}
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
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptom Segment Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Top Symptoms</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('symptom-segment-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Top 10 symptoms by frequency
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
          </div>
          <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
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
                colors={getChartColors()}
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
                  legend: 'Symptom Segment',
                  legendPosition: 'middle',
                  legendOffset: 100,
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Stratification Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Risk Stratification</h3>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleExpandChart('risk-stratification-chart')}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Distribution by risk level
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === 'count' ? 'Show %' : 'Show Count'}
              </Button>
              <p className="text-sm text-gray-500 whitespace-nowrap mt-1">
                n={patientCount} patients • n={recordCount} records
              </p>
            </div>
          </div>
          <div style={{ height: '218px', padding: 0, margin: '2px 0 0 0' }}>
            <div 
              id="risk-stratification-chart" 
              className="w-full" 
              style={{ height: expandedChart === 'risk-stratification-chart' ? '600px' : `${chartHeight}px` }}
            >
              <ResponsiveBar
                data={processedData.riskStratificationData || []}
                keys={['value']}
                indexBy="id"
                margin={{ top: 50, right: 50, bottom: 120, left: 60 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={getChartColors()}
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
                  legend: 'Risk Level',
                  legendPosition: 'middle',
                  legendOffset: 100,
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Chart Dialog */}
      {expandedChart && (
        <Dialog open={!!expandedChart} onOpenChange={handleCloseExpandedChart}>
          <DialogContent className="max-w-5xl">
            <DialogTitle>
              {expandedChart === 'hrsn-chart' && 'HRSN Indicators (Problems)'}
              {expandedChart === 'diagnosis-chart' && 'Diagnosis'}
              {expandedChart === 'diagnostic-category-chart' && 'Diagnostic Category'}
              {expandedChart === 'symptom-id-chart' && 'Symptom ID'}
              {expandedChart === 'symptom-segment-chart' && 'Top Symptoms (Segment)'}
              {expandedChart === 'risk-stratification-chart' && 'Risk Stratification'}
            </DialogTitle>
            <DialogDescription>
              Viewing expanded chart data for {patientCount} patients with {recordCount} total records.
            </DialogDescription>
            
            <div className="flex justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
              >
                {displayMode === 'count' ? 'Show Percentages' : 'Show Counts'}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const chartElement = document.getElementById(expandedChart);
                    if (chartElement) {
                      html2canvas(chartElement).then(canvas => {
                        canvas.toBlob(blob => {
                          if (blob) saveAs(blob, `${expandedChart}.png`);
                        });
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as PNG
                </Button>
              </div>
            </div>
            
            <div 
              id={`expanded-${expandedChart}`} 
              className="w-full"
              style={{ height: `${expandedChartHeight}px` }}
            >
              {expandedChart === 'hrsn-chart' && (
                <ResponsiveBar
                  data={processedData.hrsnIndicatorData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'HRSN Indicators',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
              
              {expandedChart === 'diagnosis-chart' && (
                <ResponsiveBar
                  data={processedData.diagnosisData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'Diagnosis',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
              
              {expandedChart === 'diagnostic-category-chart' && (
                <ResponsiveBar
                  data={processedData.diagnosticCategoryData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'Diagnostic Category',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
              
              {expandedChart === 'symptom-id-chart' && (
                <ResponsiveBar
                  data={processedData.symptomIDData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'Symptom ID',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
              
              {expandedChart === 'symptom-segment-chart' && (
                <ResponsiveBar
                  data={processedData.symptomSegmentData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'Symptom Segment',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
              
              {expandedChart === 'risk-stratification-chart' && (
                <ResponsiveBar
                  data={processedData.riskStratificationData || []}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 120, bottom: 120, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={getChartColors()}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60,
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 15,
                    tickRotation: -45,
                    legend: 'Risk Level',
                    legendPosition: 'middle',
                    legendOffset: 80,
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  label={d => displayMode === "percentage" ? `${d.value}%` : `${d.value || 0}`}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 2.4]] }}
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={handleCloseExpandedChart}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}