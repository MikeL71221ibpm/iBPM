import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
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

// Define multiple color schemes with EXTREMELY HIGH CONTRAST for better visibility
const COLOR_THEMES = {
  // Enhanced Iridis (purple-blue) theme with MAXIMUM contrast
  iridis: {
    name: "Iridis (Purple)",
    HIGHEST: '#4B0082',  // Highest - Indigo (dark purple) 
    HIGH: '#8A2BE2',     // High - Bright purple (blueviolet)
    MEDIUM: '#BA55D3',   // Medium - Medium orchid purple
    LOW: '#DA70D6',      // Low - Light orchid purple
    LOWEST: '#E6E6FA',   // Lowest - Lavender with more visible tint
  },
  
  // Bold color scheme - extremely vivid and distinct colors
  bold: {
    name: "Bold Colors",
    HIGHEST: '#FF0000',  // Highest - Pure red
    HIGH: '#FFA500',     // High - Pure orange
    MEDIUM: '#FFFF00',   // Medium - Pure yellow
    LOW: '#00FF00',      // Low - Pure green
    LOWEST: '#1E90FF',   // Lowest - Dodger blue
  },
  
  // Super high contrast theme (max black to white)
  highContrast: {
    name: "High Contrast",
    HIGHEST: '#000000',  // Highest - Black
    HIGH: '#404040',     // High - Dark gray
    MEDIUM: '#808080',   // Medium - Medium gray
    LOW: '#C0C0C0',      // Low - Silver
    LOWEST: '#FFFFFF',   // Lowest - White
  },
  
  // Enhanced Red-Blue diverging with more saturation
  redBlue: {
    name: "Red-Blue",
    HIGHEST: '#8B0000',  // Highest - Dark red
    HIGH: '#FF0000',     // High - Pure red
    MEDIUM: '#FFFFFF',   // Medium - White
    LOW: '#0000FF',      // Low - Pure blue
    LOWEST: '#00008B',   // Lowest - Dark blue
  },
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
  
  // Process data into scatter plot format - COMPLETELY NEW APPROACH using one row per item
  const scatterData = React.useMemo(() => {
    if (!data) return [];
    
    // Default fallback for diagnostic categories if there's an error
    if (dataType === 'category' && (!data.rows || data.rows.length === 0)) {
      console.log("Creating fallback data for diagnostic categories");
      return [];
    }
    
    // Check for valid data structure first
    if (!data.rows || !data.columns || !data.data || !Array.isArray(data.rows) || 
        !Array.isArray(data.columns) || typeof data.data !== 'object') {
      console.error(`Invalid data structure for ${dataType}:`, data);
      return [];
    }
    
    // New approach - we'll group by intensity first, and ONLY include the max intensity value for each row
    const intensityGroups: {
      highest: { [rowName: string]: { value: number, x: string, frequency: number } },
      high: { [rowName: string]: { value: number, x: string, frequency: number } },
      medium: { [rowName: string]: { value: number, x: string, frequency: number } },
      low: { [rowName: string]: { value: number, x: string, frequency: number } },
      lowest: { [rowName: string]: { value: number, x: string, frequency: number } }
    } = {
      highest: {},
      high: {},
      medium: {},
      low: {},
      lowest: {}
    };
    
    try {
      // Create a new array of row labels with counts
      const rowsWithCounts: Record<string, string> = {};
      data.rows.forEach(row => {
        const count = rowTotals[row] || 0;
        rowsWithCounts[row] = `${row} (${count})`;
      });
      
      // Log the maximum value being used
      console.log(`SCATTER PLOT using maxValue=${maxValue} for ${dataType}`);
      
      console.log(`COLOR THRESHOLDS: Highest (11+), High (8-10), Medium (5-7), Low (2-4), Lowest (1)`);
      
      // First pass: find the HIGHEST intensity value for each row
      data.rows.forEach((row) => {
        if (!row) return; // Skip invalid rows
        
        // Calculate frequency (how many sessions this item appears in)
        let sessionsCount = 0;
        Object.keys(data.data[row] || {}).forEach(col => {
          if (data.data[row][col] > 0) {
            sessionsCount++;
          }
        });
        
        // Find highest value for this row
        let maxVal = 0;
        let maxColumn = '';
        
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
          
          if (value > maxVal) {
            maxVal = value;
            maxColumn = column;
          }
        });
        
        // Only process non-zero values
        if (maxVal > 0) {
          // Determine which intensity group this belongs to based on the INTENSITY (maxVal)
          // not the frequency (sessionsCount)
          let targetGroup: keyof typeof intensityGroups;
          
          // Categorize by the maxVal (intensity) - this is the count/value itself
          if (maxVal >= 11) {
            targetGroup = 'highest';
            console.log(`INTENSITY CHECK: '${row}' value=${maxVal}, sessions=${sessionsCount} → HIGHEST`);
          } else if (maxVal >= 8) {
            targetGroup = 'high';
            console.log(`INTENSITY CHECK: '${row}' value=${maxVal}, sessions=${sessionsCount} → HIGH`);
          } else if (maxVal >= 5) {
            targetGroup = 'medium';
            console.log(`INTENSITY CHECK: '${row}' value=${maxVal}, sessions=${sessionsCount} → MEDIUM`);
          } else if (maxVal >= 2) {
            targetGroup = 'low';
            console.log(`INTENSITY CHECK: '${row}' value=${maxVal}, sessions=${sessionsCount} → LOW`);
          } else {
            targetGroup = 'lowest';
            console.log(`INTENSITY CHECK: '${row}' value=${maxVal}, sessions=${sessionsCount} → LOWEST`);
          }
          
          // Store in the appropriate group
          intensityGroups[targetGroup][row] = {
            value: maxVal,
            x: maxColumn,
            frequency: sessionsCount
          };
          
          console.log(`Added row '${row}' to ${targetGroup.toUpperCase()} intensity with value ${maxVal}`);
        }
      });
    } catch (err) {
      console.error(`Error processing ${dataType} data:`, err);
    }
    
    // Convert the grouped data to series format
    const result: ScatterGroupData[] = [];
    
    // Helper function to convert a group to a series
    const groupToSeries = (
      groupName: string, 
      group: { [rowName: string]: { value: number, x: string, frequency: number } }
    ): ScatterGroupData => {
      const seriesData: ScatterDataPoint[] = [];
      
      Object.entries(group).forEach(([row, info]) => {
        seriesData.push({
          x: info.x,
          y: row, // Just use the original row name without count
          size: info.value,
          frequency: info.frequency
        });
      });
      
      return {
        id: groupName,
        data: seriesData
      };
    };
    
    // Add each intensity group as a separate series
    const highestSeries = groupToSeries('Highest (11+)', intensityGroups.highest);
    if (highestSeries.data.length > 0) {
      result.push(highestSeries);
    }
    
    const highSeries = groupToSeries('High (8-10)', intensityGroups.high);
    if (highSeries.data.length > 0) {
      result.push(highSeries);
    }
    
    const mediumSeries = groupToSeries('Medium (5-7)', intensityGroups.medium);
    if (mediumSeries.data.length > 0) {
      result.push(mediumSeries);
    }
    
    const lowSeries = groupToSeries('Low (2-4)', intensityGroups.low);
    if (lowSeries.data.length > 0) {
      result.push(lowSeries);
    }
    
    const lowestSeries = groupToSeries('Lowest (1)', intensityGroups.lowest);
    if (lowestSeries.data.length > 0) {
      result.push(lowestSeries);
    }
    
    console.log(`Created ${result.length} series for ${dataType} with ${result.reduce((sum, series) => sum + series.data.length, 0)} total points`);
    return result;
  }, [data, dataType, rowTotals, maxValue]);
  
  // Error state
  if (error) {
    return (
      <div className="border rounded-md p-4 h-96 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-2">Error loading {displayName}</div>
        <div className="text-sm text-gray-500">{String(error)}</div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="border rounded-md p-4 h-96 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
        <div className="text-sm text-gray-500">Loading {displayName} data...</div>
      </div>
    );
  }
  
  // No data state
  if (!data || !scatterData || scatterData.length === 0) {
    return (
      <div className="border rounded-md p-4 h-96 flex flex-col items-center justify-center">
        <div className="text-amber-500 mb-2">No data available</div>
        <div className="text-sm text-gray-500">No {displayName.toLowerCase()} data for this patient.</div>
      </div>
    );
  }
  
  // Map theme colors to each intensity level for the manual legend
  const intensityLevels = [
    { label: 'Highest (11+)', color: colorSet.HIGHEST },
    { label: 'High (8-10)', color: colorSet.HIGH },
    { label: 'Medium (5-7)', color: colorSet.MEDIUM },
    { label: 'Low (2-4)', color: colorSet.LOW },
    { label: 'Lowest (1)', color: colorSet.LOWEST },
  ];

  // Create an array of colors to match our series
  const seriesColors = [
    colorSet.HIGHEST,
    colorSet.HIGH,
    colorSet.MEDIUM,
    colorSet.LOW,
    colorSet.LOWEST,
  ];
  
  // Dynamic margin based on compact mode
  const margin = compact 
    ? { top: 40, right: 30, bottom: 70, left: 180 } 
    : { top: 60, right: 140, bottom: 100, left: 200 };
  
  // Enhanced scatter plot 
  const ScatterChart = () => {
    // Process the data to make it ideal for rendering
    const processedData = scatterData;
    
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <ResponsiveScatterPlot
          data={processedData}
          margin={margin}
          xScale={{ type: 'point' }}
          yScale={{ type: 'point' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 46,
            truncateTickAt: 0
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legendPosition: 'middle',
            legendOffset: -50,
            truncateTickAt: 0
          }}
          // Use a color scheme that explicitly maps to each series in our data
          colors={(d) => {
            const seriesId = d.serieId?.toString();
            if (seriesId?.includes('Highest')) return colorSet.HIGHEST;
            if (seriesId?.includes('High')) return colorSet.HIGH;
            if (seriesId?.includes('Medium')) return colorSet.MEDIUM;
            if (seriesId?.includes('Low') && !seriesId?.includes('Lowest')) return colorSet.LOW;
            if (seriesId?.includes('Lowest')) return colorSet.LOWEST;
            return colorSet.MEDIUM; // Fallback
          }}
          // Node size is based on frequency (how many sessions it appears in)
          nodeSize={(d) => {
            // Get frequency if available, with fallback
            const frequency = d.data.frequency || 1;
            
            // Scale node size based on frequency 
            if (frequency <= 5) return 20 + (frequency * 4);
            if (frequency <= 10) return 70;
            if (frequency <= 15) return 85;
            return 100;
          }}
          blendMode="normal" // Use normal blend mode to preserve colors
          useMesh={true}
          debugMesh={false}
          nodeId={(node) => `${node.x}-${node.y}`}
          tooltip={({ node }: { node: any }) => {
            // Robust null checking
            if (!node || !node.data) {
              return <div className="bg-white p-2 shadow-md border text-xs">No data available</div>;
            }
            
            const datum = node.data;
            // Get intensity (total count) and frequency (session count)
            const intensity = datum.size || 0;
            const frequency = datum.frequency || 1;
            const percentage = Math.round(((intensity / (maxValue || 1)) * 100));
            
            // Determine intensity level and color
            let intensityLabel = 'Lowest (1)';
            let dotColor = colorSet.LOWEST;
            
            // Use the same direct value mapping as in the series grouping
            if (intensity >= 11) {
              intensityLabel = 'Highest (11+)';
              dotColor = colorSet.HIGHEST;
            } else if (intensity >= 8) {
              intensityLabel = 'High (8-10)';
              dotColor = colorSet.HIGH;
            } else if (intensity >= 5) {
              intensityLabel = 'Medium (5-7)';
              dotColor = colorSet.MEDIUM;
            } else if (intensity >= 2) {
              intensityLabel = 'Low (2-4)';
              dotColor = colorSet.LOW;
            }
            
            return (
              <div 
                className="bg-white p-3 shadow-lg border-2 text-xs rounded-md"
                style={{
                  position: 'relative',
                  transform: 'translateY(24px)', // Push tooltip down to avoid clipping
                  zIndex: 100,
                  maxWidth: '220px'
                }}
              >
                <div className="font-bold text-sm mb-1 pb-1 border-b">Data Point Details</div>
                <div className="my-1"><strong>Date:</strong> {datum.x || 'Unknown'}</div>
                <div className="my-1"><strong>Item:</strong> {datum.y || 'Unknown'}</div>
                <div className="my-1"><strong>Total Occurrences:</strong> {intensity}</div>
                <div className="my-1"><strong>Sessions Present:</strong> {frequency}</div>
                <div className="my-1"><strong>Relative Intensity:</strong> {percentage}% of max</div>
                <div className="mt-2 pt-1 border-t">
                  <strong>Intensity:</strong>{' '}
                  <span 
                    className="font-semibold px-2 py-1 rounded-sm" 
                    style={{ 
                      backgroundColor: dotColor,
                      color: intensity >= 8 ? 'white' : 'black',
                      display: 'inline-block',
                      marginTop: '2px'
                    }}
                  >
                    {intensityLabel}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  };
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium">{displayName}</h3>
        <div className="flex space-x-1">
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
      
      {/* Custom color legend */}
      {!isLoading && !error && data && (
        <div className="flex items-center gap-2 mt-1 mb-2 text-xs flex-wrap">
          {intensityLevels.map((level, index) => (
            <div key={index} className="flex items-center">
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: level.color, 
                  borderRadius: '50%',
                  border: level.label === 'Lowest (1)' ? '1px solid #ccc' : 'none' 
                }} 
              />
              <span className="ml-1">{level.label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Chart container with fixed height */}
      <div className="w-full h-96 border rounded-md overflow-hidden" ref={chartRef}>
        <ScatterChart />
      </div>
      
      {/* Expanded view dialog */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>{displayName} - Full View</DialogTitle>
              <DialogDescription>
                Different colors represent different intensity levels. Bubble size indicates frequency (session count).
              </DialogDescription>
            </DialogHeader>
            
            {/* Fixed legend in modal */}
            <div className="flex flex-wrap gap-3 justify-center mb-2 p-2 bg-slate-50 rounded-md">
              {intensityLevels.map((level, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    style={{ 
                      width: 14, 
                      height: 14, 
                      backgroundColor: level.color, 
                      borderRadius: '50%',
                      border: level.label === 'Lowest (1)' ? '1px solid #ccc' : 'none' 
                    }} 
                  />
                  <span className="ml-1 text-xs">{level.label}</span>
                </div>
              ))}
            </div>
            
            {data && (
              <div className="flex-1 h-[calc(90vh-10rem)] min-h-[500px] bg-white border rounded">
                <ScatterChart />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoMultiSeries() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'bold' for maximum contrast
  const [currentTheme, setCurrentTheme] = React.useState('bold');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-multi-series/${patientToDisplay}`);
    }
    
    // Print the color thresholds to console for debugging
    const activeTheme = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.bold;
    const thresholds = {
      "1": activeTheme.LOWEST,
      "2-4": activeTheme.LOW,
      "5-7": activeTheme.MEDIUM, 
      "8-10": activeTheme.HIGH,
      "11+": activeTheme.HIGHEST
    };
    console.log("INTENSITY COLOR THRESHOLDS:", thresholds);
  }, [patientId, patientToDisplay, setLocation, currentTheme]);

  // Get the active color set
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through bubble chart visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Theme selector and color legend */}
          <div className="bg-slate-50 p-3 mb-4 rounded-md border flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-slate-600">
                <strong>Bubble Chart Legend</strong>: Size indicates <i>frequency</i> (how many sessions/dates an item appears in), 
                while color indicates <i>intensity</i> (total occurrences across all sessions).
              </div>

              <div className="flex items-center">
                <span className="text-xs mr-2">Color Theme:</span>
                <Select
                  value={currentTheme}
                  onValueChange={setCurrentTheme}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Select a color theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bold">Bold Colors</SelectItem>
                    <SelectItem value="iridis">Iridis (Purple)</SelectItem>
                    <SelectItem value="highContrast">High Contrast</SelectItem>
                    <SelectItem value="redBlue">Red-Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="font-medium mb-1 text-sm">Colors = Intensity (occurrences)</div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center">
                      <div style={{ width: 14, height: 14, backgroundColor: colorSet.HIGHEST, borderRadius: '50%' }} />
                      <span className="ml-1">Highest (11+)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 12, height: 12, backgroundColor: colorSet.HIGH, borderRadius: '50%' }} />
                      <span className="ml-1">High (8-10)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 12, height: 12, backgroundColor: colorSet.MEDIUM, borderRadius: '50%' }} />
                      <span className="ml-1">Medium (5-7)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 12, height: 12, backgroundColor: colorSet.LOW, borderRadius: '50%' }} />
                      <span className="ml-1">Low (2-4)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 10, height: 10, backgroundColor: colorSet.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
                      <span className="ml-1">Lowest (1)</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-1 text-sm">Sizes = Frequency (sessions)</div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center">
                      <div style={{ width: 20, height: 20, border: '2px solid #333', borderRadius: '50%' }} />
                      <span className="ml-1">16+ (100px)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 17, height: 17, border: '2px solid #333', borderRadius: '50%' }} />
                      <span className="ml-1">11-15 (85px)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 14, height: 14, border: '2px solid #333', borderRadius: '50%' }} />
                      <span className="ml-1">6-10 (60-70px)</span>
                    </div>
                    <div className="flex items-center">
                      <div style={{ width: 10, height: 10, border: '2px solid #333', borderRadius: '50%' }} />
                      <span className="ml-1">1-5 (20-52px)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mb-4">
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
              <Button 
                variant="outline"
                onClick={() => setLocation(`/nivo-scatter-view-themed/${patientToDisplay}`)}
              >
                Themed View
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four scatter plots in a 2x2 grid - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <ScatterSection 
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