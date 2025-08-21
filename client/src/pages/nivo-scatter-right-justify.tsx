// Right-justified version of the visualization
// Copy of nivo-scatter-view-themed-new-colors-fixed.tsx with right-justified labels

import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  category: 'diagnostic-category',
  hrsn: 'hrsn'
};

// Interface for scatter data
interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number;
  frequency: number;
  color?: string;
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
  
  // Viridis color scheme (green to purple) - perceptually uniform, colorblind friendly
  viridis: {
    name: "Viridis (Green-Purple)",
    HIGHEST: '#440154',  // Highest - Dark purple
    HIGH: '#414487',     // High - Deep blue-purple
    MEDIUM: '#2A788E',   // Medium - Blue-green
    LOW: '#22A884',      // Low - Green
    LOWEST: '#7AD151',   // Lowest - Light green-yellow
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
  
  // Extract max value for scaling bubbles
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
  
  // Create consistent row colors that match across all charts
  const rowColors = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    // Generate unique colors for each row using HSL colors for better distribution
    const colors: Record<string, string> = {};
    
    data.rows.forEach((row, index) => {
      // Using HSL colors ensures we get evenly distributed, vibrant colors
      const hue = Math.floor((index * 360) / Math.max(1, data.rows.length));
      
      // Use high saturation (80%) and medium lightness (50%) for good visibility
      const color = `hsl(${hue}, 80%, 50%)`;
      
      // Store the color for both the row name and the row name with count
      colors[row] = color;
      colors[`${row} (${rowTotals[row] || 0})`] = color;
    });
    
    return colors;
  }, [data, rowTotals]);
  
  // Process data into scatter plot format - group by row
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
    
    // The main array to store our series data - one series per row
    const allSeries: ScatterGroupData[] = [];
    
    try {
      // Process each row to create a separate series
      data.rows.forEach((row) => {
        if (!row) return; // Skip invalid rows
        
        // Create an array to store data points for this row
        const rowPoints: ScatterDataPoint[] = [];
        
        // Process each column for this row
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
          
          // Only process non-zero values
          if (value > 0) {
            // Calculate frequency (for display purposes)
            let sessionsCount = 0;
            Object.keys(data.data[row] || {}).forEach(col => {
              if (data.data[row][col] > 0) {
                sessionsCount++;
              }
            });
            
            // Get the appropriate color based on intensity
            let intensityColor;
            if (value >= 11) {
              intensityColor = colorSet.HIGHEST;
            } else if (value >= 8) {
              intensityColor = colorSet.HIGH;
            } else if (value >= 5) {
              intensityColor = colorSet.MEDIUM;
            } else if (value >= 2) {
              intensityColor = colorSet.LOW;
            } else {
              intensityColor = colorSet.LOWEST;
            }
            
            // Add the data point for this row and column with intensity
            rowPoints.push({
              x: column,
              y: `${row} (${rowTotals[row] || 0})`, // Use the row name with count
              size: value,
              frequency: sessionsCount,
              color: intensityColor // Use color based on intensity from the current color theme
            });
          }
        });
        
        // Only create a series if we have data points
        if (rowPoints.length > 0) {
          allSeries.push({
            id: row, // Use the row name as the series ID - critical for colors to match
            data: rowPoints
          });
        }
      });
    } catch (err) {
      console.error(`Error processing ${dataType} data:`, err);
    }
    
    console.log(`Created ${allSeries.length} series for ${dataType} with ${allSeries.reduce((sum, series) => sum + series.data.length, 0)} total points`);
    return allSeries;
  }, [data, dataType, rowTotals, maxValue, rowColors, colorSet, colorTheme]);
  
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
  
  // Dynamic margin based on compact mode with enhanced left margins for readability
  const margin = compact 
    ? { top: 30, right: 20, bottom: 40, left: 240 } // Increased left margin for compact view
    : { top: 60, right: 140, bottom: 100, left: 520 }; // Significantly increased left margin for full view
  
  // Enhanced scatter plot - explicit non-responsive implementation to debug
  const ScatterChart = () => {
    // Add verification that data is actually available
    console.log(`RENDERING CHART: ${displayName} with ${scatterData.length} series`);
    if (scatterData.length > 0) {
      console.log(`First series has ${scatterData[0].data.length} points`);
    }
    
    return (
      <div style={{ 
          height: dataType === 'hrsn' ? '250px' : (
            dataType === 'category' ? '350px' : 
            dataType === 'diagnosis' ? '450px' : '450px'
          ), 
          width: '100%',
          position: 'relative',
          overflow: 'visible'
        }}>
        <ResponsiveScatterPlot
          data={scatterData}
          margin={margin}
          enableGridX={true}
          enableGridY={true}
          xScale={{ type: 'point' }}
          yScale={{ type: 'point' }}
          animate={false}
          axisTop={null}
          axisRight={null}
          axisBottom={compact ? {
            tickSize: 3,
            tickPadding: 2,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 30,
            truncateTickAt: 0,
            tickValues: 5 // Limit number of ticks to 5
          } : {
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 46,
            truncateTickAt: 0
          }}
          axisLeft={{
            tickSize: compact ? 3 : 5,
            tickPadding: compact ? 3 : 5,
            tickRotation: 0,
            legendPosition: 'middle',
            legendOffset: -50,
            truncateTickAt: 0,
            // For compact mode, limit the number of ticks to reduce clutter
            tickValues: compact ? 7 : undefined, 
            renderTick: (tick) => {
              // Get the color for this row from the rowColors
              const rowName = tick.value.toString();
              const baseRowName = rowName.split(' (')[0]; // Remove the count part if present
              const color = rowColors[baseRowName] || rowColors[rowName] || '#333';

              // For compact mode, truncate long label names
              let displayText = rowName;
              if (compact && displayText.length > 15) {
                displayText = displayText.substring(0, 13) + '...';
              }
              
              // RIGHT-JUSTIFIED VERSION
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line stroke="#ccc" x1={-3} x2={0} y1={0} y2={0} />
                  {/* Add a colored bullet point next to the text */}
                  <circle cx={-7} cy={0} r={5} fill={color} stroke="#000000" strokeWidth={0.5} />
                  <text
                    x={-12}
                    y={0}
                    textAnchor="end"  // Right-justified - this is key!
                    dominantBaseline="central"
                    style={{ 
                      fontSize: compact ? '12px' : '14px', 
                      fill: '#333333',
                      fontWeight: 500
                    }}
                  >
                    {displayText}
                  </text>
                </g>
              );
            }
          }}
          theme={{
            tooltip: {
              container: {
                background: 'white',
                color: 'inherit',
                fontSize: 'inherit',
                borderRadius: '6px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                padding: '10px 16px'
              }
            }
          }}
          // CRITICAL: This colors function determines bubble color based on intensity/value
          colors={(d: any) => {
            // Get the data value from the node
            const value = d.data?.size || 1;
            
            // Apply the color theme based on value
            if (value >= 11) {
              return colorSet.HIGHEST;
            } else if (value >= 8) {
              return colorSet.HIGH;
            } else if (value >= 5) {
              return colorSet.MEDIUM;
            } else if (value >= 2) {
              return colorSet.LOW;
            } else {
              return colorSet.LOWEST;
            }
          }}
          nodeSize={(node) => {
            // ADA-compliant minimum sizes for visual elements
            // Increasing size based on occurrences with proper scaling for readability
            const occurrences = node.data.size || 1;
            
            // Apply new sizing based on occurrences - started from ADA minimum of 6px
            if (occurrences >= 4) {
              return 18; // Extra large for 4+ occurrences (9px radius)
            } else if (occurrences === 3) {
              return 14; // Large for 3 occurrences (7px radius)
            } else if (occurrences === 2) {
              return 10; // Medium for 2 occurrences (5px radius)
            } else {
              return 6;  // ADA minimum for 1 occurrence (3px radius)
            }
          }}
          // Enhanced tooltip with more information
          tooltip={({ node }) => (
            <div className="bg-white p-2 border shadow-md rounded-md">
              <div className="font-bold text-sm mb-1">
                {node.data.y}
              </div>
              <div className="text-xs">
                Date: {node.data.x}
              </div>
              <div className="text-xs">
                Times mentioned: {node.data.size}
              </div>
              <div className="text-xs">
                Present in {node.data.frequency} session{node.data.frequency !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          legends={compact ? [] : [
            {
              anchor: 'top-right',
              direction: 'column',
              justify: false,
              translateX: 130,
              translateY: 0,
              itemWidth: 120,
              itemHeight: 16,
              itemsSpacing: 8,
              itemDirection: 'left-to-right',
              symbolSize: 5, // ADA-compliant minimum size
              symbolShape: 'circle',
              symbolBorderColor: '#000000', // Add black border around bullets
              symbolBorderWidth: 0.5,       // Thin border
              itemTextColor: '#333333',     // Darker text for better contrast
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: '#000000',
                    symbolSize: 7
                  }
                }
              ]
            }
          ]}
        />
      </div>
    );
  };
  
  // Card click handler - expand to full size in dialog
  const handleCardClick = () => {
    if (compact) {
      setDialogOpen(true);
    }
  };
  
  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden" onClick={compact ? handleCardClick : undefined}>
        <CardHeader className={compact ? "py-0 px-1" : "px-6 py-4"}>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className={compact ? "text-xs" : "text-xl"}>{displayName}</CardTitle>
              {!compact && (
                <CardDescription>
                  Patient {patientId} - {data.rows.length} items tracked over time
                </CardDescription>
              )}
            </div>
            {!compact && (
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">Export</Button>
                <Button size="sm" variant="outline">Print</Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={compact ? "p-0" : "p-4"}>
          <div 
            style={{ 
              height: dataType === 'hrsn' ? '220px' : (
                dataType === 'category' ? '350px' : (
                  dataType === 'diagnosis' ? '400px' : '400px'
                )
              ),
              width: '100%', 
              position: 'relative',
              display: 'block',
              border: '1px solid #f0f0f0',
              padding: '2px',
              zIndex: 10,
              overflow: 'visible'
            }} 
            ref={chartRef}
          >
            <ScatterChart />
          </div>
        </CardContent>
      </Card>
      
      {/* Full size dialog for expanded view */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{displayName} - Full View</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            <div style={{ height: '80vh', width: '100%' }}>
              <ScatterChart />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoScatterRightJustify() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'viridis' (colorblind friendly)
  const [currentTheme, setCurrentTheme] = React.useState('viridis');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-scatter-right-justify/${patientToDisplay}`);
    }
    
    // Print the color thresholds to console for debugging
    const currentColorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
    const thresholds = {
      "1": currentColorSet.LOWEST,
      "2-4": currentColorSet.LOW,
      "5-7": currentColorSet.MEDIUM,
      "8-10": currentColorSet.HIGH,
      "11+": currentColorSet.HIGHEST
    };
    console.log(`USING COLORS (${currentTheme}):`, thresholds);
  }, [patientId, patientToDisplay, setLocation, currentTheme]);

  // Get the active color set
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  // Theme change handler
  const handleThemeChange = (value: string) => {
    setCurrentTheme(value);
  };
  
  return (
    <Card className="container mx-auto my-0 p-0" style={{ minHeight: '95vh', maxHeight: '95vh', overflow: 'visible' }}>
      <CardHeader className="py-0 px-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="text-sm">
              Patient Visualization (Right-Justified): {getPatientName(parseInt(patientToDisplay))}
            </CardTitle>
            <CardDescription className="text-xs">
              Visual timeline with right-justified labels - counts always visible
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 mt-1 md:mt-0">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground">Theme:</span>
              <Select value={currentTheme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <SelectValue />
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
            <Button variant="outline" size="sm" className="md:ml-2 h-7 text-xs" onClick={() => window.location.reload()}>
              Refresh Data
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Display all four scatter plots in a 2x2 grid */}
      <CardContent className="p-1" style={{ height: 'calc(95vh - 45px)', overflow: 'visible' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 h-full" style={{ overflow: 'visible' }}>
          {DATA_TYPES.map((type) => (
            <div key={type.id} className="border border-gray-200 min-h-[300px]" style={{ overflow: 'visible' }}>
              <ScatterSection 
                dataType={type.id} 
                patientId={patientToDisplay}
                colorTheme={currentTheme}
                compact={true}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}