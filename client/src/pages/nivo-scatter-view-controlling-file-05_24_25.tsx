// Last updated: May 24, 2025 - 9:05 PM
// Controls route: /nivo-scatter-view-themed
// UPDATES:
// - Removed intensity color legends (Highest, High, Medium, Low, Lowest) from visualizations

import React, { useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File, TableProperties, Grid3X3, RotateCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { calculateBubbleSize } from '@/lib/bubble-size-utils';
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

// Helper function for displaying patient name - uses standardized utility
const getPatientName = (patientId: string | number): string => {
  // Add debug logging to help diagnose issues
  console.log("🔍 Scatter getPatientName called with:", patientId, "type:", typeof patientId);
  
  // Use the standardized utility function for consistent patient name handling
  return getFormattedPatientName(patientId);
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
  const [isFullPageView, setIsFullPageView] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Get the active color set based on the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // Fetch data from API first (before export functions that use it)
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  
  console.log(`ScatterSection making API request to: /api/pivot/${apiEndpoint}/${patientId} for patient: ${patientId}`);
  
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: dataType === 'category' ? 10 : 3, // More retries for category data
    retryDelay: 1500,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  // Process data for scatter plot visualization
  const scatterData: ScatterGroupData[] = React.useMemo(() => {
    if (!data || !data.rows || !data.columns) {
      console.log("No data available for scatter plot", dataType);
      return [];
    }
    
    // Create a normalized dataset of just rows, columns, values
    // Find min and max values for normalization
    let maxValue = 0;
    
    // Create a flat list of all data values to find max
    const allValues: number[] = [];
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const val = data.data[row]?.[col] || 0;
        if (val > 0) allValues.push(val);
      });
    });
    
    // Find the max value - but exclude zero values from consideration
    maxValue = Math.max(...[0, ...allValues]);
    
    if (maxValue === 0) {
      console.log("Warning: Max value is 0, using default max value of 1");
      maxValue = 1; // Prevent division by zero
    }
    
    // Pre-calculate row totals and max total
    const rowTotals: Record<string, number> = {};
    let maxRowTotal = 0;
    
    data.rows.forEach(row => {
      let total = 0;
      data.columns.forEach(col => {
        total += data.data[row]?.[col] || 0;
      });
      rowTotals[row] = total;
      maxRowTotal = Math.max(maxRowTotal, total);
    });
    
    console.log("Row totals calculated:", rowTotals);
    console.log("Max row total:", maxRowTotal);
    
    // Now we can use these to create our scatter data
    // Group rows by their total value to create rows of similar intensity
    const valueGroups: Record<string, string[]> = {
      highest: [],
      high: [],
      medium: [],
      low: [],
      lowest: []
    };
    
    // Assign each row to a value group based on its total
    data.rows.forEach(row => {
      const total = rowTotals[row];
      const normalizedTotal = total / maxRowTotal; // Normalize to 0-1 range
      
      // Using similar thresholds as the color function
      if (normalizedTotal >= 0.80) valueGroups.highest.push(row);
      else if (normalizedTotal >= 0.60) valueGroups.high.push(row);
      else if (normalizedTotal >= 0.40) valueGroups.medium.push(row);
      else if (normalizedTotal >= 0.20) valueGroups.low.push(row);
      else valueGroups.lowest.push(row);
    });
    
    // Flat list of all data points
    const scatterPoints: ScatterDataPoint[] = [];
    
    // Create intensity indices for each value group for custom coloring
    const intensityIndices: Record<string, number> = {
      highest: 0,
      high: 1, 
      medium: 2,
      low: 3,
      lowest: 4
    };
    
    // Create color map for each value group
    const colorMap: Record<string, string> = {
      highest: colorSet.HIGHEST,
      high: colorSet.HIGH,
      medium: colorSet.MEDIUM,
      low: colorSet.LOW,
      lowest: colorSet.LOWEST
    };
    
    // Process each value group to create scatter points
    Object.entries(valueGroups).forEach(([intensityCategory, rows]) => {
      // Skip empty groups
      if (rows.length === 0) return;
      
      // Process each row in this group
      rows.forEach(row => {
        // Count the frequency of occurrences (sessions with non-zero values)
        let frequency = 0;
        data.columns.forEach(col => {
          if ((data.data[row]?.[col] || 0) > 0) {
            frequency++;
          }
        });
        
        // For each column (session date) create a data point
        data.columns.forEach(col => {
          const value = data.data[row]?.[col] || 0;
          
          // Skip zero values for cleaner visualization
          if (value === 0) return;
          
          // Create normalized value for bubble size and coloring
          const normalizedValue = value / maxValue;
          
          // Create a scatter point for this row-column combination
          scatterPoints.push({
            x: col, // Date (column)
            y: row, // Symptom/diagnosis/etc (row)
            size: value, // Absolute value for tooltip display
            frequency, // How many sessions this appears in (for tooltip)
            color: colorMap[intensityCategory], // Color from our color map
            intensityCategory, // Category name for legend (highest, high, etc)
            intensityIndex: intensityIndices[intensityCategory], // Index for color scheme
            rowId: row // Store row ID for filtering
          });
        });
      });
    });
    
    // Convert scatter points into the format needed by Nivo
    // Group by row (y value) to show one line per symptom/diagnosis
    const groupedByRow: Record<string, ScatterDataPoint[]> = {};
    
    scatterPoints.forEach(point => {
      // Initialize array if it doesn't exist
      if (!groupedByRow[point.y]) {
        groupedByRow[point.y] = [];
      }
      // Add this point to its row group
      groupedByRow[point.y].push(point);
    });
    
    // Convert the grouped data to the array format Nivo expects
    return Object.entries(groupedByRow).map(([row, points]) => ({
      id: row,
      data: points
    }));
    
  }, [data, dataType, colorSet]);
  
  // Function to determine the text for a tooltip label
  const getTooltipLabel = (point: any): string => {
    // If point is using the new data format with size and frequency
    if (point.data && typeof point.data.size === 'number' && typeof point.data.frequency === 'number') {
      return `Value: ${point.data.size} | Appears in ${point.data.frequency} sessions`;
    }
    
    // Fallback for simple point format
    return `Value: ${point.value || 0}`;
  };
  
  // Calculate row totals for sizing and ordering
  const rowTotals = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    const totals: Record<string, number> = {};
    
    data.rows.forEach(row => {
      // Initialize row total
      totals[row] = 0;
      
      // Sum all values in this row
      data.columns.forEach(column => {
        if (!column) return;
        if (data.data[row]?.[column] !== undefined && data.data[row][column] !== null) {
          const value = Number(data.data[row][column]);
          if (!isNaN(value)) {
            totals[row] += value;
          }
        }
      });
    });
    
    return totals;
  }, [data]);
  
  // Row colors mapping - each row gets its own color
  const rowColors = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    // Use colors based on the currently selected theme
    let themeColors;
    
    if (colorTheme === 'redBlue') {
      // Use red-blue color scheme
      themeColors = [
        COLOR_THEMES.redBlue.HIGHEST, 
        COLOR_THEMES.redBlue.HIGH,
        COLOR_THEMES.redBlue.MEDIUM,
        COLOR_THEMES.redBlue.LOW,
        COLOR_THEMES.redBlue.LOWEST
      ];
    } else if (colorTheme === 'viridis') {
      // Use viridis color scheme
      themeColors = [
        COLOR_THEMES.viridis.HIGHEST,
        COLOR_THEMES.viridis.HIGH,
        COLOR_THEMES.viridis.MEDIUM,
        COLOR_THEMES.viridis.LOW,
        COLOR_THEMES.viridis.LOWEST
      ];
    } else if (colorTheme === 'grayscale') {
      // Use grayscale color scheme
      themeColors = [
        COLOR_THEMES.grayscale.HIGHEST,
        COLOR_THEMES.grayscale.HIGH,
        COLOR_THEMES.grayscale.MEDIUM,
        COLOR_THEMES.grayscale.LOW,
        COLOR_THEMES.grayscale.LOWEST
      ];
    } else {
      // Default iridis color scheme
      themeColors = [
        COLOR_THEMES.iridis.HIGHEST,
        COLOR_THEMES.iridis.HIGH,
        COLOR_THEMES.iridis.MEDIUM,
        COLOR_THEMES.iridis.LOW,
        COLOR_THEMES.iridis.LOWEST
      ];
    }
    
    // Sort rows by total value to determine color assignment
    const sortedRows = [...(data.rows || [])].sort((a, b) => {
      return (rowTotals[b] || 0) - (rowTotals[a] || 0);
    });
    
    // Assign colors based on position in sorted list
    const colors: Record<string, string> = {};
    
    sortedRows.forEach((row, index) => {
      // Map row to a color from our theme, cycling through the colors if needed
      const colorIndex = index % themeColors.length;
      colors[row] = themeColors[colorIndex];
    });
    
    return colors;
  }, [data, rowTotals, colorTheme]);
  
  // For compact mode, limit the number of visible scatter groups
  const visibleData = React.useMemo(() => {
    if (compact && scatterData.length > 8) {
      return scatterData.slice(0, 8);
    }
    return scatterData;
  }, [scatterData, compact]);
  
  // Y-axis formatting
  const formatYAxis = (y: string) => {
    if (y.length <= 30) return y;
    return y.substring(0, 27) + '...';
  };
  
  // X-axis formatting (dates)
  const formatXAxis = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).substring(2)}`;
    } catch (e) {
      return dateStr;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="mt-4 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>
            Loading patient data...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading {displayName.toLowerCase()} data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    console.error(`Error loading ${dataType} data:`, error);
    return (
      <Card className="mt-4 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>
            Unable to load data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center min-h-[300px] bg-red-50">
          <div className="flex flex-col items-center text-center">
            <p className="mt-4 text-sm text-red-600 font-medium">
              Error loading {displayName.toLowerCase()} data.
            </p>
            <p className="mt-2 text-xs text-red-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || !visibleData.length) {
    return (
      <Card className="mt-4 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>
            No data available
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center min-h-[300px] bg-gray-50">
          <div className="flex flex-col items-center text-center">
            <p className="mt-4 text-sm text-gray-600 font-medium">
              No {displayName.toLowerCase()} data available for this patient.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Try selecting a different patient or data type.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate optimal chart height based on number of items to show
  // Compact mode gets fixed height, expanded gets height based on item count
  const chartHeight = compact 
    ? 500 
    : Math.max(500, 300 + Math.min(scatterData.length, 30) * 25);
  
  return (
    <>
      <Card className="mt-4 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <CardDescription>
                Patient {patientId} - {scatterData.length} items found
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={downloadAsExcel}
                disabled={isDownloading}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={downloadAsPNG}
                disabled={isDownloading}
              >
                <FileImage className="h-3.5 w-3.5 mr-1.5" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={downloadAsPDF}
                disabled={isDownloading}
              >
                <File className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setDialogOpen(true)}
              >
                <TableProperties className="h-3.5 w-3.5 mr-1.5" />
                Details
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div
            ref={chartRef}
            className="w-full rounded-md"
            style={{ height: chartHeight }}
          >
            <ResponsiveScatterPlot
              data={visibleData}
              margin={{ top: 60, right: 140, bottom: 70, left: 140 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'point' }}
              nodeSize={{ key: 'size', values: [8, 32], sizes: [4, 32] }}
              colors={(node: any) => node.data.color || '#93c5fd'}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: -45,
                format: formatXAxis,
                legend: 'Session Date',
                legendPosition: 'middle',
                legendOffset: 46,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: 0,
                format: formatYAxis,
                legend: 'Item',
                legendPosition: 'middle',
                legendOffset: -110,
              }}
              enableGridX={false}
              gridYValues={visibleData.map(d => d.id)}
              tooltip={({ node }) => (
                <div
                  style={{
                    background: 'white',
                    padding: '9px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.1)',
                    pointerEvents: 'none' // Prevent tooltip from interfering with mouse events
                  }}
                >
                  <div className="text-xs font-medium">{node.data.y}</div>
                  <div className="text-xs text-gray-500">Date: {formatXAxis(node.data.x)}</div>
                  <div className="text-xs text-gray-700">{getTooltipLabel(node)}</div>
                </div>
              )}
              useMesh={true}
              meshDetectionRadius={10} // Smaller radius for more precise tooltip control
              // No color legend needed
            />
          </div>
          
          {compact && scatterData.length > 8 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Showing 8 of {scatterData.length} items. 
                Click "Details" to view all items.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                View All Items
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{displayName} - Patient {patientId}</DialogTitle>
            <DialogDescription>
              Detailed visualization of {scatterData.length} items for this patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 overflow-hidden" style={{ height: '65vh' }}>
            <div className="h-full w-full">
              <ResponsiveScatterPlot
                data={scatterData}
                margin={{ top: 60, right: 140, bottom: 70, left: 180 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'point' }}
                nodeSize={{ key: 'size', values: [8, 32], sizes: [4, 32] }}
                colors={(node: any) => node.data.color || '#93c5fd'}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 40,
                  tickRotation: -45,
                  format: formatXAxis,
                  legend: 'Session Date',
                  legendPosition: 'middle',
                  legendOffset: 46,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 40,
                  tickRotation: 0,
                  format: formatYAxis,
                  legend: 'Item',
                  legendPosition: 'middle',
                  legendOffset: -150,
                }}
                enableGridX={false}
                gridYValues={scatterData.map(d => d.id)}
                tooltip={({ node }) => (
                  <div
                    style={{
                      background: 'white',
                      padding: '9px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.1)',
                      pointerEvents: 'none' // Prevent tooltip from interfering with mouse events
                    }}
                  >
                    <div className="text-xs font-medium">{node.data.y}</div>
                    <div className="text-xs text-gray-500">Date: {formatXAxis(node.data.x)}</div>
                    <div className="text-xs text-gray-700">{getTooltipLabel(node)}</div>
                  </div>
                )}
                useMesh={true}
                meshDetectionRadius={10} // More precise tooltip control
                // No legends - removed as requested
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAsExcel}
              disabled={isDownloading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAsPNG}
              disabled={isDownloading}
            >
              <FileImage className="h-4 w-4 mr-2" />
              Export PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAsPDF}
              disabled={isDownloading}
            >
              <File className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Grid layout component
const GridLayout = ({ patientId, colorTheme }: { patientId: string, colorTheme: string }) => {
  // For very small screens, stack charts in a column
  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {DATA_TYPES.map(type => (
        <ScatterSection
          key={type.id}
          dataType={type.id}
          patientId={patientId}
          colorTheme={colorTheme}
        />
      ))}
    </div>
  );
};

// Utility function to check if a value is a number
const isNumeric = (value: any): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

// Main component
export default function NivoScatterViewThemed() {
  // Extract patient ID from URL or session
  const { patientId: urlPatientId } = useParams<PatientVisualizationParams>();
  const [_, setLocation] = useLocation();
  
  // Get the stored patient ID from session
  const storedPatientId = getPatientIdFromSession();
  
  // Determine which patient ID to display
  const [patientToDisplay, setPatientToDisplay] = React.useState<string>(
    urlPatientId || storedPatientId || '1'
  );
  
  // Color theme state
  const [currentTheme, setCurrentTheme] = React.useState<string>('iridis');
  
  // State for controlling export options
  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  
  // When we have a URL patient ID that doesn't match sessionStorage,
  // update sessionStorage to match
  React.useEffect(() => {
    console.log("Patient ID handling effect running with:", { 
      urlPatientId, 
      storedPatientId, 
      patientToDisplay
    });
    
    // Synchronize when URL has a patient ID and it doesn't match sessionStorage
    if (urlPatientId && urlPatientId !== storedPatientId) {
      console.log("⚠️ URL patientId doesn't match sessionStorage, redirecting:", urlPatientId);
      
      // Update the session storage with the URL patient ID
      setPatientIdInSession(urlPatientId);
      
      // Update the state with the URL patient ID
      setPatientToDisplay(urlPatientId);
    }
    
    // If there's no URL patient ID but we have one in sessionStorage,
    // update the URL to include it
    else if (!urlPatientId && storedPatientId) {
      console.log("Updating URL to include patient ID:", storedPatientId);
      setLocation(`/nivo-scatter-view-themed/${storedPatientId}`);
    }
  }, [urlPatientId, storedPatientId, setLocation, patientToDisplay]);
  
  // Helper function to export the grid of charts as a PDF
  const exportGridAsPDF = async () => {
    try {
      setIsExporting(true);
      
      // Get all chart divs
      const chartDivs = document.querySelectorAll('.nivo-scatterplot');
      
      if (chartDivs.length === 0) {
        alert('No charts found to export');
        setIsExporting(false);
        return;
      }
      
      // Create a PDF with landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // For each chart, capture and add to PDF
      for (let i = 0; i < chartDivs.length; i++) {
        const chartDiv = chartDivs[i];
        
        // Skip divs with zero size (possibly hidden)
        if (chartDiv.offsetWidth === 0 || chartDiv.offsetHeight === 0) {
          continue;
        }
        
        // Get the chart's parent to include title
        const chartCard = chartDiv.closest('.card');
        const chartTitle = chartCard?.querySelector('.card-title')?.textContent || `Chart ${i+1}`;
        
        // If not the first page, add a new page
        if (i > 0) {
          pdf.addPage();
        }
        
        // Add chart title at the top of the page
        pdf.setFontSize(16);
        pdf.text(`Patient ${patientToDisplay} - ${chartTitle}`, 14, 15);
        pdf.setFontSize(12);
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
        
        // Get the chart container to capture
        const containerElement = chartDiv.parentElement;
        
        if (!containerElement) {
          console.error('Could not find chart container');
          continue;
        }
        
        try {
          // Use html2canvas to capture the chart
          const canvas = await html2canvas(containerElement, {
            scale: 2, // Higher scale for better quality
            backgroundColor: '#ffffff',
            logging: false
          });
          
          // Calculate position and size to fit on PDF page
          const imgData = canvas.toDataURL('image/png');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate scaling to fit nicely on the page with margins
          const margins = 20; // mm, margin on all sides
          const availableWidth = pageWidth - (margins * 2);
          const availableHeight = pageHeight - (margins * 2) - 15; // Minus space for title
          
          // Calculate aspect ratio and determine dimensions
          const imgWidth = availableWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // If the height is too large, scale down to fit
          const finalImgWidth = imgHeight > availableHeight ? 
            (availableHeight * imgWidth) / imgHeight : imgWidth;
          const finalImgHeight = imgHeight > availableHeight ?
            availableHeight : imgHeight;
          
          // Position in the center of available space
          const xPosition = (pageWidth - finalImgWidth) / 2;
          const yPosition = margins + 15; // Below the title
          
          // Add the image to the PDF
          pdf.addImage(imgData, 'PNG', xPosition, yPosition, finalImgWidth, finalImgHeight);
          
        } catch (imgErr) {
          console.error('Error capturing chart:', imgErr);
          // Continue to next chart even if this one fails
        }
      }
      
      // Save the PDF
      pdf.save(`patient_${patientToDisplay}_visualizations.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Ensure we scroll to top on patient change
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.log("📏 Fallback scroll to top executed");
      window.scrollTo(0, 0);
    }
  }, [patientToDisplay]);
  
  // Define the color thresholds for the visualizations
  // This will be used to ensure consistent coloring across all visualizations
  // The thresholds are defined in buckets based on the intensity value
  React.useEffect(() => {
    // Color thresholds for consistent legend and data point coloring
    const thresholds = {
      "0-1": COLOR_THEMES.iridis.LOWEST,
      "2-4": COLOR_THEMES.iridis.LOW,
      "5-7": COLOR_THEMES.iridis.MEDIUM,
      "8-10": COLOR_THEMES.iridis.HIGH,
      "11+": COLOR_THEMES.iridis.HIGHEST
    };
    console.log("INTENSITY COLOR THRESHOLDS:", thresholds);
  }, [patientToDisplay]);
  
  // Get the active color set - it will be passed to child components
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  // Log the current theme and color set for debugging
  console.log("Current theme in main component:", currentTheme);
  console.log("Active color set:", colorSet);
  
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Patient Visualization: 
              {getPatientIdentifier(patientToDisplay, true)}
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick overview of all patient data through bubble chart visualizations.
            </p>
          </div>
          
          {/* Color theme selector to the right of patient info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium whitespace-nowrap">Color Theme:</span>
            <Select
              value={currentTheme}
              onValueChange={setCurrentTheme}
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
        </div>
        
        {/* Export buttons row - standardized to match simplified-auto-pivot styling */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-1.5 items-center">
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2 bg-gray-100" 
              onClick={() => promptAndSetPatientId(patientToDisplay)}
            >
              Set Session ID
            </Button>
          </div>
          <div className="flex gap-1.5 items-center">
            <Button 
              variant="outline"
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={exportGridAsPDF}
              disabled={isExporting}
            >
              <File className="h-3 w-3 mr-1" />
              Export Grids to PDF
            </Button>
            
            <Button 
              variant="outline"
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={clearAllSessionAndReload}
            >
              Clear Session
            </Button>
            
            <Button 
              variant="outline"
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={debugSessionStorage}
            >
              Debug Session
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main visualization grid */}
      <GridLayout patientId={patientToDisplay} colorTheme={currentTheme} />
      
      {/* Bottom spacing */}
      <div className="h-16"></div>
    </div>
  );
}