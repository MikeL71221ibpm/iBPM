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
import { calculateBubbleSize } from '@/lib/bubble-size-utils';

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
const getThemeColor = (normalizedValue: number, colorSet: any): string => {
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
  const [isFullPageView, setIsFullPageView] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Get the active color set based on the current theme - IMPORTANT: this creates a new reference
  // each time colorTheme changes, forcing downstream components to re-render
  const colorSet = React.useMemo(() => {
    const newColorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
    console.log(`ScatterSection for ${dataType} using theme: ${colorTheme}`, newColorSet);
    return newColorSet;
  }, [colorTheme, dataType]);

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
  
  // Track total occurrences per row for sizing and coloring
  const rowTotals = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    const totals: Record<string, number> = {};
    
    data.rows.forEach(row => {
      let total = 0;
      data.columns.forEach(col => {
        total += data.data[row]?.[col] || 0;
      });
      
      totals[row] = total;
      
      // Also add variant with count in parentheses - so coloring works for y axis labels too
      const rowWithCount = `${row} (${total})`;
      totals[rowWithCount] = total;
    });
    
    return totals;
  }, [data]);
  
  // Calculate the max frequency (how many dates/sessions an item appears in)
  const maxFrequency = React.useMemo(() => {
    if (!data || !data.rows) return 1;
    
    let max = 1;
    
    data.rows.forEach(row => {
      let count = 0;
      data.columns.forEach(col => {
        if ((data.data[row]?.[col] || 0) > 0) {
          count++;
        }
      });
      
      max = Math.max(max, count);
    });
    
    return max;
  }, [data]);
  
  // Prepare data for scatter plot with intensity information
  const scatterData = React.useMemo(() => {
    if (!data || !data.rows || !data.columns) {
      return [{ id: dataType, data: [] }];
    }
    
    console.log(`SCATTER PLOT using maxValue=${data.maxValue} for ${dataType}`);
    
    const result: ScatterDataPoint[] = [];
    
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        
        if (value > 0) {
          // Count frequency (how many dates/columns this row appears in)
          let frequency = 0;
          data.columns.forEach(innerCol => {
            if ((data.data[row]?.[innerCol] || 0) > 0) {
              frequency++;
            }
          });
          
          // Calculate normalized value for color intensity (0-1)
          const normalizedValue = data.maxValue > 0 ? value / data.maxValue : 0;
          const normalizedFrequency = maxFrequency > 1 ? frequency / maxFrequency : 0;
          
          // Determine intensity category for this point based on frequency
          const frequencyPercentage = frequency / maxFrequency;
          
          // Determine intensity category for this point based on frequency
          let intensityCategory: string;
          let intensityIndex: number;
          
          if (frequency >= 10) {
            intensityCategory = "HIGHEST";
            intensityIndex = 0;
          } else if (frequency >= 8) {
            intensityCategory = "HIGH";
            intensityIndex = 1;
          } else if (frequency >= 5) {
            intensityCategory = "MEDIUM";
            intensityIndex = 2;
          } else if (frequency >= 2) {
            intensityCategory = "LOW";
            intensityIndex = 3;
          } else {
            intensityCategory = "LOWEST";
            intensityIndex = 4;
          }
          
          // Calculate the color from the theme colors
          const themeColor = getThemeColor(normalizedFrequency, colorSet);
          console.log(`Applied ${colorTheme} theme color ${themeColor} for row with frequency ${frequency}`);
          
          result.push({
            x: col,
            y: `${row} (${rowTotals[row] || 0})`,
            size: value,
            frequency,
            color: themeColor,
            intensityCategory,
            intensityIndex,
            rowId: row
          });
        }
      });
    });
    
    return [{ id: dataType, data: result }];
  }, [data, dataType, colorSet, rowTotals, data?.maxValue, maxFrequency, colorTheme]);
  
  const expandVisualization = () => {
    setDialogOpen(true);
  };

  // Download functions
  const downloadAsExcel = () => {
    if (!data || !data.rows || !data.columns) return;
    setIsDownloading(true);
    
    try {
      // Create a new workbook and add a worksheet
      const workbook = XLSX.utils.book_new();
      
      // Convert data to a format suitable for Excel
      const excelData: any[][] = [];
      
      // Header row with date columns
      const headerRow = ['Item', ...data.columns];
      excelData.push(headerRow);
      
      // Data rows
      data.rows.forEach(row => {
        const dataRow: any[] = [row];
        data.columns.forEach(col => {
          dataRow.push(data.data[row]?.[col] || 0);
        });
        excelData.push(dataRow);
      });
      
      // Create worksheet from data
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, displayName);
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `patient_${patientId}_${dataType}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const downloadAsPNG = async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Use html2canvas to capture the chart
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `patient_${patientId}_${dataType}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const downloadAsPDF = async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Use html2canvas to capture the chart
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false
      });
      
      // Create PDF with appropriate dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`patient_${patientId}_${dataType}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const dialogHeight = isFullPageView ? 'calc(90vh)' : 'calc(70vh)';
  
  // Empty data handling
  const hasData = scatterData[0].data.length > 0;
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <CardTitle className="text-base font-bold">
            {displayName}
          </CardTitle>
          <CardDescription className="text-xs">
            Loading {dataType} data...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex justify-center items-center" style={{ height: compact ? 300 : 400 }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <CardTitle className="text-base font-bold">
            {displayName}
          </CardTitle>
          <CardDescription className="text-xs text-red-500">
            Error loading {dataType} data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 text-center text-sm">
          <p className="text-red-500 mb-2">Failed to load visualization data</p>
          <p className="text-xs text-muted-foreground">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!hasData) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <CardTitle className="text-base font-bold">
            {displayName}
          </CardTitle>
          <CardDescription className="text-xs">
            No {dataType} data available for this patient
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex justify-center items-center" style={{ height: compact ? 300 : 400 }}>
          <div className="text-center text-muted-foreground">
            <p className="mb-2">No data points to display</p>
            <p className="text-xs">Try selecting a different patient or data type</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render the scatter plot
  return (
    <div>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold">
                {displayName}
              </CardTitle>
              <CardDescription className="text-xs">
                Patient ID: {patientId}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={expandVisualization}
              >
                Expand
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent 
          className="p-0 pt-2 overflow-visible" 
          style={{ height: compact ? 300 : 500 }}
          ref={chartRef}
        >
          <BubbleChart 
            data={scatterData} 
            rows={data?.rows || []}
            maxValue={data?.maxValue || 0}
            colorSet={colorSet}
            compact={compact}
          />
        </CardContent>
      </Card>
      
      {/* Expanded view dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-screen-xl w-[90vw]" style={{ height: dialogHeight }}>
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>{displayName} - Patient {getPatientName(parseInt(patientId))}</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsFullPageView(!isFullPageView)}
                >
                  {isFullPageView ? 'Standard View' : 'Full Page View'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadAsExcel}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                  )}
                  Export as Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadAsPNG}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileImage className="h-4 w-4 mr-1" />
                  )}
                  Export as PNG
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadAsPDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <File className="h-4 w-4 mr-1" />
                  )}
                  Export as PDF
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription className="flex justify-between items-center">
              <span>
                {DATA_TYPES.find(type => type.id === dataType)?.description || ''}
              </span>
              <span className="text-sm text-muted-foreground">
                Patient ID: P{patientId.padStart(4, '0')}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-full overflow-auto">
            <BubbleChart 
              data={scatterData} 
              rows={data?.rows || []}
              maxValue={data?.maxValue || 0}
              colorSet={colorSet}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Bubble chart component - separated for reuse
// Remove memo to ensure it always re-renders when props change
const BubbleChart = ({ 
  data, 
  rows,
  maxValue,
  colorSet,
  compact = false 
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  colorSet: any;
  compact?: boolean;
}) => {
  // For the tooltip - implementing the exact same approach as in nivo-row-colors.tsx
  const [tooltipData, setTooltipData] = React.useState<{
    x: string;
    y: string;
    size: number;
    frequency: number;
    color: string;
  } | null>(null);
  
  // The card has padding, so we adjust margins based on compact view
  const margin = React.useMemo(() => ({
    top: 10,
    right: 10,
    bottom: compact ? 120 : 160,
    left: compact ? 200 : 300,
  }), [compact]);
  
  // Calculate a dynamic bottom margin based on the number of columns
  const numColumns = React.useMemo(() => {
    if (!data || !data[0] || !data[0].data) return 0;
    
    const columns = new Set<string>();
    data[0].data.forEach(point => {
      if (point.x) columns.add(point.x);
    });
    
    return columns.size;
  }, [data]);

  // Process the data to include theme-based coloring
  const processedData = React.useMemo(() => {
    console.log(`BubbleChart processing data with color set:`, colorSet);
    
    // Force re-calculation of colors each time the theme changes
    return data.map(series => {
      return {
        id: series.id,
        data: series.data.map(point => {
          // Get the normalized frequency value for proper coloring
          const frequency = point.frequency || 1;
          const maxFreq = Math.max(...series.data.map(p => p.frequency || 1));
          const normalizedFrequency = maxFreq > 1 ? frequency / maxFreq : 0;
          
          // Calculate the color directly from the theme set
          const themeColor = getThemeColor(normalizedFrequency, colorSet);
          
          console.log(`Recoloring point with frequency ${frequency} to ${themeColor} using theme ${colorSet.name}`);
          
          return {
            ...point,
            // Override the color with the newly calculated one
            color: themeColor
          };
        }),
      };
    });
  }, [data, colorSet]);
  
  // Define font sizes based on compact mode
  const fontSize = compact ? 9 : 10;
  
  return (
    <div 
      style={{ height: '100%', width: '100%', position: 'relative' }}
      onMouseLeave={() => {
        // Clear tooltip when mouse leaves the entire chart container
        setTooltipData(null);
      }}
    >
      {/* Tooltip */}
      {tooltipData && (
        <div
          style={{
            position: 'absolute',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #eee',
            zIndex: 100,
            pointerEvents: 'none',
            fontSize: '12px',
            maxWidth: '250px',
            left: 10, 
            top: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: tooltipData.color,
                marginRight: '8px',
              }}
            />
            <div style={{ fontWeight: 600 }}>{tooltipData.y}</div>
          </div>
          <div>Date: {tooltipData.x}</div>
          <div>Frequency: {tooltipData.frequency} occurrences</div>
          <div>Value: {tooltipData.size}</div>
        </div>
      )}
      
      {/* Nivo scatterplot */}
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
          tickRotation: 45,
          renderTick: (tick) => {
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                <line stroke="#ccc" strokeWidth={1} y1={0} y2={5} />
                <text
                  textAnchor="start"
                  dominantBaseline="text-before-edge"
                  transform="translate(0,7)rotate(45)"
                  style={{
                    fontSize: `${fontSize}px`,
                    fill: '#666',
                  }}
                >
                  {tick.value}
                </text>
              </g>
            );
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          renderTick: (tick) => {
            // Get the color for this row from the color scheme
            const displayRow = String(tick.value);
            const baseRow = displayRow.split(' (')[0]; // Remove any count suffix
            const frequency = parseInt(displayRow.match(/\((\d+)\)$/)?.[1] || '1');
            
            // Determine normalized frequency value for coloring
            const normalizedFrequency = frequency / 10; // Assuming 10 is max expected frequency
            
            // Get color from theme based on frequency
            const color = getThemeColor(normalizedFrequency, colorSet);
            
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                {/* Line tick mark */}
                <line 
                  x1="0" 
                  y1="0" 
                  x2="-5" 
                  y2="0" 
                  stroke="#ccc" 
                  strokeWidth={1} 
                />
                
                {/* Colored bullet point */}
                <circle
                  cx="-15"
                  cy="0"
                  r="4"
                  fill={color}
                />
                
                {/* Label text */}
                <text
                  x="-25"
                  y="0"
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fontSize: `${fontSize}px`,
                    fill: '#666',
                    maxWidth: compact ? '180px' : '280px',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {tick.value}
                </text>
              </g>
            );
          },
        }}
        nodeSize={(d: any) => {
          // Get the frequency for proper sizing
          const frequency = d.data?.frequency || 1;
          console.log(`Calculating node size for data:`, d.data);
          const size = calculateBubbleSize(frequency);
          if (frequency > 1) {
            console.log(`Node with frequency ${frequency} gets size ${size} from standardized bubble size utility`);
          }
          return size;
        }}
        
        // Use the color that was calculated and assigned in data preprocessing
        colors={(d: any) => {
          return d.data?.color || '#888';
        }}
        
        blendMode="normal" // Use normal blend mode to preserve colors
        useMesh={true}
        debugMesh={false}
        tooltip={({ node }) => {
          const { data: datum } = node;
          const value = datum.size || 0;
          const frequency = datum.frequency || 1;
          const seriesId = datum.y || 'Unknown';
          
          // Use the proper color for the tooltip
          const color = datum.color || '#3B82F6';
          
          setTooltipData({
            x: datum.x || 'Unknown',
            y: datum.y || 'Unknown',
            size: value,
            frequency,
            color,
          });
          
          // Return null because we're using a custom tooltip outside the chart
          return null;
        }}
        onMouseLeave={() => {
          // Immediate tooltip dismissal on mouse leave from chart area
          setTooltipData(null);
        }}
        // Add mouse move tracking to make tooltip more responsive to mouse movement
        useMesh={true}
        meshDetectionRadius={8} // Smaller detection radius for more precise tooltip control
      />
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function ThemedVisualizationNew() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Global export functions for the entire grid
  const exportGridAsPDF = useCallback(async () => {
    if (!gridRef.current) return;
    
    try {
      setIsExporting(true);
      
      // Use html2canvas to capture the entire grid
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        windowWidth: gridRef.current.scrollWidth,
        windowHeight: gridRef.current.scrollHeight,
        width: gridRef.current.scrollWidth,
        height: gridRef.current.scrollHeight
      });
      
      // Create PDF with appropriate dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`patient_${patientToDisplay}_full_dashboard.pdf`);
    } catch (err) {
      console.error('Error generating grid PDF:', err);
    } finally {
      setIsExporting(false);
    }
  }, [gridRef, patientToDisplay]);
  
  const exportGridAsPNG = useCallback(async () => {
    if (!gridRef.current) return;
    
    try {
      setIsExporting(true);
      
      // Use html2canvas to capture the entire grid
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        windowWidth: gridRef.current.scrollWidth,
        windowHeight: gridRef.current.scrollHeight,
        width: gridRef.current.scrollWidth,
        height: gridRef.current.scrollHeight
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `patient_${patientToDisplay}_full_dashboard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating grid PNG:', err);
    } finally {
      setIsExporting(false);
    }
  }, [gridRef, patientToDisplay]);

  // Get the active color set
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  console.log(`Using theme: ${currentTheme} with color set:`, colorSet);

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header section with patient info and color theme to the right */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Patient {getPatientName(parseInt(patientToDisplay))} <span className="text-muted-foreground">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Quick overview of all patient data through bubble chart visualizations.
            </p>
          </div>
          
          {/* Color theme selector to the right of patient info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium whitespace-nowrap">Color Theme:</span>
            <Select
              value={currentTheme}
              onValueChange={(value) => {
                console.log(`Theme changed to: ${value}`);
                setCurrentTheme(value);
              }}
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
        
        {/* Export buttons row */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={exportGridAsPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <File className="h-4 w-4 mr-1" />
              )}
              Export Grids to PDF
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={exportGridAsPNG}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4 mr-1" />
              )}
              Export Grids to PNG
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
            >
              View Pivot Tables
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation(`/nivo-heatmap-view/${patientToDisplay}`)}
            >
              View Heatmaps
            </Button>
          </div>
        </div>
        
        {/* Display all four scatter plots in a 2x2 grid - always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={gridRef}>
          {DATA_TYPES.map((type) => (
            <ScatterSection 
              key={`${type.id}-${currentTheme}`} // Add theme to key to force remount when theme changes
              dataType={type.id} 
              patientId={patientToDisplay}
              colorTheme={currentTheme}
              compact={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}