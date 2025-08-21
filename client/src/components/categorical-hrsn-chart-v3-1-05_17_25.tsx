// Last updated: May 17, 2025 - 11:45 PM
// CategoricalHrsnChart v3.1 - Enhanced with theme support
// This is a v3.1 version that adds proper theme support functionality

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveBar } from "@nivo/bar";
import type { BarDatum } from "@nivo/bar";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  "ethnicity": "race", // Temporarily map ethnicity to race until we have proper ethnicity data
  "zip_code": "age_range", // Temporary mapping - will be replaced with real data in future
  "veteran_status": "age_range", // Temporary mapping - will be replaced with real data in future
  "education_level": "age_range", // Temporary mapping - will be replaced with real data in future
  "utilities_insecurity": "utility_needs" // Map to correct field name in current data
};

interface DataItem {
  id: string;
  label: string;
  value: number;
  percentage?: number;
}

interface CategoricalValueInfo {
  values: Record<string, number>;      // Raw counts for each value
  percentages: Record<string, number>; // Percentage for each value
  mostCommon: string;                  // Most common value
  mostCommonPercent: number;           // Percentage of most common value
  totalCount: number;                  // Total records in this cell
}

interface RawValueData {
  count: number;
  percentage: number;
  total: number;
}

interface ChartDataItem {
  ageRange: string;
  [key: string]: number | string | Record<string, RawValueData> | undefined;
  raw?: Record<string, RawValueData>;
}

interface CategoricalHrsnChartProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  categoryName: string; // The specific category to visualize (e.g., 'gender', 'race')
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
}

export default function CategoricalHrsnChart({
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "blues", // Default color scheme
  isLoading = false,
  categoryName,
  filterBy
}: CategoricalHrsnChartProps): JSX.Element {
  // State for chart data
  const [barData, setBarData] = useState<DataItem[]>([]);
  const [chartTitle, setChartTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Use global theme context
  const { currentTheme, colorSettings, displayMode } = useChartTheme();
  
  // Map from theme context to color scheme - direct function to ensure reactivity
  const getColorSchemeFromTheme = () => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'blues',
      'dark': 'dark2',
      'muted': 'greys',
      'viridis': 'viridis'
    };
    return mapping[currentTheme] || colorScheme;
  };
  
  // Color schemes (ensure we have the same values across all charts)
  const colorSchemes: Record<string, string[]> = {
    blues: ["#0ea5e9", "#0284c7", "#0369a1", "#075985"],
    blue_green: ["#0ea5e9", "#14b8a6", "#059669", "#047857"],
    blue_purple: ["#0ea5e9", "#818cf8", "#a78bfa", "#8b5cf6"],
    green_blue: ["#10b981", "#0ea5e9", "#0284c7", "#0369a1"],
    purple_blue: ["#7c3aed", "#6366f1", "#3b82f6", "#0ea5e9"],
    green: ["#10b981", "#059669", "#047857", "#065f46"],
    purple: ["#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"],
    pink: ["#ec4899", "#db2777", "#be185d", "#9d174d"],
    red: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b"],
    yellow: ["#fbbf24", "#f59e0b", "#d97706", "#b45309"],
    rainbow: ["#ef4444", "#f97316", "#fbbf24", "#22c55e", "#0ea5e9", "#8b5cf6", "#ec4899"],
    viridis: ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724"],
    dark2: ["#1A1A1A", "#333333", "#4D4D4D", "#666666", "#808080", "#999999"],
    greys: ["#333333", "#4F4F4F", "#828282", "#BDBDBD", "#E0E0E0"]
  };
  
  // Get colors for current scheme using the theme-aware color scheme
  const getColors = useMemo(() => {
    const selectedScheme = getColorSchemeFromTheme;
    return colorSchemes[selectedScheme] || colorSchemes.blues;
  }, [getColorSchemeFromTheme]);
  
  // Helper function to get mapped field value from an item
  function getMappedFieldValue(item: any, fieldName: string): any {
    // First try the standardized field name
    if (item[fieldName] !== undefined) {
      return item[fieldName];
    }
    
    // If not found, check if there's a mapping for this field name
    if (fieldNameMapping[fieldName] && item[fieldNameMapping[fieldName]] !== undefined) {
      return item[fieldNameMapping[fieldName]];
    }
    
    // If still not found, return undefined
    return undefined;
  }
  
  // Process data for the chart
  useEffect(() => {
    setLoading(true);
    
    if (!categoryName || patientData.length === 0) {
      setBarData([]);
      setChartTitle("");
      setLoading(false);
      return;
    }
    
    try {
      // Apply filters if provided
      let filteredData = [...patientData];
      
      if (filterBy) {
        if (filterBy.diagnosis) {
          filteredData = filteredData.filter((patient: any) => 
            patient.diagnosis === filterBy.diagnosis);
        }
        if (filterBy.symptom) {
          // This would need to be enhanced if we implement symptom filtering
          const matchingPatientIds = new Set(
            extractedSymptoms
              .filter((s: any) => s.symptom === filterBy.symptom)
              .map((s: any) => s.patient_id)
          );
          filteredData = filteredData.filter((patient: any) => 
            matchingPatientIds.has(patient.id));
        }
        if (filterBy.diagnosticCategory) {
          filteredData = filteredData.filter((patient: any) => 
            patient.diagnostic_category === filterBy.diagnosticCategory);
        }
        if (filterBy.icd10Code) {
          filteredData = filteredData.filter((patient: any) => 
            patient.icd10_code === filterBy.icd10Code);
        }
      }
      
      // Count occurrences of each value for the category
      const valueCounts: Record<string, number> = {};
      const valuePatients: Record<string, Set<string>> = {};
      
      filteredData.forEach((patient: any) => {
        // Use standardized field access through mapping function
        const value = getMappedFieldValue(patient, categoryName) || "Unknown";
        const patientId = patient.id || patient.patient_id;
        
        // Initialize if first occurrence
        if (!valueCounts[value]) {
          valueCounts[value] = 0;
          valuePatients[value] = new Set();
        }
        
        // Increment count and add patient ID to set
        valueCounts[value]++;
        if (patientId) {
          valuePatients[value].add(patientId.toString());
        }
      });
      
      // Calculate total and percentages
      const totalPatients = Object.values(valuePatients)
        .reduce((uniqueTotal, patientSet) => uniqueTotal + patientSet.size, 0);
        
      // Convert to chart data format
      const chartData: DataItem[] = Object.entries(valuePatients)
        .map(([value, patientSet], index) => {
          const uniqueCount = patientSet.size;
          const percentage = totalPatients > 0 
            ? Math.round((uniqueCount / totalPatients) * 100) 
            : 0;
            
          return {
            id: value,
            label: value,
            value: uniqueCount,
            percentage
          };
        })
        .sort((a, b) => b.value - a.value); // Sort by value descending
      
      // Generate title with proper formatting
      const titleFieldName = categoryName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
        
      setBarData(chartData);
      setChartTitle(`${titleFieldName} Distribution`);
      setLoading(false);
    } catch (error) {
      console.error("Error processing categorical data:", error);
      setBarData([]);
      setChartTitle("");
      setLoading(false);
    }
  }, [patientData, extractedSymptoms, categoryName, filterBy]);
  
  if (loading || isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Loading...</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="w-full h-full rounded-md" />
        </CardContent>
      </Card>
    );
  }
  
  if (barData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{chartTitle || "Category Distribution"}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get colors for the current theme - call the function directly
  const colors = colorSchemes[getColorSchemeFromTheme()] || colorSchemes.blues;
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
        <CardDescription>Count by {categoryName.replace(/_/g, ' ')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full">
          <ResponsiveBar
            data={barData}
            keys={["value"]}
            indexBy="id"
            margin={{ top: 10, right: 30, bottom: 70, left: 40 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={({index}) => colors[index % colors.length]}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: categoryName.replace(/_/g, ' '),
              legendPosition: 'middle',
              legendOffset: 50
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'patient count',
              legendPosition: 'middle',
              legendOffset: -32
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            role="application"
            ariaLabel={`${categoryName} distribution chart`}
            barAriaLabel={e => `${e.indexValue}: ${e.value} patients`}
            tooltip={({ id, value, color, data }) => (
              <div
                style={{
                  padding: 12,
                  background: 'white',
                  border: `1px solid ${color}`,
                  borderRadius: 3,
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)'
                }}
              >
                <strong style={{ color }}>{id}</strong>
                <div>Patients: {value}</div>
                <div>Percentage: {data.percentage}%</div>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}