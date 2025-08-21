import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component
export default function ThemedBubbleChartDirectFixed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = useState('iridis');
  
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

// Data Type Card Component
const DataTypeCard = ({ 
  dataType, 
  patientId,
  currentTheme
}: { 
  dataType: string; 
  patientId: string;
  currentTheme: string;
}) => {
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  const endpointName = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS];
  
  // Get the colors for the current theme
  const themeColors = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  // Fetch the data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${endpointName}/${patientId}`],
  });
  
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
        <DirectBubbleChart 
          data={data} 
          themeColors={themeColors}
          currentTheme={currentTheme}
        />
      </CardContent>
    </Card>
  );
};

// Very direct bubble chart component that uses pure functions and doesn't rely on memoization 
function DirectBubbleChart({ 
  data, 
  themeColors,
  currentTheme
}: { 
  data: PivotData;
  themeColors: {
    name: string;
    HIGHEST: string;
    HIGH: string;
    MEDIUM: string;
    LOW: string;
    LOWEST: string;
  };
  currentTheme: string;
}) {
  // Define color array to match the order we need (from highest to lowest)
  const colorArray = [
    themeColors.HIGHEST,
    themeColors.HIGH,
    themeColors.MEDIUM,
    themeColors.LOW,
    themeColors.LOWEST
  ];
  
  // Log the current theme colors for debugging
  console.log("USING BUBBLE CHART COLORS:", themeColors, "Current theme:", currentTheme);
  
  // Map row frequencies and assign color categories
  const rowInfo: Record<string, { 
    frequency: number, 
    colorCategory: string 
  }> = {};
  
  // First pass - calculate frequencies
  data.rows.forEach(row => {
    let count = 0;
    data.columns.forEach(col => {
      if (data.data[row]?.[col] > 0) {
        count++;
      }
    });
    
    // Determine color category based on frequency
    let colorCategory: string;
    if (count >= 10) colorCategory = "HIGHEST";
    else if (count >= 8) colorCategory = "HIGH";
    else if (count >= 5) colorCategory = "MEDIUM";
    else if (count >= 2) colorCategory = "LOW";
    else colorCategory = "LOWEST";
    
    rowInfo[row] = { frequency: count, colorCategory };
  });
  
  // Create scatter plot data
  const chartData: any[] = [];
  
  // For each row (symptom, diagnosis, etc.)
  data.rows.forEach(row => {
    // For each date column
    data.columns.forEach(col => {
      const value = data.data[row]?.[col] || 0;
      
      if (value > 0) {
        const info = rowInfo[row];
        // Get the color for this cell directly from theme using type assertion for type safety
        const colorCategory = info.colorCategory as keyof typeof themeColors;
        const color = themeColors[colorCategory];
        
        chartData.push({
          id: `${row}-${col}`,
          x: col,
          y: row,
          value,
          frequency: info.frequency,
          colorCategory: info.colorCategory,
          color
        });
      }
    });
  });
  
  // Create series data for Nivo
  const formattedData = [
    {
      id: 'bubble-data',
      data: chartData
    }
  ];
  
  // Margin for labels
  const margin = { top: 10, right: 10, bottom: 120, left: 200 };
  
  // Define node size function (now simpler, doesn't need memoization)
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
  
  // Direct color function that uses the pre-assigned color
  const getNodeColor = (node: any) => {
    if (!node || !node.data) return themeColors.LOWEST;
    return node.data.color || themeColors.LOWEST; // Use pre-assigned color directly
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
    const info = rowInfo[row];
    // Get color directly from the theme using type assertion for safety
    let color = themeColors.LOWEST;
    if (info) {
      const colorCategory = info.colorCategory as keyof typeof themeColors;
      color = themeColors[colorCategory];
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
  
  // Forcing the component to rebuild when the theme changes
  return (
    <div 
      style={{ height: '280px', width: '100%' }}
      key={`bubble-chart-${currentTheme}`}
    >
      <ResponsiveScatterPlot
        data={formattedData}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{ type: 'point' }}
        axisTop={null}
        axisRight={null}
        blendMode="normal"
        nodeSize={getNodeSize}
        colors={getNodeColor}
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
  );
}