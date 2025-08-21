// Last updated: May 17, 2025 - 8:25 PM
// Controls component: HRSN Pie Chart - displays HRSN percentage distributions

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";

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

interface PieChartDataItem {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface HrsnPieChartProps {
  data?: any[];
  title: string;
  fieldName: string;
  filterField?: string; // Field to filter by (e.g., "gender")
  filterValue?: string; // Value to filter for (e.g., "Male")
  colorScheme?: string;
  subtitle?: string;
  height?: number;
  compactMode?: boolean; // Flag for compact design with minimal padding
}

export default function HrsnPieChart({
  data = [],
  title,
  fieldName,
  filterField,
  filterValue,
  colorScheme = "blue", // Keep for backward compatibility
  subtitle,
  height = 350,
  compactMode = false
}: HrsnPieChartProps) {
  const [pieData, setPieData] = useState<PieChartDataItem[]>([]);
  
  // Use global theme context
  const { currentTheme, colorSettings, displayMode } = useChartTheme();
  
  // Map from theme context to color scheme
  const getColorSchemeFromTheme = (): string => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'default',
      'dark': 'iridis',
      'muted': 'grayscale',
      'viridis': 'viridis'
    };
    return mapping[currentTheme] || colorScheme;
  };
  
  // Use global theme color scheme if available
  const effectiveColorScheme = getColorSchemeFromTheme();
  
  // Color schemes (matching Individual Search colors exactly)
  const colorSchemes: Record<string, string[]> = {
    default: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    blues: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    rainbow: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"],
    viridis: ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724"],
    iridis: ["#FEFE62", "#D7B541", "#AB7424", "#74260E", "#3A0853"],
    grayscale: ["#1F2937", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6"],
    blue: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    green: ["#047857", "#059669", "#10b981", "#34d399", "#6ee7b7"],
    purple: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
    orange: ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"],
    red: ["#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"],
    teal: ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"],
    amber: ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"],
    indigo: ["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"],
    pink: ["#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4"],
    cyan: ["#0e7490", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc"],
    slate: ["#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"],
    gray: ["#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"]
  };
  
  // Get colors for current scheme (now using the theme-aware color scheme)
  const getColors = () => {
    return colorSchemes[effectiveColorScheme] || colorSchemes.blue;
  };
  
  // Process data for pie chart
  useEffect(() => {
    if (!data || data.length === 0) {
      setPieData([]);
      return;
    }
    
    try {
      // Apply filter if provided
      let filteredData = [...data];
      
      if (filterField && filterValue) {
        filteredData = filteredData.filter((item: any) => {
          if (!item) return false;
          
          // Use field mapping to get the value for the standardized filter field
          const actualFieldValue = getMappedFieldValue(item, filterField);
          return actualFieldValue === filterValue;
        });
      }
      
      // Track unique patient IDs for each value of the field
      const patientsByValue: Record<string, Set<string>> = {};
      
      // Process each patient record
      filteredData.forEach((item: any) => {
        if (!item) return;
        
        // Get patient ID
        const patientId = item.id || item.patient_id;
        if (!patientId) return;
        
        // Use field mapping to get the value for the standardized field name
        // This ensures we find the value regardless of which field name is used
        const value = getMappedFieldValue(item, fieldName) || "Unknown";
        
        // For debugging
        if (fieldName === 'access_to_transportation' || fieldName === 'transportation_needs' || 
            fieldName === 'has_a_car' || fieldName === 'has_transportation') {
          console.log(`Transportation field accessed: ${fieldName} = ${value} (mapped from: ${fieldNameMapping[fieldName]})`);
        }
        
        // Initialize the set if this is the first patient with this value
        if (!patientsByValue[value]) {
          patientsByValue[value] = new Set<string>();
        }
        
        // Add this patient to the set for this value
        patientsByValue[value].add(patientId.toString());
      });
      
      // Convert patient sets to counts (number of unique patients)
      const valueCounts: Record<string, number> = {};
      
      // For each value, count the number of unique patients
      Object.entries(patientsByValue).forEach(([value, patientSet]) => {
        valueCounts[value] = patientSet.size;
      });
      
      // Calculate percentages based on unique patient counts
      const total = Object.values(valueCounts).reduce((sum, count) => sum + count, 0);
      
      // If no data is found, return empty array
      if (total === 0) {
        console.log(`No valid data found for field: ${fieldName}`);
        setPieData([]);
        return;
      }
      
      // Convert to pie chart data format
      const pieItems: PieChartDataItem[] = Object.entries(valueCounts)
        .map(([value, count], index) => ({
          id: value,
          label: value,
          value: Math.round((count / total) * 100), // Convert to percentage
          color: getColors()[index % getColors().length]
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending
      
      console.log(`Processed ${pieItems.length} items for ${fieldName} pie chart`);
      setPieData(pieItems);
    } catch (error) {
      console.error("Error processing pie chart data:", error);
      setPieData([]);
    }
  }, [data, fieldName, filterField, filterValue, colorScheme]);
  
  if (!data || data.length === 0 || pieData.length === 0) {
    return (
      <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
        <CardHeader className={compactMode ? "p-1 pb-0" : "pb-2"}>
          <CardTitle className={compactMode ? "text-xs font-medium" : "text-lg font-medium"}>{title}</CardTitle>
          {subtitle && !compactMode && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className={`flex-1 flex items-center justify-center ${compactMode ? 'p-1 pt-0' : ''}`}>
          <p className="text-muted-foreground text-center text-xs">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
      <CardHeader className={compactMode ? "p-1 pb-0" : "pb-2"}>
        <CardTitle className={compactMode ? "text-xs font-medium" : "text-lg font-medium"}>{title}</CardTitle>
        {subtitle && !compactMode && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className={`flex-1 relative ${compactMode ? 'p-1 pt-0' : ''}`}>
        <div style={{ height: height }}>
          <ResponsivePie
            data={pieData}
            margin={compactMode 
              ? { top: 5, right: 5, bottom: 10, left: 5 } 
              : { top: 10, right: 10, bottom: 20, left: 10 }}
            innerRadius={compactMode ? 0.4 : 0.5}
            padAngle={compactMode ? 0.5 : 0.7}
            cornerRadius={compactMode ? 2 : 3}
            activeOuterRadiusOffset={compactMode ? 4 : 8}
            borderWidth={compactMode ? 0.5 : 1}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.2]]
            }}
            colors={{ datum: 'data.color' }}
            enableArcLinkLabels={false}
            arcLabelsSkipAngle={10} // Show arc labels for most slices
            arcLabelsTextColor="#000000"
            arcLabel={function(arc) { return `${arc.value}%`; }}
            theme={{
              labels: {
                text: {
                  fontWeight: 'bold',
                  fontSize: compactMode ? 10 : 12,
                  fill: '#000000'
                }
              }
            }}
            valueFormat={(value) => `${value}%`}
            legends={compactMode ? [] : [
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 15,
                itemsSpacing: 0,
                itemWidth: 60,
                itemHeight: 18,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 10,
                symbolShape: 'circle'
              }
            ]}
            tooltip={({ datum }) => (
              <div
                style={{
                  padding: compactMode ? 6 : 12,
                  background: 'white',
                  borderRadius: 3,
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${datum.color}`,
                  fontSize: compactMode ? '10px' : 'inherit'
                }}
              >
                <strong style={{ color: datum.color }}>
                  {datum.label}
                </strong>
                <div>
                  <b>{datum.value}%</b> of total
                </div>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}