// IBPM v3.1.0 - Created: May 19, 2025
// Categorical HRSN Chart Component for displaying categorical health data
// Component addresses all TypeScript issues with proper typing

import React, { useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarDatum } from '@nivo/bar';

// Define types for data structures
interface RawValueData {
  count: number;
  percentage: number;
  total: number;
}

interface CategoricalValueInfo {
  values: Record<string, number>;
  percentages: Record<string, number>;
  mostCommon: string;
  mostCommonPercent: number;
  totalCount: number;
}

// Define the chart data item (compatible with Nivo BarDatum)
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  category?: string;
  [key: string]: string | number | undefined;
}

// Define heatmap data structure
interface HeatmapDataPoint {
  x: string;
  y: number;
}

interface HeatmapGroupData {
  id: string;
  data: HeatmapDataPoint[];
}

// Component props
interface CategoricalHrsnChartProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  categoryName: string;
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function CategoricalHrsnChartV31({
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "spectral",
  isLoading = false,
  categoryName,
  filterBy,
  displayMode: externalDisplayMode,
  onDisplayModeChange
}: CategoricalHrsnChartProps) {
  // Local display mode state if no external control is provided
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">("count");
  
  // Use either external or local display mode
  const displayMode = externalDisplayMode ?? localDisplayMode;
  
  // Create a formatted title based on the category
  const formattedTitle = useMemo(() => {
    return categoryName.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [categoryName]);

  // Filter data based on provided filters
  const filteredData = useMemo(() => {
    if (!patientData || patientData.length === 0) return [];
    
    return patientData.filter(patient => {
      if (!filterBy) return true;
      
      let matches = true;
      
      if (filterBy.diagnosis && patient.diagnosis !== filterBy.diagnosis) {
        matches = false;
      }
      
      if (filterBy.diagnosticCategory && patient.diagnostic_category !== filterBy.diagnosticCategory) {
        matches = false;
      }
      
      if (filterBy.symptom && (!patient.symptoms || !patient.symptoms.includes(filterBy.symptom))) {
        matches = false;
      }
      
      if (filterBy.icd10Code && patient.icd10_code !== filterBy.icd10Code) {
        matches = false;
      }
      
      return matches;
    });
  }, [patientData, filterBy]);

  // Process data for bar chart
  const chartData: ChartDataItem[] = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    // Count occurrences of each category value
    const valueCounts: Record<string, number> = {};
    const totalRecords = filteredData.length;
    
    filteredData.forEach(patient => {
      const value = patient[categoryName] || 'Not Recorded';
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    // Convert to array of chart items with percentages
    return Object.entries(valueCounts).map(([category, count]) => {
      const percentage = Math.round((count / totalRecords) * 100);
      return {
        id: category,
        value: count,
        percentage,
        category  // Keep original category name for reference
      } as ChartDataItem;
    }).sort((a, b) => b.value - a.value); // Sort by count descending
  }, [filteredData, categoryName]);

  // Process data for heatmap visualization
  const heatmapData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    // Get unique age ranges and category values
    // Using Array.from instead of spread operator with Set for better TS compatibility
    const ageRangesSet = new Set<string>();
    const categoryValuesSet = new Set<string>();
    
    filteredData.forEach(p => {
      ageRangesSet.add(p.age_range || 'Unknown');
      categoryValuesSet.add(p[categoryName] || 'Not Recorded');
    });
    
    const ageRanges = Array.from(ageRangesSet).sort();
    const categoryValues = Array.from(categoryValuesSet);
    
    // Create counts for each combination
    const counts: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    
    // Initialize counts
    categoryValues.forEach(cat => {
      counts[cat] = {};
      ageRanges.forEach(age => {
        counts[cat][age] = 0;
      });
    });
    
    // Count occurrences
    filteredData.forEach(patient => {
      const category = patient[categoryName] || 'Not Recorded';
      const ageRange = patient.age_range || 'Unknown';
      
      counts[category][ageRange] = (counts[category][ageRange] || 0) + 1;
      totals[ageRange] = (totals[ageRange] || 0) + 1;
    });
    
    // Create heatmap data structure
    return categoryValues.map(category => {
      const dataPoints = ageRanges.map(ageRange => {
        const value = counts[category][ageRange] || 0;
        const percentage = totals[ageRange] ? Math.round((value / totals[ageRange]) * 100) : 0;
        
        return {
          x: ageRange,
          y: displayMode === 'percentage' ? percentage : value
        };
      });
      
      return {
        id: category,
        data: dataPoints
      };
    });
  }, [filteredData, categoryName, displayMode]);

  // Handle display mode toggle
  const handleDisplayModeToggle = () => {
    const newMode = displayMode === "count" ? "percentage" : "count";
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    } else {
      setLocalDisplayMode(newMode);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Loading {formattedTitle} Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-8 bg-slate-200 rounded-md w-3/4"></div>
            <div className="h-64 bg-slate-200 rounded-md w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (chartData.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>{formattedTitle} Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-slate-500">No data available for {formattedTitle}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format tooltip values based on display mode
  const formatTooltip = (value: number) => {
    return displayMode === 'percentage' ? `${value}%` : value.toString();
  };

  // Data visualization
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{formattedTitle} Distribution</CardTitle>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDisplayModeToggle}
            className="ml-auto"
          >
            {displayMode === "count" ? "View %" : "View Count"}
          </Button>
        </div>
        <CardDescription>
          {filterBy ? 'Filtered data' : 'All patients'} - {filteredData.length} records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="heatmap">Age Distribution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar" className="h-72">
            <ResponsiveBar
              data={chartData as any[]} // Type assertion to work around index signature issue
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 30, bottom: 70, left: 60 }}
              padding={0.3}
              layout="vertical"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: colorScheme as any }} // Type assertion for color scheme
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
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
              enableGridY={false}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
              tooltip={(props) => {
                const data = props.data || {};
                const value = displayMode === 'percentage'
                  ? data.percentage || 0
                  : data.value || 0;
                  
                return (
                  <div style={{ 
                    background: 'white', 
                    padding: '9px 12px', 
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}>
                    <div><strong>{data.id}</strong></div>
                    <div>{displayMode === 'percentage' ? 'Percentage' : 'Count'}: {formatTooltip(value)}</div>
                  </div>
                );
              }}
            />
          </TabsContent>
          
          <TabsContent value="heatmap" className="h-72">
            <ResponsiveHeatMap
              data={heatmapData as any[]}
              margin={{ top: 10, right: 80, bottom: 60, left: 100 }}
              valueFormat={value => 
                displayMode === 'percentage' 
                  ? `${Math.round(Number(value))}%` 
                  : Math.round(Number(value)).toString()
              }
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Age Range',
                legendPosition: 'middle',
                legendOffset: 36
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: formattedTitle,
                legendPosition: 'middle',
                legendOffset: -60
              }}
              colors={{
                type: 'sequential',
                scheme: colorScheme as any
              }}
              emptyColor="#f8f9fa"
              enableLabels={true}
              labelTextColor={{
                from: 'color',
                modifiers: [['darker', 2]]
              }}
              animate={true}
              hoverTarget="cell"
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              tooltip={(data: any) => {
                // Access properties safely using optional chaining
                const cell = data?.cell || {};
                const value = cell.value;
                const serieId = cell.serieId || 'Unknown';
                const x = cell.data?.x || 'Unknown';
                
                return (
                  <div style={{ 
                    background: 'white', 
                    padding: '9px 12px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px' 
                  }}>
                    <div><strong>{serieId}</strong></div>
                    <div>Age Range: {x}</div>
                    <div>
                      {displayMode === 'percentage' ? 'Percentage' : 'Count'}: {
                        displayMode === 'percentage' 
                          ? `${Math.round(Number(value))}%` 
                          : Math.round(Number(value))
                      }
                    </div>
                  </div>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}