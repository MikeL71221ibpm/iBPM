import React, { useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

// Interface for patient visualization parameters
interface PatientVisualizationParams {
  patientId?: string;
}

// Define data types for visualization 
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms', description: 'Patient symptoms extracted from clinical notes.' },
  { id: 'diagnosis', name: 'Diagnoses', description: 'Diagnosed conditions identified in clinical documentation.' },
  { id: 'category', name: 'Diagnostic Categories', description: 'Broader diagnostic classifications of conditions.' },
  { id: 'hrsn', name: 'HRSN Indicators', description: 'Health-related social needs affecting patient health.' }
];

// API endpoint mapping - the category endpoint is actually 'diagnostic-category'
const API_ENDPOINTS = {
  symptom: 'symptom',
  diagnosis: 'diagnosis', 
  category: 'diagnostic-category', // This is the key fix - the endpoint is different from the ID
  hrsn: 'hrsn'
};

// Interface for scatter data
interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number; // Total value (intensity)
  frequency: number; // How many sessions this item appears in
  color?: string; // Optional: Row color - matches Y-axis label bullet color
  intensityCategory?: string; // Optional: Category for coloring ("highest", "high", etc.)
  intensityIndex?: number; // Optional: Index for colorBy scheme (0=highest, etc.)
  rowId?: string; // Optional: Internal use for processing - not used in final data
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

// Interface for API response data
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

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
  
  // Extremely high contrast theme
  highContrast: {
    name: "High Contrast",
    HIGHEST: '#000000',  // Highest - Black
    HIGH: '#555555',     // High - Dark gray - more distinct
    MEDIUM: '#999999',   // Medium - Medium gray - more distinct
    LOW: '#DDDDDD',      // Low - Light gray - more distinct
    LOWEST: '#FFFFFF',   // Lowest - White
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
};

// The ONLY color function to be used for bubbles - using direct hex codes
const getExactIridisColor = (normalizedValue: number, colorSet: any): string => {
  // Ensure we have valid inputs
  if (isNaN(normalizedValue) || normalizedValue === undefined || normalizedValue === null) {
    return colorSet?.LOWEST || '#EDF8FB'; // Default fallback color
  }
  
  // Ensure colorSet is valid
  if (!colorSet || typeof colorSet !== 'object') {
    // Fallback to a default color if colorSet is invalid
    return '#EDF8FB';
  }
  
  // Ensure extreme values are capped
  const capped = Math.max(0, Math.min(1, normalizedValue));
  
  // Apply logarithmic scaling for better distribution
  // This helps when there's a big gap between the max and other values
  const logScaled = Math.log(1 + capped * 9) / Math.log(10);
  
  // Using an even more dramatic threshold value scale for clearer visual differentiation
  if (logScaled >= 0.80 || capped >= 0.80) return colorSet.HIGHEST || '#994C99';
  if (logScaled >= 0.60 || capped >= 0.60) return colorSet.HIGH || '#8856A7';
  if (logScaled >= 0.40 || capped >= 0.40) return colorSet.MEDIUM || '#8C96C6';
  if (logScaled >= 0.20 || capped >= 0.20) return colorSet.LOW || '#B3CDE3';
  return colorSet.LOWEST || '#EDF8FB';
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// ScatterSection component for displaying a specific data type
const ScatterSection = ({ 
  dataType, 
  patientId,
  colorTheme,
  compact = true 
}: { 
  dataType: string; 
  patientId: string;
  colorTheme: string;
  compact?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Get the active color set based on the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // Fetch data from API
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: dataType === 'category' ? 10 : 3, // More retries for category data
    retryDelay: 1500,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  // Export functions
  const downloadAsExcel = useCallback(() => {
    if (!data) return;
    
    try {
      setIsDownloading(true);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([
        ['', ...data.columns], // Header row with empty cell for row headers
        ...data.rows.map(row => [
          row,
          ...data.columns.map(col => data.data[row]?.[col] || 0)
        ])
      ]);
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Symptom Data');
      
      // Save file
      XLSX.writeFile(wb, `patient_${patientId}_${dataType}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [data, dataType, patientId]);
  
  const downloadAsPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#fff',
        logging: false
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `patient_${patientId}_${dataType}_visualization.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [chartRef, dataType, patientId]);
  
  const downloadAsPDF = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(chartRef.current, {
        scale: 1.5,
        backgroundColor: '#fff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`patient_${patientId}_${dataType}_visualization.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [chartRef, dataType, patientId]);
  
  // Calculate row totals for adding counts to labels
  const rowTotals = React.useMemo(() => {
    if (!data || !data.rows || !data.data) return {};
    
    const totals: Record<string, number> = {};
    
    // Calculate total for each row across all columns
    data.rows.forEach(row => {
      if (!row) return;
      const rowData = data.data[row];
      if (!rowData) return;
      
      let rowTotal = 0;
      
      // Sum all values in this row
      data.columns.forEach(column => {
        if (!column) return;
        if (rowData[column] !== undefined && rowData[column] !== null) {
          const value = Number(rowData[column]);
          if (!isNaN(value)) {
            rowTotal += value;
          }
        }
      });
      
      totals[row] = rowTotal;
    });
    
    return totals;
  }, [data]);
  
  // Row colors mapping - each row gets its own color
  const rowColors = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    // Generate unique colors for each row - EXACT same colors as nivo-row-colors.tsx
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
      '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
      '#393b79', '#637939', '#8c6d31', '#843c39', '#7b4173',
      '#5254a3', '#8ca252', '#bd9e39', '#ad494a', '#a55194',
      '#6b6ecf', '#b5cf6b', '#e6ab02', '#a6761d', '#e7969c',
      '#7570b3', '#66a61e', '#a6761d', '#666666', '#1b9e77',
      '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
      '#a6761d', '#666666', '#e41a1c', '#377eb8', '#4daf4a',
      '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'
    ];
    
    // Map rows to colors
    const colorMap: Record<string, string> = {};
    data.rows.forEach((row, index) => {
      colorMap[row] = colors[index % colors.length];
      // Also add the variant with count in parentheses
      const rowWithCount = `${row} (${rowTotals[row] || 0})`;
      colorMap[rowWithCount] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [data, rowTotals]);
  
  // Extract max value for scaling bubbles - IMPORTANT: must do this before processing data
  const maxValue = React.useMemo(() => {
    if (!data || !data.data) return 1;
    
    // Find the actual maximum value in the data if not provided
    if (data.maxValue !== undefined && data.maxValue > 0) {
      console.log(`Using provided maxValue: ${data.maxValue} for ${dataType}`);
      return data.maxValue;
    }
    
    // Calculate maximum value manually by finding the highest value in the dataset
    let calculatedMax = 1; // Minimum default
    
    try {
      Object.keys(data.data).forEach(row => {
        const rowData = data.data[row];
        if (!rowData) return;
        
        Object.keys(rowData).forEach(col => {
          const value = Number(rowData[col]);
          if (!isNaN(value) && value > calculatedMax) {
            calculatedMax = value;
          }
        });
      });
      
      console.log(`Calculated maxValue: ${calculatedMax} for ${dataType}`);
      return calculatedMax;
    } catch (err) {
      console.error(`Error calculating max value: ${err}`);
      return 1;
    }
  }, [data, dataType]);
  
  // Process data into scatter plot format with sorting by total values
  const scatterData = React.useMemo(() => {
    if (!data) return [];
    
    // Default fallback for diagnostic categories if there's an error
    if (dataType === 'category' && (!data.rows || data.rows.length === 0)) {
      // Create basic placeholder data for now
      console.log("Creating fallback data for diagnostic categories");
      return [{
        id: 'frequency',
        data: []
      }];
    }
    
    // Check for valid data structure first
    if (!data.rows || !data.columns || !data.data || !Array.isArray(data.rows) || 
        !Array.isArray(data.columns) || typeof data.data !== 'object') {
      console.error(`Invalid data structure for ${dataType}:`, data);
      return [];
    }
    
    // We'll collect all points first
    const allPoints: ScatterDataPoint[] = [];
    
    // STEP 1: Sort rows by their total values (highest to lowest) - defined outside try block
    // Create a copy of rows with their total values for sorting
    const rowsWithTotals = data.rows.map(row => ({
      name: row,
      total: rowTotals[row] || 0
    }));
    
    // Sort rows by total values (highest to lowest)
    rowsWithTotals.sort((a, b) => b.total - a.total);
    
    // Create the sorted rows array - this is now accessible throughout the function
    const sortedRows = rowsWithTotals.map(item => item.name);
    
    // Create a new array of row labels with counts (sorted)
    const rowsWithCounts: string[] = sortedRows.map(row => {
      const count = rowTotals[row] || 0;
      return `${row} (${count})`;
    });
    
    try {
      // Log the maximum value being used
      console.log(`SCATTER PLOT using maxValue=${maxValue} for ${dataType}`);
      
      // Process each row (in sorted order) and column combination
      sortedRows.forEach((row, rowIndex) => {
        if (!row) return; // Skip invalid rows
        
        // Get the corresponding row label with count
        const rowWithCount = rowsWithCounts[rowIndex];
        
        data.columns.forEach((column) => {
          if (!column) return; // Skip invalid columns
          
          const rowData = data.data[row];
          if (!rowData) return; // Skip if row data is missing
          
          // Safely access value with explicit null checking
          let value = 0;
          if (rowData[column] !== undefined && rowData[column] !== null) {
            value = Number(rowData[column]);
            // Handle NaN case
            if (isNaN(value)) {
              value = 0;
            }
          }
          
          // Only create data points for non-zero values
          if (value > 0) {
            // NEW APPROACH: Differentiate between intensity and frequency
            // intensity = total value (already have this as 'value')
            // frequency = how many sessions this appears in (need to calculate this)
            
            // Count how many sessions this symptom appears in (for frequency)
            let sessionsCount = 0;
            Object.keys(data.data[row] || {}).forEach(col => {
              if (data.data[row][col] > 0) {
                sessionsCount++;
              }
            });
            
            // Assign color based on row (y-axis) 
            // Get the color for this row from rowColors
            let bubbleColor = rowColors[row] || '#6A0DAD';
            
            // For backwards compatibility, keep intensity categories 
            // but they're no longer used for coloring
            let intensityLevel = "";
            let intensityCategory: string;
            let intensityIndex: number;
            
            // Still calculate intensity level for tooltip information
            if (value >= 11) {
              intensityLevel = "HIGHEST";
              intensityCategory = "highest";
              intensityIndex = 0;
            } else if (value >= 8) {
              intensityLevel = "HIGH";
              intensityCategory = "high";
              intensityIndex = 1;
            } else if (value >= 5) {
              intensityLevel = "MEDIUM";
              intensityCategory = "medium";
              intensityIndex = 2;
            } else if (value >= 2) {
              intensityLevel = "LOW";
              intensityCategory = "low";
              intensityIndex = 3;
            } else {
              intensityLevel = "LOWEST";
              intensityCategory = "lowest";
              intensityIndex = 4;
            }
            
            // Store the data point but without the extra fields
            allPoints.push({
              rowId: row, // Keep track of which row this belongs to
              x: String(column),
              y: rowWithCount, // Use the row label with count
              size: value, // Total count (intensity)
              frequency: sessionsCount // How many sessions (frequency)
            });
          }
        });
      });
    } catch (err) {
      console.error(`Error processing ${dataType} data:`, err);
    }
    
    // Group data points by row for series
    const pointsByRow: Record<string, ScatterDataPoint[]> = {};
    allPoints.forEach(point => {
      const rowId = point.rowId as string;
      if (!pointsByRow[rowId]) {
        pointsByRow[rowId] = [];
      }
      
      // Create a clean point without the rowId field (not needed in the final data)
      const cleanPoint = {
        x: point.x,
        y: point.y,
        size: point.size,
        frequency: point.frequency
      };
      
      pointsByRow[rowId].push(cleanPoint);
    });
    
    // Convert to array of series objects in the same sorted order
    // Use sortedRows to maintain the correct order - important for consistent display
    const series = sortedRows
      .filter((rowId: string) => pointsByRow[rowId] && pointsByRow[rowId].length > 0) // Only include rows with data
      .map((rowId: string) => ({
        id: rowId, // This is the key for color mapping - must match a row name
        data: pointsByRow[rowId]
      }));
    
    // Return the array of sorted series
    return series.length > 0 ? series : [{ id: 'empty', data: [] }];
  }, [data, dataType, colorSet, rowTotals, maxValue]);
  
  // Empty color legend (removed as requested)
  const renderColorLegend = () => {
    return null;
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium">{displayName}</h3>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadAsExcel}
            disabled={isLoading || !data}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadAsPDF}
            disabled={isLoading || !data}
          >
            <File className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadAsPNG}
            disabled={isLoading || !data}
          >
            <FileImage className="h-3.5 w-3.5 mr-1" /> PNG
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            disabled={isLoading || !data}
          >
            Expand
          </Button>
        </div>
      </div>
      
      {/* Color legend */}
      {!isLoading && !error && data && renderColorLegend()}
      
      {/* Expanded view dialog */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col" aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>{displayName} - Full View</DialogTitle>
              <DialogDescription id="dialog-description">
                Expanded view of {displayName} visualization with additional details
              </DialogDescription>
            </DialogHeader>
            
            {data && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-2 bg-slate-50 border-b mb-4">
                  <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                  <p className="text-sm text-gray-500">
                    Showing {data.rows.length} items. Bubble size indicates occurrence count per session.
                  </p>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-2">
                        Hover over bubbles to see details
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={downloadAsExcel}
                        disabled={isDownloading}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={downloadAsPDF}
                        disabled={isDownloading}
                      >
                        <File className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={downloadAsPNG}
                        disabled={isDownloading}
                      >
                        <FileImage className="h-3.5 w-3.5 mr-1" /> PNG
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDialogOpen(false)}
                      >
                        Close
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
                      height: Math.max(25 * data.rows.length, 
                        dataType === 'hrsn' ? 400 : (
                          dataType === 'category' ? 1000 : (
                            dataType === 'diagnosis' ? 2000 : 2500
                          )
                        )
                      ) + 'px',
                      minHeight: '600px',
                      width: '100%'
                    }}>
                      <ScatterVisualization 
                        data={scatterData} 
                        rows={data.rows}
                        maxValue={maxValue}
                        compact={false}
                        colorSet={colorSet}
                        rowColors={rowColors}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data - Please try refreshing
          </div>
        ) : dataType === 'category' && (!data || !data.rows || data.rows.length === 0) ? (
          <div className="text-center py-4 text-amber-500 text-xs">
            No diagnostic categories available for this patient
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
              height: Math.max(22 * (data?.rows.length || 0), 
                dataType === 'hrsn' ? 250 : (
                  dataType === 'category' ? 750 : (
                    dataType === 'diagnosis' ? 1800 : 2300
                  )
                )
              ) + 'px',
              minHeight: '250px',
              width: '100%'
            }}>
              <ScatterVisualization 
                data={scatterData} 
                rows={data?.rows || []}
                maxValue={maxValue}
                compact={compact}
                colorSet={colorSet}
                rowColors={rowColors}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Scatter Visualization Component
const ScatterVisualization = ({ 
  data, 
  rows,
  maxValue,
  colorSet,
  rowColors = {},
  compact = false 
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  colorSet: any;
  rowColors?: Record<string, string>;
  compact?: boolean;
}) => {
  // For the tooltip - implementing the exact same approach as in nivo-row-colors.tsx
  const [tooltipData, setTooltipData] = React.useState<{
    x: string;
    y: string;
    size: number;     // Size represents the occurrence count in this specific session
    frequency: number; // Keep frequency as additional info (unique to this component)
    visible: boolean;
    color: string;
  } | null>(null);
  
  // Use refs to track the debounce timers
  const tooltipTimerRef = React.useRef<number | null>(null);
  const tooltipCleanupRef = React.useRef<number | null>(null);
  
  // Clean up timers on component unmount
  React.useEffect(() => {
    return () => {
      // Clear any pending timers when component unmounts
      if (tooltipTimerRef.current !== null) {
        window.clearTimeout(tooltipTimerRef.current);
      }
      if (tooltipCleanupRef.current !== null) {
        window.clearTimeout(tooltipCleanupRef.current);
      }
    };
  }, []);

  if (!data || data.length === 0 || rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Calculate margins based on the length of the row labels
  const maxLabelLength = Math.max(...rows.map(row => row.length));
  const leftMargin = Math.min(Math.max(8 * maxLabelLength, 100), compact ? 180 : 250);
  
  // Margins and styling
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: leftMargin } 
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  // Process the data - we don't need to modify the data for colors 
  // because we'll directly use rowColors lookup in the colors function
  const processedData = data.map(series => {
    return {
      id: series.id,
      data: series.data.map(point => {
        return {
          x: point.x,
          y: point.y,
          size: point.size,
          frequency: point.frequency,
          color: '' // Add empty color since it's marked as required by LSP
        };
      })
    };
  });
  
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Improved tooltip position at top center of chart */}
      {tooltipData && tooltipData.visible && (
        <div className="absolute top-0 left-0 right-0 flex justify-center h-auto" style={{ zIndex: 1000 }}>
          {/* Tooltip content */}
          <div 
            className="bg-white p-3 rounded-md shadow-lg border-2 max-w-[250px] mt-1"
            style={{ 
              borderColor: tooltipData.color || '#3B82F6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            <div className="flex justify-between items-center mb-1 pb-1 border-b">
              <div className="font-bold text-sm">Data Point</div>
              <button 
                onClick={() => setTooltipData(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                ✕
              </button>
            </div>
            <div className="text-xs my-1"><strong>Date:</strong> {tooltipData.x || 'Unknown'}</div>
            <div className="text-xs my-1"><strong>Item:</strong> {tooltipData.y || 'Unknown'}</div>
            <div className="text-xs my-1">
              <strong>Times mentioned in this session:</strong> {tooltipData.size}
              {tooltipData.size > 1 && (
                <div className="mt-1 text-xs text-amber-600">
                  This item was mentioned multiple times in this session
                </div>
              )}
            </div>
            {/* Additional frequency info (unique to this chart type) */}
            <div className="text-xs my-1">
              <strong>Present in sessions:</strong> {tooltipData.frequency}
            </div>
          </div>
        </div>
      )}
      <ResponsiveScatterPlot
        data={processedData}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{ type: 'point' }}
        axisTop={null}
        axisRight={null}
        animate={false}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: titleRotation,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 46,
          // Using CSS to make the axis sticky
          renderTick: (tick: any) => {
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                <line 
                  x1="0" 
                  x2="0" 
                  y1="0" 
                  y2="-5" 
                  style={{ stroke: '#777' }}
                />
                <g 
                  transform={`translate(0,1) rotate(${titleRotation})`} 
                  style={{ 
                    dominantBaseline: 'middle', 
                    textAnchor: 'end',
                    pointerEvents: 'none' // Prevents date labels from interfering with points
                  }}
                >
                  <text style={{ fill: '#333', fontSize: '10px', fontWeight: 'bold' }}>
                    {tick.value}
                  </text>
                </g>
              </g>
            );
          }
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (v: any) => {
            const label = String(v);
            if (compact && label.length > 20) {
              return label.substring(0, 18) + '...';
            }
            return label;
          },
          // Enhanced renderTick for colored circles
          renderTick: (tick: any) => {
            // Get the color for this row (without count in parentheses)
            const rowLabel = String(tick.value);
            const baseRowLabel = rowLabel.split(' (')[0]; // Extract base name (without count)
            const color = rowColors[rowLabel] || rowColors[baseRowLabel] || '#1f77b4';
            
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                <text
                  style={{
                    fill: '#333',
                    fontSize: '10px',
                    fontWeight: 'normal',
                    dominantBaseline: 'middle',
                    textAnchor: 'end'
                  }}
                  x={-8}
                  y={0}
                >
                  {tick.value}
                </text>
                <circle
                  r={3}
                  cx={-4}
                  cy={0}
                  style={{
                    fill: color,
                    stroke: 'white',
                    strokeWidth: 0.5
                  }}
                />
              </g>
            );
          }
        }}
        nodeSize={d => d.size <= 0 ? 0 : 3 + (d.size * 2)} 
        colors={(d) => {
          // Use row colors for consistent color mapping across the row
          const rowLabel = String(d.data.y); // y value holds the row label
          const baseRowLabel = rowLabel.split(' (')[0]; // Extract base name (without count)
          return rowColors[rowLabel] || rowColors[baseRowLabel] || '#1f77b4';
        }}
        blendMode="multiply"
        enableGridX={true}
        enableGridY={false}
        isInteractive={true}
        onMouseEnter={(node, event) => {
          // Clear any existing hide timer
          if (tooltipCleanupRef.current !== null) {
            window.clearTimeout(tooltipCleanupRef.current);
            tooltipCleanupRef.current = null;
          }
          
          // Set a tiny delay before showing tooltip for smoother UX
          if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
          }
          
          tooltipTimerRef.current = window.setTimeout(() => {
            const data = node.data;
            // Get the row color for consistent coloring
            const rowLabel = String(data.y);
            const baseRowLabel = rowLabel.split(' (')[0];
            const color = rowColors[rowLabel] || rowColors[baseRowLabel] || '#1f77b4';
            
            setTooltipData({
              x: data.x,
              y: data.y,
              size: data.size,
              frequency: data.frequency || 0,
              visible: true,
              color: color
            });
            
            tooltipTimerRef.current = null;
          }, 50);
        }}
        onMouseLeave={() => {
          // Clear show timer if it exists
          if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
          }
          
          // Set a small delay before hiding the tooltip
          // This prevents flicker when moving between points
          if (tooltipCleanupRef.current !== null) {
            window.clearTimeout(tooltipCleanupRef.current);
          }
          
          tooltipCleanupRef.current = window.setTimeout(() => {
            setTooltipData(null);
            tooltipCleanupRef.current = null;
          }, 300);
        }}
      />
    </div>
  );
};

// Main component that creates a dashboard for a patient
export default function NivoScatterViewThemed() {
  // Grab the patient ID from the URL
  const params = useParams<PatientVisualizationParams>();
  const patientId = params.patientId || '1'; // Default to patient 1 if not specified
  
  // State for controlling color theme
  const [selectedTheme, setSelectedTheme] = React.useState<string>('iridis');
  
  return (
    <Card className="w-full mb-12">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Patient {patientId} - Time-Based Visualization</CardTitle>
            <CardDescription>
              Interactive visualization of symptoms and conditions over time
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Color Theme:</span>
            <Select
              value={selectedTheme}
              onValueChange={setSelectedTheme}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a color theme" />
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
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScatterSection dataType="symptom" patientId={patientId} colorTheme={selectedTheme} />
        <ScatterSection dataType="diagnosis" patientId={patientId} colorTheme={selectedTheme} />
        <ScatterSection dataType="category" patientId={patientId} colorTheme={selectedTheme} />
        <ScatterSection dataType="hrsn" patientId={patientId} colorTheme={selectedTheme} compact />
      </CardContent>
    </Card>
  );
}