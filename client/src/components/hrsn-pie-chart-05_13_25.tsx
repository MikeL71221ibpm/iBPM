// HRSN Pie Chart Component - May 13, 2025
// This component creates pie charts for HRSN percentage distributions

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Maximize, FileDown, X } from "lucide-react";
import { ChartExportSection } from "@/components/chart-export-section";
import { useToast } from "@/hooks/use-toast";

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  // Removed temporary mappings - zip_code, veteran_status, education_level should use their actual field names
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
  count?: number; // Temporary property for sorting purposes
}

interface HrsnPieChartProps {
  data?: any[];
  dualSourceHrsnData?: {
    extractedInsights: Array<{
      category: string;
      count: number;
      percentage: number;
      dataSource: string;
      icon: string;
      title: string;
    }>;
    totalExtractedRecords: number;
    totalPatients: number;
  };
  title: string;
  fieldName: string;
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
  filterField?: string; // Field to filter by (e.g., "gender")
  filterValue?: string; // Value to filter for (e.g., "Male")
  colorScheme?: string;
  subtitle?: string;
  height?: number;
  compactMode?: boolean; // Flag for compact design with minimal padding
  showExtractedInsights?: boolean; // Flag to display extracted insights instead of customer data
}

export default function HrsnPieChart({
  data = [],
  dualSourceHrsnData,
  title,
  fieldName,
  filterField,
  filterValue,
  colorScheme = "blue", // Keep for backward compatibility
  subtitle,
  height = 350,
  compactMode = false,
  showExtractedInsights = false,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: HrsnPieChartProps) {
  const [pieData, setPieData] = useState<PieChartDataItem[]>([]);
  const { toast } = useToast();
  
  // Tooltip and toast state management
  const [tooltipState, setTooltipState] = useState({
    isVisible: false,
    content: '',
    timeout: null as NodeJS.Timeout | null
  });
  
  // Handle tooltip display with auto-hide after 3 seconds
  const showCenteredTooltip = useCallback((content: string) => {
    console.log("🎯 PIE CHART TOOLTIP HOVER: Showing tooltip -", content);
    
    // Clear existing timeout
    if (tooltipState.timeout) {
      clearTimeout(tooltipState.timeout);
    }
    
    // Set new tooltip with auto-hide
    const timeout = setTimeout(() => {
      setTooltipState(prev => ({ ...prev, isVisible: false, timeout: null }));
    }, 3000);
    
    setTooltipState({
      isVisible: true,
      content,
      timeout
    });
  }, [tooltipState.timeout]);
  
  // Handle toast notification for clicks
  const showBottomCenterToast = useCallback((content: string) => {
    console.log("🔔 PIE CHART CLICK TOAST: Showing toast -", content);
    toast({
      title: content,
      duration: 3000,
    });
  }, [toast]);
  
  // Close tooltip manually
  const closeTooltip = useCallback(() => {
    if (tooltipState.timeout) {
      clearTimeout(tooltipState.timeout);
    }
    setTooltipState(prev => ({ ...prev, isVisible: false, timeout: null }));
  }, [tooltipState.timeout]);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipState.timeout) {
        clearTimeout(tooltipState.timeout);
      }
    };
  }, [tooltipState.timeout]);
  
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
    // Add specific debugging for zip code charts
    if (fieldName === 'zip_code') {
      console.log(`🎯 ZIP CODE PIE CHART DEBUG - Title: "${title}", Data length: ${data?.length || 0}`);
      console.log(`🎯 ZIP CODE PIE CHART received data:`, data?.slice(0, 5)); // Show first 5 items
    }
    
    // Check if we should display extracted insights data instead of customer data
    if (showExtractedInsights && dualSourceHrsnData?.extractedInsights) {
      console.log(`🔍 Processing HRSN extracted insights for ${title}:`, dualSourceHrsnData.extractedInsights);
      
      // Map HRSN category to field name for filtering
      const hrsnCategoryMap: Record<string, string> = {
        'Financial': 'financial_status',
        'Housing': 'housing_insecurity', 
        'Transportation': 'access_to_transportation',
        'Food Security': 'food_insecurity',
        'Utility': 'utilities_insecurity',
        'Healthcare Access': 'healthcare_access',
        'Employment': 'employment_status',
        'Social Isolation': 'social_isolation',
        'Safety Issues': 'safety_concerns'
      };
      
      // Find matching HRSN category for this chart's field
      const matchingCategory = Object.entries(hrsnCategoryMap).find(([category, field]) => 
        field === fieldName
      );
      
      if (matchingCategory) {
        const [categoryName] = matchingCategory;
        const categoryData = dualSourceHrsnData.extractedInsights.find(insight => 
          insight.category === categoryName
        );
        
        if (categoryData) {
          // Create pie chart data for extracted insights
          const extractedPieData: PieChartDataItem[] = [
            {
              id: 'insights_detected',
              label: `🔍 ${categoryData.title} (${categoryData.count})`,
              value: categoryData.count,
              color: getColors()[0]
            },
            {
              id: 'no_insights',
              label: `No Issues Detected (${dualSourceHrsnData.totalPatients - categoryData.count})`,
              value: dualSourceHrsnData.totalPatients - categoryData.count,
              color: getColors()[1]
            }
          ];
          
          console.log(`🔍 Created extracted insights pie data for ${categoryName}:`, extractedPieData);
          setPieData(extractedPieData);
          return;
        }
      }
      
      // If no matching category found, show no data message
      console.log(`🔍 No extracted insights found for field: ${fieldName}`);
      setPieData([]);
      return;
    }
    
    // Regular customer data processing
    if (!data || data.length === 0) {
      setPieData([]);
      return;
    }
    
    try {
      // Check if we're receiving Yes/No data from standardized HRSN component
      const hasYesNoData = data.some(item => item.id === 'Yes' || item.id === 'No');
      
      if (hasYesNoData) {
        console.log(`🎯 Processing Yes/No data for ${title}:`, data);
        
        // Transform Yes/No data directly to pie chart format
        const pieChartData: PieChartDataItem[] = data.map((item, index) => ({
          id: item.id,
          label: `${item.id} (${item.value || item.count || 0})`,
          value: item.value || item.count || 0,
          color: getColors()[index % getColors().length]
        }));
        
        console.log(`🎯 Created pie chart data:`, pieChartData);
        setPieData(pieChartData);
        return;
      }
      
      // CRITICAL FIX: Use data directly - it's already filtered by parent component
      // The parent component has already applied search filters, so we trust that data
      const dataToProcess = data;
      
      console.log(`Processing ${title} pie chart: ${dataToProcess.length} records (already filtered by parent)`);
      
      // CRITICAL EMPTY DATA VALIDATION: Check if ALL values are null/undefined BEFORE converting to "Unknown"
      // This prevents the same issue as the categorical bar chart where null values get converted before validation
      let hasAnyActualData = false;
      dataToProcess.forEach((item: any) => {
        if (!item) return;
        
        // Enhanced field mapping to handle multiple data structures
        let value = getMappedFieldValue(item, fieldName);
        
        // If no value found through mapping, try direct field access
        if (value === undefined) {
          value = item[fieldName];
        }
        
        // Enhanced mapping for common HRSN fields using multiple possible field names
        if (value === undefined) {
          switch(fieldName) {
            case 'financial_status':
              value = item.financial_strain || item.financial_status || item.finances;
              break;
            case 'housing_insecurity':
              value = item.housing_insecurity || item.housing_status || item.housing;
              break;
            case 'food_insecurity':
              value = item.food_insecurity || item.food_status || item.food;
              break;
            case 'access_to_transportation':
            case 'transportation_needs':
              value = item.transportation_needs || item.access_to_transportation || item.transportation;
              break;
            case 'gender':
              value = item.gender || item.sex;
              break;
            case 'age_range':
              // Generate age range from numeric age if available
              if (item.age && typeof item.age === 'number') {
                if (item.age < 18) value = 'Under 18';
                else if (item.age >= 18 && item.age <= 25) value = '18-25';
                else if (item.age >= 26 && item.age <= 35) value = '26-35';
                else if (item.age >= 36 && item.age <= 50) value = '36-50';
                else if (item.age >= 51 && item.age <= 65) value = '51-65';
                else if (item.age >= 65) value = '65+';
                else value = '65+';
              } else {
                value = item.age_range || item.age_group;
              }
              break;
            case 'race':
              value = item.race || item.ethnicity;
              break;
            default:
              value = item[fieldName];
          }
        }
        
        // Check if we found any actual data (not null, undefined, or empty string)
        if (value !== null && value !== undefined && value !== '') {
          hasAnyActualData = true;
        }
      });
      
      // EMPTY DATA VALIDATION: If no actual data exists, return empty to trigger "No Data Available" display
      if (!hasAnyActualData) {
        console.log(`No actual data found for field: ${fieldName} - all values are null/undefined/empty`);
        setPieData([]);
        return;
      }
      
      // Track unique patient IDs for each value of the field
      const patientsByValue: Record<string, Set<string>> = {};
      
      // Process each patient record (now we know there's actual data)
      dataToProcess.forEach((item: any) => {
        if (!item) return;
        
        // Get patient ID
        const patientId = item.id || item.patient_id;
        if (!patientId) return;
        
        // Enhanced field mapping to handle multiple data structures
        let value = getMappedFieldValue(item, fieldName);
        
        // If no value found through mapping, try direct field access
        if (value === undefined) {
          value = item[fieldName];
        }
        
        // Enhanced mapping for common HRSN fields using multiple possible field names
        if (value === undefined) {
          switch(fieldName) {
            case 'financial_status':
              value = item.financial_strain || item.financial_status || item.finances;
              break;
            case 'housing_insecurity':
              value = item.housing_insecurity || item.housing_status || item.housing;
              break;
            case 'food_insecurity':
              value = item.food_insecurity || item.food_status || item.food;
              break;
            case 'access_to_transportation':
            case 'transportation_needs':
              value = item.transportation_needs || item.access_to_transportation || item.transportation;
              break;
            case 'gender':
              value = item.gender || item.sex;
              break;
            case 'age_range':
              // Generate age range from numeric age if available
              if (item.age && typeof item.age === 'number') {
                if (item.age < 18) value = 'Under 18';
                else if (item.age >= 18 && item.age <= 25) value = '18-25';
                else if (item.age >= 26 && item.age <= 35) value = '26-35';
                else if (item.age >= 36 && item.age <= 50) value = '36-50';
                else if (item.age >= 51 && item.age <= 65) value = '51-65';
                else if (item.age >= 65) value = '65+';
                else value = '65+';
              } else {
                value = item.age_range || item.age_group;
              }
              break;
            case 'race':
              value = item.race || item.ethnicity;
              break;
            default:
              value = item[fieldName];
          }
        }
        
        // NOW convert to "Unknown" if still no value (but only after we've confirmed there's some actual data)
        value = value || "Unknown";
        
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
      
      // If no data is found, set empty array and let the component handle the no-data state
      if (total === 0) {
        console.log(`No valid data found for field: ${fieldName}`);
        setPieData([]);
        return;
      }
      
      // Convert to pie chart data format
      let pieItems: PieChartDataItem[] = Object.entries(valueCounts)
        .map(([value, count], index) => ({
          id: value,
          label: value,
          value: Math.round((count / total) * 100), // Convert to percentage
          count: count, // Keep raw count for sorting
          color: getColors()[index % getColors().length]
        }))
        .sort((a, b) => (b.count || 0) - (a.count || 0)); // Sort by count descending
      
      // Apply top 25 filtering for zip codes to improve readability
      if (fieldName === 'zip_code') {
        const originalLength = pieItems.length;
        pieItems = pieItems.slice(0, 25);
        console.log(`Applied top 25 filter for zip_code: ${originalLength} → ${pieItems.length} items`);
      }
      
      // Recalculate percentages after filtering for accurate pie chart display
      if (fieldName === 'zip_code' && pieItems.length > 0) {
        const totalFiltered = pieItems.reduce((sum, item) => sum + (item.count || 0), 0);
        pieItems = pieItems.map(item => ({
          ...item,
          value: Math.round(((item.count || 0) / totalFiltered) * 100)
        }));
      }
      
      // Remove count property from final data
      const finalPieItems = pieItems.map(({ count, ...item }) => item);
      
      console.log(`Processed ${finalPieItems.length} items for ${fieldName} pie chart`);
      setPieData(finalPieItems);
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
              ? { top: 25, right: 5, bottom: 20, left: 5 } 
              : { top: 80, right: 10, bottom: 100, left: 10 }}
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
            enableArcLinkLabels={true}
            arcLinkLabelsSkipAngle={0}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLinkLabel={function(arc) { return String(arc.label); }}
            arcLabelsSkipAngle={0}
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
            onClick={(slice) => {
              const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
              showBottomCenterToast(content);
            }}
            onMouseEnter={(slice) => {
              const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
              showCenteredTooltip(content);
            }}
          />
        </div>
      </CardContent>
      {/* Add chart footer with export buttons when not in compact mode */}
      {!compactMode && downloadChartAsCSV && downloadChartAsExcel && downloadChartAsJson && printChart && getFullDataset && (
        <CardFooter className="pb-4 pt-0 flex justify-between items-center">
          <div className="flex gap-2">
            {/* Standard dialog with export options */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <FileDown className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[90vw]">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>
                    Export chart data in various formats
                  </DialogDescription>
                </DialogHeader>
                
                {/* Chart visualization in full dialog view */}
                <div className="flex justify-center my-4">
                  <div style={{ height: 400, width: '100%', maxWidth: 600 }}>
                    <ResponsivePie
                      data={pieData}
                      margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      borderWidth={1}
                      borderColor={{
                        from: 'color',
                        modifiers: [['darker', 0.2]]
                      }}
                      colors={{ datum: 'data.color' }}
                      arcLinkLabelsSkipAngle={0}
                      arcLinkLabelsTextColor="#333333"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLabelsSkipAngle={0}
                      arcLabelsTextColor="#000000"
                      arcLabel={function(arc) { return `${arc.value}%`; }}
                      legends={[]}
                      onClick={(slice) => {
                        const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
                        showBottomCenterToast(content);
                      }}
                      onMouseEnter={(slice) => {
                        const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
                        showCenteredTooltip(content);
                      }}
                    />
                  </div>
                </div>
                
                <ChartExportSection 
                  chartName={title}
                  downloadChartAsCSV={downloadChartAsCSV}
                  downloadChartAsExcel={downloadChartAsExcel}
                  downloadChartAsJson={downloadChartAsJson}
                  printChart={printChart}
                  getFullDataset={getFullDataset}
                />
              </DialogContent>
            </Dialog>

            {/* Fullscreen button for expanded chart view */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Maximize className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[90vw]">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                  {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
                </DialogHeader>
                
                <div className="flex justify-center my-6">
                  <div style={{ height: 500, width: '100%' }}>
                    <ResponsivePie
                      data={pieData}
                      margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      borderWidth={1}
                      borderColor={{
                        from: 'color',
                        modifiers: [['darker', 0.2]]
                      }}
                      colors={{ datum: 'data.color' }}
                      enableArcLinkLabels={true}
                      arcLinkLabelsSkipAngle={0}
                      arcLinkLabelsTextColor="#333333"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLinkLabel={function(arc) { return String(arc.label); }}
                      arcLabelsSkipAngle={0}
                      arcLabelsTextColor="#000000"
                      arcLabel={function(arc) { return `${arc.value}%`; }}
                      legends={[]}
                      onClick={(slice) => {
                        const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
                        showBottomCenterToast(content);
                      }}
                      onMouseEnter={(slice) => {
                        const content = `${slice.label}: ${slice.value}% (${slice.data.count || slice.value} patients)`;
                        showCenteredTooltip(content);
                      }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      )}
      
      {/* Centered Tooltip Component */}
      {tooltipState.isVisible && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none"
          style={{
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)'
          }}
        >
          <div className="bg-white/95 text-gray-800 px-4 py-3 rounded-lg shadow-2xl border-2 border-blue-400 relative max-w-sm">
            <button
              onClick={closeTooltip}
              className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 pointer-events-auto"
              style={{ fontSize: '12px', lineHeight: '1' }}
            >
              ✕
            </button>
            <div className="pr-4 text-sm font-medium">{tooltipState.content}</div>
          </div>
        </div>
      )}
    </Card>
  );
}