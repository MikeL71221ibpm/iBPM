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
  category: 'diagnostic-category', // This is the key fix - the endpoint is different from the ID
  hrsn: 'hrsn'
};

// Interface for scatter data
interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number; // Total value (intensity)
  frequency: number; // How many sessions this item appears in
  intensityColor: string; // Color based on intensity from theme
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

// Get the intensity color from the current theme
const getIntensityColor = (value: number, colorTheme: string) => {
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
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
};

// Scatter visualization component - handles a single scatter plot
const ScatterSection = ({ 
  dataType,
  patientId,
  colorTheme,
  compact = false 
}: { 
  dataType: string, 
  patientId: string,
  colorTheme: string,
  compact?: boolean 
}) => {
  // Refs for accessing DOM elements
  const chartRef = useRef<HTMLDivElement>(null);
  
  // State for expanded dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  // Find the display name for this data type from DATA_TYPES
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || 'Data';
  
  // Map dataType to correct API endpoint
  const endpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS];
  
  // Query for the pivot data
  const { data, error, isLoading } = useQuery<PivotData>({ 
    queryKey: [`/api/pivot/${endpoint}/${patientId}`],
  });
  
  // Generate colors for each row - one color per row
  const rowColors = React.useMemo(() => {
    const colors: Record<string, string> = {};
    if (data?.rows) {
      // Generate colors for rows by hashing string to consistent color
      data.rows.forEach((row, index) => {
        // Use a simple hash function to generate a consistent hue between 0-360
        let hash = 0;
        for (let i = 0; i < row.length; i++) {
          hash = row.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert hash to a hue value between 0-359
        const hue = Math.abs(hash) % 360;
        
        // Use HSL to ensure good saturation and lightness
        const saturation = 70 + Math.abs(hash % 20); // 70% to 90% saturation
        const lightness = 30 + Math.abs((hash >> 4) % 20); // 30% to 50% lightness
        
        colors[row] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      });
    }
    return colors;
  }, [data?.rows]);
  
  // Compute row totals for each row
  const rowTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    if (data?.rows && data?.data) {
      data.rows.forEach(row => {
        totals[row] = Object.values(data.data[row] || {}).reduce((sum, val) => sum + val, 0);
      });
    }
    return totals;
  }, [data?.rows, data?.data]);
  
  // Create the scatter data structure for Nivo
  const scatterData = React.useMemo(() => {
    const allSeries: ScatterGroupData[] = [];
    
    // Early return if no data yet
    if (!data || !data.rows || !data.columns) {
      return allSeries;
    }
    
    // Get the active color set
    const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
    
    // Maximum value in the dataset (used for sizing)
    const maxValue = data.maxValue || 1;
    
    try {
      // Convert pivot data to scatter series
      data.rows.forEach(row => {
        const rowPoints: ScatterDataPoint[] = [];
        
        // Process each date column for this row
        data.columns.forEach(column => {
          const value = data.data[row]?.[column] || 0;
          
          // Only process non-zero values
          if (value > 0) {
            // Calculate frequency (for display purposes)
            let sessionsCount = 0;
            Object.keys(data.data[row] || {}).forEach(col => {
              if (data.data[row][col] > 0) {
                sessionsCount++;
              }
            });
            
            // Determine the intensity level color for this value
            let intensityColor;
            if (value >= 11) {
              intensityColor = colorSet.HIGHEST;
              console.log(`INTENSITY CHECK: '${row}' value=${value}, sessions=${sessionsCount} → HIGHEST`);
            } else if (value >= 8) {
              intensityColor = colorSet.HIGH;
              console.log(`INTENSITY CHECK: '${row}' value=${value}, sessions=${sessionsCount} → HIGH`);
            } else if (value >= 5) {
              intensityColor = colorSet.MEDIUM;
              console.log(`INTENSITY CHECK: '${row}' value=${value}, sessions=${sessionsCount} → MEDIUM`);
            } else if (value >= 2) {
              intensityColor = colorSet.LOW;
              console.log(`INTENSITY CHECK: '${row}' value=${value}, sessions=${sessionsCount} → LOW`);
            } else {
              intensityColor = colorSet.LOWEST;
              console.log(`INTENSITY CHECK: '${row}' value=${value}, sessions=${sessionsCount} → LOWEST`);
            }
            
            // Add the data point for this row and column with intensity and theme color
            rowPoints.push({
              x: column,
              y: `${row} (${rowTotals[row] || 0})`, // Use the row name with count
              size: value,
              frequency: sessionsCount,
              intensityColor: intensityColor // Store the theme color for this value
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
  }, [data, dataType, rowTotals, colorTheme]);
  
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
  
  // Get the current color theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // Map theme colors to each intensity level for the manual legend
  const intensityLevels = [
    { label: 'Highest (11+)', color: colorSet.HIGHEST },
    { label: 'High (8-10)', color: colorSet.HIGH },
    { label: 'Medium (5-7)', color: colorSet.MEDIUM },
    { label: 'Low (2-4)', color: colorSet.LOW },
    { label: 'Lowest (1)', color: colorSet.LOWEST },
  ];

  // Dynamic margin based on compact mode - dramatically reduce margins for compact view
  const margin = compact 
    ? { top: 30, right: 20, bottom: 40, left: 100 } 
    : { top: 60, right: 140, bottom: 100, left: 200 };
  
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
              
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line stroke="#ccc" x1={-3} x2={0} y1={0} y2={0} />
                  {/* Add a colored bullet point next to the text */}
                  <circle cx={-7} cy={0} r={2} fill={color} />
                  <text
                    x={-10}
                    y={0}
                    textAnchor="end"
                    dominantBaseline="central"
                    style={{ fontSize: compact ? '8px' : '10px', fill: '#333' }}
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
          // CRITICAL: This uses the theme color directly from the node data
          colors={(node: any) => {
            // Need to check if node.data exists and handle the case when it doesn't
            if (!node.data) {
              // Fallback to default color from the colorSet
              return colorSet.MEDIUM;
            }
            return node.data.intensityColor || colorSet.MEDIUM;
          }}
          nodeSize={(node: any) => {
            // Size range from 3 to 20 based on the data point value
            // 1 occurrence = 4px, 2 occurrences = 8px, 3 occurrences = 12px, etc.
            if (!node.data) {
              return 4; // Default minimum size
            }
            const occurrences = node.data.size || 1;
            const size = Math.max(4, Math.min(20, 4 + (occurrences - 1) * 4));
            return size;
          }}
          // Enhanced tooltip with more information
          tooltip={({ node }: { node: any }) => {
            // Safety check for missing data
            if (!node || !node.data) {
              return (
                <div className="bg-white p-2 border shadow-md rounded-md">
                  <div className="text-xs">No data available</div>
                </div>
              );
            }
            
            return (
              <div className="bg-white p-2 border shadow-md rounded-md">
                <div className="font-bold text-sm mb-1">
                  {node.data.y || 'Unknown'}
                </div>
                <div className="text-xs">
                  Date: {node.data.x || 'Unknown'}
                </div>
                <div className="text-xs">
                  Times mentioned: {node.data.size || 0}
                </div>
                <div className="text-xs">
                  Present in {node.data.frequency || 0} session{(node.data.frequency || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            );
          }}
          legends={compact ? [] : [
            {
              anchor: 'top-right',
              direction: 'column',
              justify: false,
              translateX: 130,
              translateY: 0,
              itemWidth: 100,
              itemHeight: 12,
              itemsSpacing: 5,
              itemDirection: 'left-to-right',
              symbolSize: 12,
              symbolShape: 'circle'
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
export default function NivoScatterThemed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-scatter-themed-colors/${patientToDisplay}`);
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
  
  // Theme change handler
  const handleThemeChange = (value: string) => {
    setCurrentTheme(value);
  };
  
  return (
    <Card className="container mx-auto my-0 p-0" style={{ minHeight: '95vh', maxHeight: '95vh', overflow: 'visible' }}>
      <CardHeader className="py-0 px-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="text-sm">Patient Visualization: {getPatientName(parseInt(patientToDisplay))}</CardTitle>
            <CardDescription className="text-xs">
              Visual timeline of all symptoms, diagnoses, and health indicators
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
      
      {/* Display all four scatter plots in a 2x2 grid - always visible */}
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