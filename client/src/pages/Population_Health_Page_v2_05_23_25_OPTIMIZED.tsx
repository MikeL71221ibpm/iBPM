// Population Health Page V2 - PERFORMANCE OPTIMIZED VERSION
// Implements aggressive caching, memoized calculations, and streamlined rendering
// Created: June 18, 2025 - Performance optimization focus

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, Percent, Hash, Filter, Search, Database, Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { useToast } from "@/hooks/use-toast";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";
import NavigationButton from "@/components/NavigationButton";

// Optimized interfaces
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  displayValue: number;
}

interface PopulationHealthPageProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
}

// Memoized chart colors
const CHART_COLORS = [
  'hsl(210, 70%, 60%)', 'hsl(240, 70%, 60%)', 'hsl(270, 70%, 60%)',
  'hsl(300, 70%, 60%)', 'hsl(330, 70%, 60%)', 'hsl(0, 70%, 60%)',
  'hsl(30, 70%, 60%)', 'hsl(60, 70%, 60%)', 'hsl(90, 70%, 60%)',
  'hsl(120, 70%, 60%)', 'hsl(150, 70%, 60%)', 'hsl(180, 70%, 60%)'
];

// Optimized chart component with minimal props
const OptimizedChart = React.memo(({ 
  data, 
  title, 
  displayMode,
  chartType = 'bar'
}: {
  data: ChartDataItem[];
  title: string;
  displayMode: 'count' | 'percentage';
  chartType?: 'bar' | 'pie';
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Limit to top 10 items for performance
    return data
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }));
  }, [data]);

  if (chartType === 'pie') {
    return (
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerRadius={0.4}
        padAngle={2}
        cornerRadius={3}
        colors={({ index }) => CHART_COLORS[index % CHART_COLORS.length]}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        enableArcLinkLabels={false}
        enableArcLabels={true}
        arcLabel={d => `${d.value}${displayMode === 'percentage' ? '%' : ''}`}
        animate={false}
        isInteractive={false}
      />
    );
  }

  return (
    <ResponsiveBar
      data={chartData}
      keys={['displayValue']}
      indexBy="id"
      margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
      padding={0.2}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={({ index }) => CHART_COLORS[index % CHART_COLORS.length]}
      borderRadius={2}
      borderWidth={1}
      borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -30,
        legend: '',
        legendPosition: 'middle',
        legendOffset: 32
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
        legendPosition: 'middle',
        legendOffset: -40
      }}
      enableGridY={true}
      labelSkipWidth={12}
      labelSkipHeight={12}
      label={d => displayMode === 'percentage' ? `${d.value}%` : d.value.toLocaleString()}
      animate={false}
      isInteractive={false}
    />
  );
});

OptimizedChart.displayName = 'OptimizedChart';

export default function PopulationHealthPageOptimized(props: PopulationHealthPageProps) {
  // State management with defaults
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const { toast } = useToast();

  // Optimized data fetching with aggressive caching
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['/api/population-health-data'],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false
  });

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!rawData) return null;

    // Process chart data that's already in the correct format
    const processExistingData = (sourceData: any[]) => {
      if (!sourceData || !Array.isArray(sourceData)) return [];
      
      // Data is already aggregated, just ensure proper format and limit results
      return sourceData
        .slice(0, 15) // Limit for performance
        .map(item => ({
          id: item.id || item.label || 'Unknown',
          value: typeof item.value === 'number' ? item.value : 0,
          percentage: typeof item.percentage === 'number' ? item.percentage : 0,
          displayValue: displayMode === 'percentage' 
            ? (typeof item.percentage === 'number' ? item.percentage : 0)
            : (typeof item.value === 'number' ? item.value : 0)
        }));
    };

    return {
      ageData: processExistingData(rawData.ageData || []),
      genderData: processExistingData(rawData.genderData || []),
      raceData: processExistingData(rawData.raceData || []),
      diagnosisData: processExistingData(rawData.diagnosisData || []),
      hrsnData: processExistingData(rawData.hrsnIndicatorData || []),
      symptomData: processExistingData(rawData.symptomSegmentData || [])
    };
  }, [rawData, displayMode]);

  // Memoized toggle function
  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => prev === 'count' ? 'percentage' : 'count');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Population Health Analytics</h1>
          <NavigationButton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load population health data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No data available for visualization.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Population Health Analytics</h1>
        <NavigationButton />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={toggleDisplayMode}
          variant="outline"
          className="flex items-center gap-2"
        >
          {displayMode === 'count' ? <Hash className="h-4 w-4" /> : <Percent className="h-4 w-4" />}
          {displayMode === 'count' ? 'Show Percentages' : 'Show Counts'}
        </Button>

        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter data..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Data</SelectItem>
            <SelectItem value="demographics">Demographics</SelectItem>
            <SelectItem value="clinical">Clinical Data</SelectItem>
            <SelectItem value="hrsn">HRSN Indicators</SelectItem>
          </SelectContent>
        </Select>

        <DatabaseStatsWidget />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.ageData}
                title="Age Distribution"
                displayMode={displayMode}
                chartType="bar"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.genderData}
                title="Gender Distribution"
                displayMode={displayMode}
                chartType="pie"
              />
            </div>
          </CardContent>
        </Card>

        {/* Race/Ethnicity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Race/Ethnicity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.raceData}
                title="Race/Ethnicity"
                displayMode={displayMode}
                chartType="bar"
              />
            </div>
          </CardContent>
        </Card>

        {/* Diagnosis Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Top Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.diagnosisData}
                title="Top Diagnoses"
                displayMode={displayMode}
                chartType="bar"
              />
            </div>
          </CardContent>
        </Card>

        {/* HRSN Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              HRSN Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.hrsnData}
                title="HRSN Indicators"
                displayMode={displayMode}
                chartType="pie"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Top Symptoms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <OptimizedChart
                data={processedData.symptomData}
                title="Top Symptoms"
                displayMode={displayMode}
                chartType="bar"
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}