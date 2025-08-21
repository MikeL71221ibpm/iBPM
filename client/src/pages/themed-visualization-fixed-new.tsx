import React, { useRef, useCallback, useState } from 'react';
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

// Interface for pivot data from API
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
  
  // Using threshold ranges for clearer differentiation
  if (logScaled >= 0.80 || capped >= 0.80) return colorSet.HIGHEST;
  if (logScaled >= 0.60 || capped >= 0.60) return colorSet.HIGH;
  if (logScaled >= 0.40 || capped >= 0.40) return colorSet.MEDIUM;
  if (logScaled >= 0.20 || capped >= 0.20) return colorSet.LOW;
  return colorSet.LOWEST;
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component - displays all four scatter plots in a grid layout
export default function ThemedVisualizationFixedNew() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = useState('iridis');
  
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
            <DataTypeCard 
              key={`${type.id}-${currentTheme}`} // Key forces remount when theme changes
              dataType={type.id} 
              patientId={patientToDisplay}
              currentTheme={currentTheme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Single data type card component
const DataTypeCard = ({ 
  dataType, 
  patientId,
  currentTheme
}: { 
  dataType: string; 
  patientId: string;
  currentTheme: string;
}) => {
  // Get the type information
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  const endpointName = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS];
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  console.log(`DataTypeCard mounted for ${dataType} with theme ${currentTheme}`);
  
  // Fetch the data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${endpointName}/${patientId}`],
  });
  
  // Setup state for dialog/expanded view
  const [dialogOpen, setDialogOpen] = useState(false);
  
  if (isLoading) {
    return (
      <Card className="h-[350px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
              <CardDescription className="text-xs">{typeInfo?.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="h-[350px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-destructive">Error loading data</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="h-[350px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full h-[350px] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
            <CardDescription className="text-xs">ID: P{patientId.padStart(4, '0')} | {data.rows.length} items</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
          >
            Expand
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-2 overflow-visible" style={{ height: 280 }}>
        <BubbleChart 
          data={data} 
          dataType={dataType}
          colorSet={colorSet}
        />
      </CardContent>
      
      {/* Dialog for expanded view */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{typeInfo?.name || dataType} for Patient {getPatientName(parseInt(patientId))}</DialogTitle>
            <DialogDescription>{typeInfo?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 h-[calc(90vh-120px)] pb-4 pt-2 overflow-auto">
            <BubbleChart 
              data={data} 
              dataType={dataType}
              colorSet={colorSet}
              expanded={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Bubble chart component
function BubbleChart({ 
  data, 
  dataType,
  colorSet,
  expanded = false
}: { 
  data: PivotData;
  dataType: string;
  colorSet: typeof COLOR_THEMES.iridis;
  expanded?: boolean;
}) {
  const [tooltipData, setTooltipData] = useState<{
    x: string;
    y: string;
    size: number;
    frequency: number;
    color: string;
  } | null>(null);
  
  console.log(`BubbleChart rendering for ${dataType} with theme ${colorSet.name}`);
  
  // Prepare the data for the scatter plot
  const scatterData = React.useMemo(() => {
    // Calculate row totals and max frequency
    const rowTotals: Record<string, number> = {};
    let maxFrequency = 1;
    
    data.rows.forEach(row => {
      let count = 0;
      data.columns.forEach(col => {
        if (data.data[row]?.[col] > 0) {
          count++;
        }
      });
      rowTotals[row] = count;
      if (count > maxFrequency) {
        maxFrequency = count;
      }
    });
    
    // Transform the data into a format suitable for Nivo
    const result: ScatterDataPoint[] = [];
    
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        
        if (value > 0) {
          // Count frequency (how many dates/columns this row appears in)
          const frequency = rowTotals[row] || 1;
          
          // Calculate normalized frequency for color intensity
          const normalizedFrequency = maxFrequency > 1 ? frequency / maxFrequency : 0;
          
          // Determine intensity category based on frequency
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
          
          // Calculate the color for this datapoint directly from theme
          const color = getThemeColor(normalizedFrequency, colorSet);
          
          // Push the properly colored data point
          result.push({
            x: col,
            y: `${row} (${frequency})`,
            size: value,
            frequency,
            color,
            intensityCategory,
            intensityIndex,
            rowId: row
          });
        }
      });
    });
    
    return [{ id: dataType, data: result }];
  }, [data, dataType, colorSet]);
  
  // Layout dimensions
  const margin = React.useMemo(() => ({
    top: 10,
    right: 10,
    bottom: expanded ? 160 : 120,
    left: expanded ? 300 : 200,
  }), [expanded]);
  
  // Font size based on expanded state
  const fontSize = expanded ? 11 : 9;
  
  return (
    <div 
      style={{ height: expanded ? '100%' : '280px', width: '100%', position: 'relative' }}
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
        data={scatterData}
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
            const frequency = parseInt(displayRow.match(/\((\d+)\)$/)?.[1] || '1');
            const normalizedFrequency = frequency / 10; // Assuming 10 is max expected frequency
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
                    maxWidth: expanded ? '280px' : '180px',
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
          return calculateBubbleSize(frequency);
        }}
        
        // Use the color that was calculated and assigned in data preprocessing
        colors={(d: any) => d.data?.color || '#888'}
        
        blendMode="normal" // Use normal blend mode to preserve colors
        useMesh={true}
        debugMesh={false}
        tooltip={({ node }) => {
          const { data: datum } = node;
          const value = datum.size || 0;
          const frequency = datum.frequency || 1;
          
          // Set the tooltip data
          setTooltipData({
            x: datum.x || 'Unknown',
            y: datum.y || 'Unknown',
            size: value,
            frequency,
            color: datum.color || '#3B82F6',
          });
          
          // Return null because we're using a custom tooltip outside the chart
          return null;
        }}
        onMouseLeave={() => {
          // Immediate tooltip dismissal on mouse leave from chart area
          setTooltipData(null);
        }}
        // Add mesh detection for more responsive tooltip control
        useMesh={true}
        meshDetectionRadius={8} // Smaller radius for precise control
      />
    </div>
  );
}