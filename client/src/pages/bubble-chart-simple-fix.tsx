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

// Interface for scatter data
interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number;
  frequency: number;
  intensityCategory?: string;
  color?: string; // Store the exact color to use
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

// Color themes definition
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
export default function BubbleChartSimpleFix() {
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
                {Object.keys(COLOR_THEMES).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
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
        <SimpleBubbleChart 
          data={data} 
          dataType={dataType}
          colorTheme={currentTheme}
        />
      </CardContent>
    </Card>
  );
};

// Simple Bubble Chart component focusing only on color theme issues
function SimpleBubbleChart({ 
  data, 
  dataType,
  colorTheme
}: { 
  data: PivotData;
  dataType: string;
  colorTheme: string;
}) {
  console.log(`SimpleBubbleChart for ${dataType} with theme ${colorTheme}`);
  
  // Get the colors array for the current theme
  const colors = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // Prepare the data for the scatter plot - simplified for focus on the coloring issue
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
          
          // Determine intensity category and color based on frequency
          let intensityCategory: string;
          let intensityIndex: number;
          
          if (frequency >= 10) {
            intensityCategory = "highest";
            intensityIndex = 0;
          } else if (frequency >= 8) {
            intensityCategory = "high";
            intensityIndex = 1;
          } else if (frequency >= 5) {
            intensityCategory = "medium";
            intensityIndex = 2;
          } else if (frequency >= 2) {
            intensityCategory = "low";
            intensityIndex = 3;
          } else {
            intensityCategory = "lowest";
            intensityIndex = 4;
          }
          
          // Store the exact color to use directly in the data
          const color = colors[intensityIndex];
          
          result.push({
            x: col,
            y: row,
            size: value,
            frequency,
            intensityCategory,
            color // Store the exact color
          });
        }
      });
    });
    
    return [{ id: dataType, data: result }];
  }, [data, dataType]);
  
  // Layout dimensions
  const margin = { top: 10, right: 10, bottom: 120, left: 200 };
  
  // Function to determine bubble size
  const calculateBubbleSize = (frequency: number): number => {
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
  
  return (
    <div style={{ height: '280px', width: '100%' }}>
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
                    fontSize: '9px',
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
            // Find the data point(s) for this row to get the color
            const rowData = scatterData[0]?.data.find(d => d.y === tick.value);
            
            // If we found matching data, use its color; otherwise, use a default
            const rowColor = rowData?.color || '#888';
            
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                {/* Line tick mark */}
                <line x1="0" y1="0" x2="-5" y2="0" stroke="#ccc" strokeWidth={1} />
                
                {/* Colored bullet point */}
                <circle
                  cx="-15"
                  cy="0"
                  r="4"
                  fill={rowColor}
                />
                
                {/* Label text */}
                <text
                  x="-25"
                  y="0"
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fontSize: '9px',
                    fill: '#666',
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
          return calculateBubbleSize(d.data?.frequency || 1);
        }}
        /* THE KEY FIX: Calculate color based on frequency */
        colors={(d: any) => {
          if (!d.data) return '#888';
          
          const frequency = d.data.frequency || 1;
          const intensityIndex = 
            frequency >= 10 ? 0 :
            frequency >= 8 ? 1 :
            frequency >= 5 ? 2 :
            frequency >= 2 ? 3 : 4;
          
          return colors[intensityIndex];
        }}
        blendMode="normal"
        useMesh={true}
      />
    </div>
  );
}