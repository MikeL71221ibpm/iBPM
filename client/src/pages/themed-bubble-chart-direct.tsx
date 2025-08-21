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

// Direct, simple color themes with arrays of colors
const COLOR_THEMES = {
  // Iridis (purple-blue) theme
  iridis: [
    '#6A0DAD', // Highest - Vibrant deep purple 
    '#9370DB', // High - Medium purple
    '#B19CD9', // Medium - Light purple
    '#CCCCFF', // Low - Very light purple
    '#F8F8FF'  // Lowest - Almost white with slight purple
  ],
  
  // Viridis color scheme - colorblind friendly
  viridis: [
    '#440154', // Highest - Dark purple
    '#31688E', // High - Blue
    '#35B779', // Medium - Green
    '#90D743', // Low - Light green
    '#FDE725'  // Lowest - Yellow
  ],
  
  // High contrast theme
  highContrast: [
    '#000000', // Highest - Black
    '#555555', // High - Dark gray
    '#999999', // Medium - Medium gray
    '#DDDDDD', // Low - Light gray
    '#FFFFFF'  // Lowest - White
  ],
  
  // Red-Blue (diverging) - also colorblind friendly
  redBlue: [
    '#9E0142', // Highest - Red
    '#F46D43', // High - Orange/salmon
    '#FFFFFF', // Medium - White
    '#74ADD1', // Low - Light blue
    '#313695'  // Lowest - Dark blue
  ],
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component
export default function ThemedBubbleChartDirect() {
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
                <SelectItem value="iridis">Iridis (Purple-Blue)</SelectItem>
                <SelectItem value="viridis">Viridis (Colorblind-friendly)</SelectItem>
                <SelectItem value="highContrast">High Contrast</SelectItem>
                <SelectItem value="redBlue">Red-Blue</SelectItem>
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
  const colors = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
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
        <BubbleChart 
          data={data} 
          colors={colors}
        />
      </CardContent>
    </Card>
  );
};

// Very simple bubble chart component focusing only on fixing the color issue
function BubbleChart({ 
  data, 
  colors
}: { 
  data: PivotData;
  colors: string[];
}) {
  // Process the data for the bubble chart
  const chartData = React.useMemo(() => {
    // Get frequency of each row (how many dates it appears in)
    const rowFrequencies: Record<string, number> = {};
    const rowColorCategories: Record<string, string> = {};
    
    // First pass: calculate frequencies
    data.rows.forEach(row => {
      let count = 0;
      data.columns.forEach(col => {
        if (data.data[row]?.[col] > 0) {
          count++;
        }
      });
      rowFrequencies[row] = count;
      
      // Determine color category based on frequency
      let colorCategory: string;
      if (count >= 10) colorCategory = "highest";
      else if (count >= 8) colorCategory = "high";
      else if (count >= 5) colorCategory = "medium";
      else if (count >= 2) colorCategory = "low";
      else colorCategory = "lowest";
      
      rowColorCategories[row] = colorCategory;
    });
    
    // Process the data into a useful format for the chart
    const processedData: { id: string; data: any[] } = { id: 'bubbles', data: [] };
    
    // Second pass: create data points with consistent color categories
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        
        if (value > 0) {
          const frequency = rowFrequencies[row] || 1;
          const colorCategory = rowColorCategories[row];
          
          // Assign color index based on category
          let colorIndex: number;
          switch (colorCategory) {
            case "highest": colorIndex = 0; break;
            case "high": colorIndex = 1; break;
            case "medium": colorIndex = 2; break;
            case "low": colorIndex = 3; break;
            case "lowest": colorIndex = 4; break;
            default: colorIndex = 4;
          }
          
          processedData.data.push({
            x: col,
            y: row,
            value,
            frequency,
            colorCategory,
            colorIndex
          });
        }
      });
    });
    
    return [processedData];
  }, [data]);
  
  // Redefine margin to allow for labels
  const margin = { top: 10, right: 10, bottom: 120, left: 200 };
  
  // Size mapping function
  const getNodeSize = (node: any) => {
    // Handle null or undefined node
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
  
  // Color mapping function
  const getNodeColor = (node: any) => {
    // Handle null or undefined node
    if (!node || !node.data) return colors[4];
    
    // If we have the colorIndex, use it directly
    if (node.data.colorIndex !== undefined) {
      return colors[node.data.colorIndex];
    }
    
    // Fallback to frequency-based calculation
    const frequency = node.data.frequency || 1;
    
    if (frequency >= 10) return colors[0]; // Highest
    if (frequency >= 8) return colors[1];  // High
    if (frequency >= 5) return colors[2];  // Medium
    if (frequency >= 2) return colors[3];  // Low
    return colors[4];                      // Lowest
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
    // Find the row data for this label
    const rowData = chartData[0]?.data.find(d => d.y === tick.value);
    
    // Determine the color for this row
    let colorIndex: number;
    if (rowData?.colorIndex !== undefined) {
      colorIndex = rowData.colorIndex;
    } else {
      const frequency = rowData?.frequency || 1;
      
      if (frequency >= 10) colorIndex = 0; // Highest
      else if (frequency >= 8) colorIndex = 1; // High
      else if (frequency >= 5) colorIndex = 2; // Medium
      else if (frequency >= 2) colorIndex = 3; // Low
      else colorIndex = 4; // Lowest
    }
    
    // Get the actual color from the theme
    const color = colors[colorIndex];
    
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
  
  return (
    <div style={{ height: '280px', width: '100%' }}>
      <ResponsiveScatterPlot
        data={chartData}
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