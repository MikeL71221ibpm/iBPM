// Last updated: May 9, 2025 - 6:41 PM
// Controls route: /nivo-heatmap-view

import React, { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowUpRight, Download, ChevronDown,
  File, FileImage, TableProperties, Grid3X3, RotateCw
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
// Make sure to use the right import for Nivo heatmap
// The API changed in newer versions, so we need to be careful with props
import { ResponsiveHeatMap } from '@nivo/heatmap';
// Import additional types to help with TypeScript errors
import type { DefaultHeatMapDatum, HeatMapSvgProps } from '@nivo/heatmap';
// Import patient session utilities
import { 
  getPatientIdFromSession,
  setPatientIdInSession,
  getFormattedPatientName,
  getFormattedPatientId,
  promptAndSetPatientId,
  clearAllSessionAndReload,
  debugSessionStorage,
  getPatientStatusFromSession,
  isPatientSelected,
  setPatientStatusInSession,
  getPatientIdentifier
} from '@/utils/patient-session-controlling-file-05_12_25';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// Define the parameters type
interface PatientVisualizationParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Nivo heatmap requires data in a specific format
interface CellData {
  id: string;
  [key: string]: any; // To allow for dynamic column keys
}

// All data types to display in order
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Define multiple color schemes with ENHANCED CONTRAST for better visibility
const COLOR_THEMES = {
  // Enhanced Iridis (purple-blue) theme with greater contrast
  iridis: {
    name: "Iridis (Purple-Blue)",
    HIGHEST: '#6A0DAD',  // Highest - Vibrant deep purple 
    HIGH: '#9370DB',     // High - Medium purple - more distinct
    MEDIUM: '#B19CD9',   // Medium - Light purple - clearly different 
    LOW: '#CCCCFF',      // Low - Very light purple - clearly different
    LOWEST: '#F8F8FF',   // Lowest - Almost white with slight purple
  },
  
  // Enhanced Viridis color scheme - colorblind friendly with more contrast
  viridis: {
    name: "Viridis (Colorblind-friendly)",
    HIGHEST: '#440154',  // Highest - Dark purple
    HIGH: '#31688E',     // High - Darker blue - more distinct
    MEDIUM: '#35B779',   // Medium - Brighter green - more distinct
    LOW: '#90D743',      // Low - Yellowy green - more distinct
    LOWEST: '#FDE725',   // Lowest - Bright yellow
  },
  
  // Enhanced Red-Blue (diverging) - also colorblind friendly
  redBlue: {
    name: "Red-Blue",
    HIGHEST: '#9E0142',  // Highest - Bright red
    HIGH: '#F46D43',     // High - Orange/salmon - more distinct
    MEDIUM: '#FFFFFF',   // Medium - White
    LOW: '#74ADD1',      // Low - Light blue - more distinct
    LOWEST: '#313695',   // Lowest - Dark blue
  },
  
  // Grayscale theme for printing or accessibility
  grayscale: {
    name: "Grayscale",
    HIGHEST: '#000000',  // Highest - Black
    HIGH: '#444444',     // High - Dark gray
    MEDIUM: '#777777',   // Medium - Medium gray
    LOW: '#BBBBBB',      // Low - Light gray
    LOWEST: '#EEEEEE',   // Lowest - Very light gray
  },
};

// Helper function to get Iridis purple-green-yellow-red color scale
const getIridisColor = (value: number, maxValue: number): string => {
  if (value === 0) return "#ffffff"; // White for zero values
  
  // Define colors in Iridis scale from lowest to highest
  const colors = [
    "#dbeafe", // Light blue for lowest values
    "#c7d2fe", // Lavender 
    "#a5b4fc", // Purple
    "#99f6e4", // Mint green
    "#86efac", // Light green
    "#fef08a", // Yellow
    "#fca5a5", // Light red
    "#f87171"  // Bright red for highest values
  ];
  
  // Calculate normalized value between 0 and 1
  const normalizedValue = value / maxValue;
  
  // Map to color index
  const colorIndex = Math.min(
    Math.floor(normalizedValue * colors.length),
    colors.length - 1
  );
  
  return colors[colorIndex];
};

// Format pivot data for Nivo heatmap using the correct format that Nivo expects
const formatForNivoHeatmap = (
  pivotData: PivotData | undefined, 
  maxRowsToShow: number = 30
): { data: any[]; maxValue: number } => {
  if (!pivotData || !pivotData.rows || !pivotData.columns || !pivotData.data) {
    // Return empty series format that Nivo expects
    return { 
      data: [{
        id: "Empty",
        data: []
      }], 
      maxValue: 0 
    };
  }
  
  // Process all rows to calculate sums
  const rowsWithSums = pivotData.rows.map(row => {
    const sum = pivotData.columns.reduce(
      (acc, col) => acc + (pivotData.data[row]?.[col] || 0), 
      0
    );
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top rows based on maxRowsToShow
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, maxRowsToShow)
    .map((item) => item.row);
  
  // Find the maximum value for scaling the colors
  let maxValue = 0;
  topRows.forEach(row => {
    pivotData.columns.forEach(col => {
      const value = pivotData.data[row]?.[col] || 0;
      maxValue = Math.max(maxValue, value);
    });
  });
  
  // Create data in the format Nivo expects - each row becomes a series
  // with data points for each column
  const nivoData = topRows.map((row, rowIndex) => {
    // Calculate total for this row
    const totalCount = pivotData.columns.reduce(
      (acc, col) => acc + (pivotData.data[row]?.[col] || 0), 
      0
    );
    
    // Create the series ID with rank, name, and total count
    const seriesId = `${rowIndex + 1}. ${row} (${totalCount})`;
    
    // Create data points for each column
    const dataPoints = pivotData.columns.map(column => {
      return {
        x: column,
        y: pivotData.data[row]?.[column] || 0
      };
    });
    
    // Return the series object in format Nivo expects
    return {
      id: seriesId,
      data: dataPoints
    };
  });
  
  return { data: nivoData, maxValue };
};

// Converts the pivot data to an Excel workbook
const createExcelWorkbook = (data: PivotData | undefined, title: string): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  
  if (!data || !data.rows || !data.columns) {
    // Create an empty worksheet if no data
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, title);
    return wb;
  }
  
  // Process rows with their sums for sorting
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Sort by sum (descending)
  const sortedRows = rowsWithSums.sort((a, b) => b.sum - a.sum).map(item => item.row);
  
  // Create header row with empty first cell + date columns
  const headers = ['Item', ...data.columns];
  
  // Create data rows
  const rows = sortedRows.map((row, index) => {
    // First column: index + name + total count
    const totalCount = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    const firstCol = `${index + 1}. ${row} (${totalCount})`;
    
    // Data cells
    const values = data.columns.map(col => data.data[row]?.[col] || 0);
    
    return [firstCol, ...values];
  });
  
  // Create worksheet and append to workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const columnWidths = [
    { wch: 50 }, // First column width for item names
    ...data.columns.map(() => ({ wch: 12 })) // Date column widths
  ];
  ws['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, title);
  return wb;
};

// Component for individual heatmap section
const HeatmapSection = ({ 
  dataType, 
  patientId, 
  colorTheme = 'iridis',
  compact = false 
}: { 
  dataType: string; 
  patientId: string; 
  colorTheme?: string;
  compact?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  
  // Endpoint for the data type
  const apiPath = dataType === 'category' ? 'diagnostic-category' : dataType;
  const endpoint = `/api/pivot/${apiPath}/${patientId}`;
  
  console.log(`HeatmapSection making API request to: ${endpoint} for patient: ${patientId}`);
  
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: true,
  });
  
  // Show all rows in both views
  const maxRowsToShow = 9999;
  
  // Format data for Nivo heatmap
  const { data: nivoData, maxValue } = formatForNivoHeatmap(data, maxRowsToShow);
  
  // Calculate height based on number of rows
  const chartHeight = compact 
    ? (dataType === 'hrsn' ? 200 : 400)
    : 600;
  
  // Handle downloads
  const handleDownload = (format: 'pdf' | 'png' | 'excel') => {
    if (!chartRef.current || !data) return;
    
    switch (format) {
      case 'pdf':
        html2canvas(chartRef.current, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm'
          });
          
          // Calculate aspect ratio to fit on page
          const imgWidth = 250;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          // Add title
          pdf.setFontSize(14);
          pdf.text(`${displayName} - Patient ${patientId}`, 10, 10);
          
          // Add image
          pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
          pdf.save(`patient-${patientId}-${dataType}.pdf`);
        });
        break;
        
      case 'png':
        html2canvas(chartRef.current, { 
          scale: 3, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `patient-${patientId}-${dataType}.png`;
          link.href = imgData;
          link.click();
        });
        break;
        
      case 'excel':
        const wb = createExcelWorkbook(data, displayName);
        XLSX.writeFile(wb, `patient-${patientId}-${dataType}.xlsx`);
        break;
    }
  };
  
  // Now using the global getPatientName function for consistency
  
  return (
    <div className="relative border rounded">
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
        <div>
          <h3 className="text-base font-medium">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {dataType === 'hrsn' 
              ? 'All 10 HRSN indicators (scrollable)' 
              : dataType === 'category' 
                ? 'All 34 categories (scrollable)'
                : dataType === 'diagnosis'
                  ? 'All 79 diagnoses (scrollable)'
                  : 'All 99 symptoms (scrollable)'
            }
          </p>
        </div>
        
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Download className="h-4 w-4" />
                <span className="sr-only">Download options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('png')}>
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('excel')}>
                Download Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ArrowUpRight className="h-4 w-4" />
                <span className="sr-only">Expand {displayName}</span>
              </Button>
            </DialogTrigger>
            <DialogContent 
                className="w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh]"
                aria-describedby={`${dataType}-dialog-description`}
              >
              <DialogHeader>
                <DialogTitle>
                  {displayName} - {getPatientName(patientId)} (ID: P{String(patientId).padStart(4, '0')})
                </DialogTitle>
                <p 
                  id={`${dataType}-dialog-description`} 
                  className="text-sm text-gray-500 mt-1"
                >
                  Full view of all {displayName.toLowerCase()} data showing frequency over time. 
                  Items are sorted by total frequency with darker cells indicating higher values.
                </p>
              </DialogHeader>
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-4 text-red-500">
                  Error loading {displayName.toLowerCase()} data. Please try again.
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="p-2 bg-slate-50 border-b mb-4">
                    <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                    <p className="text-sm text-gray-500">
                      Showing {data?.rows?.length || 0} items sorted by total frequency across all dates. 
                      Items are ranked 1-N with #1 being the most frequent overall.
                    </p>
                    
                    <div className="mt-2 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownload('pdf')}
                      >
                        Download PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownload('png')}
                      >
                        Download PNG
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownload('excel')}
                      >
                        Download Excel
                      </Button>
                    </div>
                  </div>
                  
                  <div 
                    className="flex-1 overflow-auto" 
                    style={{ 
                      height: '75vh',
                      maxHeight: '75vh'
                    }}
                    ref={chartRef}
                  >
                    <div style={{
                      height: Math.max(25 * nivoData.length, 
                        dataType === 'hrsn' ? 400 : (
                          dataType === 'category' ? 1000 : (
                            dataType === 'diagnosis' ? 2000 : 2500
                          )
                        )
                      ) + 'px',
                      minHeight: '600px',
                      width: '100%'
                    }}>
                      <HeatmapVisualization 
                        data={nivoData} 
                        maxValue={maxValue}
                        colorTheme={colorTheme}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data
          </div>
        ) : (
          <div 
            className="mt-1" 
            style={{ 
              height: dataType === 'hrsn' ? '170px' : '300px',
              overflowY: 'scroll', // Force scrollbar to match pivot table style
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }}
            ref={chartRef}
          >
            <div style={{
              height: Math.max(22 * nivoData.length, 
                dataType === 'hrsn' ? 250 : (
                  dataType === 'category' ? 750 : (
                    dataType === 'diagnosis' ? 1800 : 2300
                  )
                )
              ) + 'px',
              minHeight: '250px',
              width: '100%'
            }}>
              <HeatmapVisualization 
                data={nivoData} 
                maxValue={maxValue}
                colorTheme={colorTheme}
                compact={compact}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create a fallback component to handle empty data or error states
const EmptyHeatmap = ({ message = "No data available to display" }) => (
  <div className="text-center py-8 text-gray-500">
    {message}
  </div>
);

// Nivo Heatmap Visualization Component
const HeatmapVisualization = ({ 
  data, 
  maxValue, 
  colorTheme = 'iridis',
  compact = false 
}: { 
  data: any[]; // Accept any[] to handle the new format
  maxValue: number;
  colorTheme?: string;
  compact?: boolean;
}) => {
  // Data validation - if no data or empty array, show message
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <EmptyHeatmap />;
  }

  // Calculate margins and sizes based on compact mode
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: 180 } 
    : { top: 15, right: 40, bottom: 90, left: 220 };
  
  const cellHeight = compact ? 20 : 30;
  const titleRotation = -45;
  
  // Get a sample row to check format - we need different handling for different formats
  const sampleRow = data[0];
  
  // If data is missing expected properties, show message
  if (!sampleRow || !sampleRow.id) {
    return <EmptyHeatmap message="Invalid data format" />;
  }

  // Check if we're using the new format (with data property) or old format
  const isNewFormat = sampleRow.data && Array.isArray(sampleRow.data);
  
  if (isNewFormat) {
    // With the new format, we have series objects with data arrays
    // Create a basic Nivo heatmap from the data arrays
    // Define types for the data points
    interface DataPoint {
      x: string;
      y: number;
    }
    
    interface SeriesData {
      id: string;
      data: DataPoint[];
    }
    
    // First, extract all unique x values from the entire dataset
    const allXValues = new Set<string>();
    
    // Safety check for data
    if (!data || !Array.isArray(data)) {
      return <EmptyHeatmap message="Invalid data format" />;
    }
    
    // Safely extract values
    for (const series of data) {
      if (series && series.data && Array.isArray(series.data)) {
        for (const point of series.data) {
          if (point && point.x) {
            allXValues.add(point.x);
          }
        }
      }
    }
    
    // Convert to HeatMapDatum format that Nivo expects
    const heatmapData = data.map((series: SeriesData) => {
      if (!series || !series.id) {
        // Skip invalid series
        return { id: "missing", data: [] };
      }
      
      // Prepare the transformed row object
      const transformedRow: { id: string; data: { x: string; y: number }[] } = {
        id: series.id,
        data: []
      };
      
      // Add data points properly
      if (series.data && Array.isArray(series.data)) {
        // Convert to the format Nivo expects
        transformedRow.data = series.data
          .filter(point => point && point.x !== undefined)
          .map(point => ({ 
            x: point.x, 
            y: point.y 
          }));
      }
      
      return transformedRow;
    });
    
    // Get keys from all X values (column headers)
    const keys = Array.from(allXValues);
    
    // Now render the heatmap with the transformed data
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <ResponsiveHeatMap
          data={heatmapData}
          margin={margin}
          valueFormat={(value: number | null) => {
            if (value === undefined || value === null || value === 0) return '';
            return value.toString();
          }}
          indexBy="id"
          keys={keys}
          cellOpacity={1}
          cellHeight={cellHeight}
          cellBorderWidth={1}
          cellBorderColor="#ffffff"
          legends={[]} // Empty legends array to prevent legends from showing
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: titleRotation,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 36
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          colors={(cell) => {
            // Defensive null check for cell and cell.value
            if (!cell || cell.value === undefined || cell.value === null) return 'transparent';
            
            // Get value from cell
            const value = cell.value as number;
            // Return transparent for zero
            if (value === 0) return 'transparent';
            
            // Define the color ranges based on relative value
            const normalizedValue = value / maxValue;
            
            // Get the theme colors
            const themeColors = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.iridis;
            
            // Map the normalized value to the appropriate color
            if (normalizedValue > 0.8) return themeColors.HIGHEST;
            if (normalizedValue > 0.6) return themeColors.HIGH;
            if (normalizedValue > 0.4) return themeColors.MEDIUM;
            if (normalizedValue > 0.2) return themeColors.LOW;
            return themeColors.LOWEST;
          }}
          emptyColor="#ffffff"
          enableLabels={true}
          labelTextColor={(cell) => {
            // Defensive check
            if (!cell || cell.value === undefined || cell.value === null) return 'transparent';
            
            const value = cell.value as number;
            // No text for zero values
            if (value === 0) return 'transparent';
            
            // Use white text for darker cells, black for lighter cells
            const threshold = maxValue * 0.5;
            return value > threshold ? '#ffffff' : '#333333';
          }}
          hoverTarget="cell"
          animate={false}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: compact ? 8 : 10,
                }
              },
              legend: {
                text: {
                  fontSize: compact ? 10 : 12,
                  fontWeight: 'bold'
                }
              }
            },
            labels: {
              text: {
                fontSize: compact ? 9 : 11,
              }
            }
          }}
        />
      </div>
    );
  } else {
    // Fallback for old format - convert to format Nivo expects
    return <EmptyHeatmap message="Data format conversion needed" />;
  }
};

// Helper function to get a patient name based on ID - uses standardized utility
const getPatientName = (patientId: string | number): string => {
  // Add debug logging to help diagnose issues
  console.log("🔍 Heatmap getPatientName called with:", patientId, "type:", typeof patientId);
  
  // Use the standardized utility function for consistent patient name handling
  return getFormattedPatientName(patientId);
};

// Main component - displays all four heatmaps in a grid layout
export default function NivoHeatmapView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  
  // Use our standardized utility functions for patient data consistency
  const storedPatientId = getPatientIdFromSession();
  const storedPatientStatus = getPatientStatusFromSession();
  
  console.log("Retrieved from sessionStorage in heatmap view:", {
    patientId: storedPatientId,
    status: storedPatientStatus
  });
  
  // Make sure we're using the correct patient ID - PRIORITIZE sessionStorage over URL
  // NEVER convert to number - always keep as string
  // Only use stored ID if the patient is marked as "Selected", otherwise prioritize URL param
  const patientToDisplay = (storedPatientId && storedPatientStatus === "Selected") 
    ? storedPatientId 
    : (patientId || storedPatientId || '1018'); // Use 1018 as default fallback for testing
    
  // If the status wasn't set but we have a patient ID, set it now
  if (storedPatientId && !storedPatientStatus) {
    setPatientStatusInSession("Selected");
    console.log("✅ Updated missing status for existing patient:", storedPatientId);
  }
  console.log("Using patient ID for heatmap view:", patientToDisplay, "type:", typeof patientToDisplay);
  console.log("URL parameter patientId:", patientId);
  console.log("storedPatientId from sessionStorage:", storedPatientId);
  
  // Force refresh sessionStorage value if needed - use utility to ensure consistent format
  if (storedPatientId !== patientToDisplay) {
    console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
    setPatientIdInSession(patientToDisplay);
    debugSessionStorage(); // Log all session storage for debugging
  }
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-heatmap-view/${patientToDisplay}`);
    }
    
    // Force refresh sessionStorage value if needed for consistency across views
    if (storedPatientId !== patientToDisplay) {
      console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
      sessionStorage.setItem('selectedPatientId', String(patientToDisplay));
    }
  }, [patientId, patientToDisplay, setLocation, storedPatientId]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              {getPatientIdentifier(patientToDisplay, true)}

            </div>
            
            {/* Color theme selector */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium whitespace-nowrap">Color Theme:</span>
              <Select
                value={currentTheme}
                onValueChange={(value) => setCurrentTheme(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select color theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                    <SelectItem key={key} value={key}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through heatmap visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="flex gap-1.5 items-center">
              <Button 
                variant="outline" 
                className="whitespace-nowrap h-8 text-xs px-2 bg-gray-100" 
                onClick={() => promptAndSetPatientId(patientToDisplay)}
              >
                Set Session ID
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="whitespace-nowrap h-8 text-xs px-2"
                onClick={() => {
                  const gridRef = document.querySelector('.grid') as HTMLElement;
                  if (gridRef) {
                    html2canvas(gridRef, { 
                      scale: 2, 
                      useCORS: true,
                      logging: false,
                      allowTaint: true,
                      backgroundColor: '#ffffff'
                    }).then((canvas) => {
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'mm'
                      });
                      
                      // Calculate aspect ratio to fit on page
                      const imgWidth = 250;
                      const imgHeight = canvas.height * imgWidth / canvas.width;
                      
                      // Add title
                      pdf.setFontSize(14);
                      pdf.text(`Patient ${patientToDisplay} Heatmaps`, 10, 10);
                      
                      // Add image
                      pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
                      pdf.save(`patient-${patientToDisplay}-heatmaps.pdf`);
                    });
                  }
                }}
              >
                <File className="h-3 w-3 mr-1" />
                Export Grids to PDF
              </Button>
              
              {/* PNG export button removed as requested */}
              
              <Button 
                variant="outline" 
                className="whitespace-nowrap h-8 text-xs px-2"
                onClick={() => setLocation(`/nivo-scatter-view/${patientToDisplay}`)}
              >
                <TableProperties className="h-3 w-3 mr-1" />
                View Bubble Charts
              </Button>
              
              <Button 
                variant="outline" 
                className="whitespace-nowrap h-8 text-xs px-2"
                onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
              >
                <Grid3X3 className="h-3 w-3 mr-1" />
                View Pivot Tables
              </Button>
              
              <Button 
                variant="outline" 
                className="whitespace-nowrap h-8 text-xs px-2"
                onClick={() => window.location.reload()}
              >
                <RotateCw className="h-3 w-3 mr-1" />
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four heatmaps in a 2x2 grid - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <HeatmapSection 
                key={type.id} 
                dataType={type.id} 
                patientId={patientToDisplay}
                colorTheme={currentTheme}
                compact={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}