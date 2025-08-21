import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

// Interface for patient visualization parameters
interface PatientVisualizationParams {
  patientId?: string;
}

// Interface for API response data
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Interface for a scatter data point
interface BubbleDataPoint {
  id: string;
  x: string;
  y: string;
  value: number;
  frequency: number;
  color: string;
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

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component
export default function BubbleChartThemed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = useState('iridis');
  
  console.log(`Main component rendered with theme: ${currentTheme}`);
  
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
        
        {/* Display all four scatter plots in a 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DATA_TYPES.map((type) => (
            <BubbleChartCard 
              key={`${type.id}-${currentTheme}`} // Key forces remount when theme changes
              dataType={type.id} 
              patientId={patientToDisplay}
              themeName={currentTheme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Bubble Chart Card Component - Completely remade with theme props
const BubbleChartCard = ({ 
  dataType, 
  patientId,
  themeName
}: { 
  dataType: string; 
  patientId: string;
  themeName: string;
}) => {
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  const endpointName = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS];
  
  console.log(`BubbleChartCard rendered: ${dataType} with theme: ${themeName}`);
  
  // Get the active color theme
  const themeColors = COLOR_THEMES[themeName as keyof typeof COLOR_THEMES];
  
  // Fetch the data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${endpointName}/${patientId}`],
  });
  
  // State for transformed data
  const [chartData, setChartData] = useState<{ id: string, data: BubbleDataPoint[] }[]>([]);
  
  // Effect to transform data when it changes or theme changes
  useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log(`Processing data for ${dataType} with theme: ${themeName}`);
    console.log("Theme colors:", themeColors);
    
    // First step: Calculate frequencies for each row
    // This determines how often each symptom/diagnosis appears across all dates
    const rowFrequencies: Record<string, number> = {};
    
    data.rows.forEach(row => {
      let count = 0;
      data.columns.forEach(col => {
        if (data.data[row]?.[col] > 0) {
          count++;
        }
      });
      rowFrequencies[row] = count;
    });
    
    // Create a color mapping that assigns colors to each row
    // We'll use a round-robin assignment of the colors in our theme
    // This ensures each row has its own distinct color that's consistent
    const colorKeys = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;
    const rowColors: Record<string, string> = {};
    
    // Assign a color to each row from our theme palette
    data.rows.forEach((row, index) => {
      // Cycle through the available colors
      const colorKey = colorKeys[index % colorKeys.length] as keyof typeof themeColors;
      const color = themeColors[colorKey];
      rowColors[row] = color;
      
      console.log(`Row "${row}" assigned theme color ${colorKey} (${color})`);
    });
    
    // Create scatter plot data
    const transformedData: BubbleDataPoint[] = [];
    
    // For each row (symptom, diagnosis, etc.)
    data.rows.forEach(row => {
      // For each date column
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        
        if (value > 0) {
          transformedData.push({
            id: `${row}-${col}`,
            x: col,
            y: row,
            value,
            frequency: rowFrequencies[row],
            color: rowColors[row]
          });
        }
      });
    });
    
    // Update state with the new data
    setChartData([{
      id: 'bubble-data',
      data: transformedData
    }]);
    
  }, [data, themeName, themeColors, dataType]);
  
  if (isLoading) {
    return (
      <Card className="h-[350px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
          <CardDescription className="text-xs">{typeInfo?.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="h-[350px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-destructive">{error ? 'Error loading data' : 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate node size based on frequency
  const getNodeSize = (node: any) => {
    if (!node || !node.data) return 5;
    
    const frequency = node.data.frequency || 1;
    
    if (frequency >= 10) return 23;
    if (frequency >= 9) return 21;
    if (frequency >= 8) return 19;
    if (frequency >= 7) return 17;
    if (frequency >= 6) return 15;
    if (frequency >= 5) return 13;
    if (frequency >= 4) return 11;
    if (frequency >= 3) return 9;
    if (frequency >= 2) return 7;
    return 5;
  };
  
  // Get node color directly from the node
  const getNodeColor = (node: any) => {
    if (!node || !node.data) return themeColors.LOWEST;
    
    // Debug to see what's actually in the node
    console.log("Node data for color:", node.data);
    
    // Force the color to be used exactly as assigned
    return node.data.color;
  };
  
  // Function to render bottom axis with rotated labels
  const renderBottomAxis = (tick: any) => (
    <g transform={`translate(${tick.x},${tick.y})`}>
      <line stroke="#ccc" strokeWidth={1} y1={0} y2={5} />
      <text
        textAnchor="start"
        dominantBaseline="text-before-edge"
        transform="translate(0,7)rotate(45)"
        style={{
          fontSize: '9px',
          fill: '#666',
        }}
      >
        {tick.value}
      </text>
    </g>
  );
  
  // Function to render left axis with colored bullets
  const renderLeftAxis = (tick: any) => {
    const row = tick.value;
    let color = themeColors.LOWEST;
    
    // Find the color for this row by checking the chartData
    for (const series of chartData) {
      const point = series.data.find(d => d.y === row);
      if (point) {
        color = point.color;
        break;
      }
    }
    
    return (
      <g transform={`translate(${tick.x},${tick.y})`}>
        <line x1="0" y1="0" x2="-5" y2="0" stroke="#ccc" strokeWidth={1} />
        
        {/* Colored bullet for this row */}
        <circle cx="-15" cy="0" r="4" fill={color} />
        
        <text
          x="-25"
          y="0"
          textAnchor="end"
          dominantBaseline="middle"
          style={{
            fontSize: '9px',
            fill: '#666',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {tick.value}
        </text>
      </g>
    );
  };
  
  // Create a fixed color array from our theme
  const colorArray = [
    themeColors.HIGHEST,
    themeColors.HIGH,
    themeColors.MEDIUM,
    themeColors.LOW,
    themeColors.LOWEST
  ];
  
  return (
    <Card className="w-full h-[350px] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
            <CardDescription className="text-xs">ID: P{patientId.padStart(4, '0')} | {data.rows.length} items</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-2 overflow-visible" style={{ height: 280 }}>
        <div style={{ height: '280px', width: '100%' }}>
          <ResponsiveScatterPlot
            key={`bubble-${dataType}-${themeName}`}
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 120, left: 200 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'point' }}
            axisTop={null}
            axisRight={null}
            blendMode="normal"
            nodeSize={getNodeSize}
            // Use the node's own color property directly
            colors={getNodeColor}
            // Specify colors for the theme directly in the component
            theme={{
              dots: {
                text: {
                  fill: '#333333',
                },
              },
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 45,
              renderTick: renderBottomAxis,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              renderTick: renderLeftAxis,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};