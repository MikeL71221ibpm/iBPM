// Last updated: May 17, 2025 - 11:38 PM
// HrsnPieChart v3.1 - Enhanced with theme support
// This is a v3.1 version that adds proper theme support functionality

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Share2 } from "lucide-react";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  "ethnicity": "race", // Temporarily map ethnicity to race until we have proper ethnicity data
  // "zip_code": "age_range", // Removed temporary mapping - now uses real zip code data with top 25 filtering
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
  showExportOptions?: boolean; // Show export, download, and print buttons
}

export default function HrsnPieChart({
  data = [],
  title,
  fieldName,
  filterField,
  filterValue,
  colorScheme = "blue", // Default fallback color scheme
  subtitle,
  height = 350,
  compactMode = false,
  showExportOptions = true // Default to showing export options for percentage charts
}: HrsnPieChartProps) {
  const [pieData, setPieData] = useState<PieChartDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Use global theme context
  const { currentTheme, colorSettings, displayMode } = useChartTheme();
  
  // Map from theme context to color scheme - direct function to ensure reactivity
  const getColorSchemeFromTheme = () => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'default',
      'dark': 'iridis',
      'muted': 'grayscale',
      'viridis': 'viridis'
    };
    return mapping[currentTheme] || colorScheme;
  };
  
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
  
  // Get colors for current scheme directly to ensure it's reactive to theme changes
  // BUGFIX: The key issue was using the function reference instead of calling the function
  const getColors = () => {
    const selectedScheme = getColorSchemeFromTheme();
    return colorSchemes[selectedScheme] || colorSchemes.blue;
  };
  
  // Export functions
  const handleExportToExcel = () => {
    // Create workbook with two sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Chart Summary
    const chartData = pieData.map(item => ({
      Category: item.label,
      "Percentage (%)": item.value,
    }));
    
    const chartWs = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, chartWs, "Chart Summary");
    
    // Sheet 2: Patient Details
    const patientDetails = data.map((patient: any) => ({
      "Patient ID": patient.id || patient.patient_id || "",
      "Name": patient.name || patient.patient_name || "",
      [fieldName]: getMappedFieldValue(patient, fieldName) || "Unknown",
      "Age Range": patient.age_range || "",
      "Gender": patient.gender || "",
      "Ethnicity": patient.ethnicity || patient.race || "",
    }));
    
    const patientWs = XLSX.utils.json_to_sheet(patientDetails);
    XLSX.utils.book_append_sheet(wb, patientWs, "Patient Details");
    
    // Generate and download file
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_chart_data.xlsx`);
  };
  
  const handleExportToCSV = () => {
    // Create CSV data with patient details
    const patientDetails = data.map((patient: any) => ({
      "Patient ID": patient.id || patient.patient_id || "",
      "Name": patient.name || patient.patient_name || "",
      [fieldName]: getMappedFieldValue(patient, fieldName) || "Unknown",
      "Age Range": patient.age_range || "",
      "Gender": patient.gender || "",
      "Ethnicity": patient.ethnicity || patient.race || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(patientDetails);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    // Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.csv`);
    link.click();
  };
  
  const handlePrintToPDF = async () => {
    if (!chartRef.current) return;
    
    try {
      // Capture the chart as an image
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: null,
        logging: false
      });
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(title, 15, 15);
      
      // Add subtitle if present
      if (subtitle) {
        pdf.setFontSize(12);
        pdf.text(subtitle, 15, 22);
      }
      
      // Add chart image
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 15, subtitle ? 30 : 25, 180, 120);
      
      // Add date and source info
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 160);
      pdf.text('Source: HRSN Behavioral Health Analytics', 15, 165);
      
      // Add data table
      pdf.setFontSize(12);
      pdf.text('Data Summary', 15, 175);
      
      let yPos = 185;
      pieData.forEach((item, index) => {
        pdf.text(`${item.label}: ${item.value}%`, 20, yPos);
        yPos += 7;
      });
      
      // Save PDF
      pdf.save(`${title.replace(/\s+/g, '_')}_chart.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };
  
  // Process data for pie chart - include currentTheme in dependencies
  // to ensure chart updates when theme changes
  useEffect(() => {
    setLoading(true);
    
    if (!data || data.length === 0) {
      setPieData([]);
      setLoading(false);
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
      
      // Special handling for zip_code field - apply top 25 filtering but show ZIP CODES not age ranges
      if (fieldName === 'zip_code') {
        console.log(`🎯 ZIP CODE PIE CHART: Processing zip code distribution with top 25 filtering`);
        
        // Track unique patient IDs for each ZIP CODE (not age range)
        const patientsByZipCode: Record<string, Set<string>> = {};
        
        // Process each patient record to count unique patients per zip code
        filteredData.forEach((item: any) => {
          if (!item) return;
          
          const patientId = item.id || item.patient_id;
          if (!patientId) return;
          
          const zipCode = item.zip_code || "Unknown";
          
          // Initialize the set if this is the first patient with this zip code
          if (!patientsByZipCode[zipCode]) {
            patientsByZipCode[zipCode] = new Set<string>();
          }
          
          // Add this patient to the set for this zip code
          patientsByZipCode[zipCode].add(patientId.toString());
        });
        
        // Convert patient sets to counts and get top 25
        const zipCodeCounts: Record<string, number> = {};
        Object.entries(patientsByZipCode).forEach(([zipCode, patientSet]) => {
          zipCodeCounts[zipCode] = patientSet.size;
        });
        
        // Apply top 25 filtering
        const top25ZipCodes = Object.entries(zipCodeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25);
        
        console.log(`🎯 ZIP CODE PIE CHART: Top 25 zip codes with patient counts:`, top25ZipCodes);
        
        // Calculate total for percentage calculation
        const total = top25ZipCodes.reduce((sum, [_, count]) => sum + count, 0);
        
        // Convert to pie chart data format
        const pieItems: PieChartDataItem[] = top25ZipCodes
          .map(([zipCode, count], index) => ({
            id: zipCode,
            label: `${zipCode} (${count} patients)`,
            value: Math.round((count / total) * 100), // Convert to percentage
            color: colorArray[index % colorArray.length]
          }));
        
        console.log(`🎯 ZIP CODE PIE CHART: Final zip code pie data:`, pieItems);
        setPieData(pieItems);
        setLoading(false);
        return;
      }
      
      // Regular processing for non-zip_code fields
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
        setLoading(false);
        return;
      }
      
      // Get the colors array directly from the current theme to ensure reactivity
      const colorArray = colorSchemes[getColorSchemeFromTheme()] || colorSchemes.blue;
      
      // Apply top 25 filtering for zip_code field to match heatmap behavior
      let sortedEntries = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
      
      if (fieldName === 'zip_code') {
        console.log(`🎯 ZIP CODE PIE CHART: Applying top 25 filter - ${sortedEntries.length} → 25 zip codes`);
        sortedEntries = sortedEntries.slice(0, 25);
      }

      // Convert to pie chart data format
      const pieItems: PieChartDataItem[] = sortedEntries
        .map(([value, count], index) => ({
          id: value,
          label: value,
          value: Math.round((count / total) * 100), // Convert to percentage
          color: colorArray[index % colorArray.length]
        }));
      
      console.log(`Processed ${pieItems.length} items for ${fieldName} pie chart`);
      setPieData(pieItems);
    } catch (error) {
      console.error("Error processing pie chart data:", error);
      setPieData([]);
    } finally {
      setLoading(false);
    }
  }, [data, fieldName, filterField, filterValue, currentTheme]);
  
  if (loading) {
    return (
      <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
        <CardHeader className={compactMode ? "p-1 pb-0" : "pb-2"}>
          <CardTitle className={compactMode ? "text-xs font-medium" : "text-lg font-medium"}>{title}</CardTitle>
          {subtitle && !compactMode && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className={`flex-1 ${compactMode ? 'p-1 pt-0' : ''}`}>
          <Skeleton className="w-full h-full rounded-md" />
        </CardContent>
      </Card>
    );
  }
  
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
      {showExportOptions && !compactMode && (
        <CardFooter className="flex justify-end gap-2 pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportToExcel}
            className="text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportToCSV}
            className="text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintToPDF}
            className="text-xs"
          >
            <Printer className="mr-1 h-3 w-3" />
            PDF
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}