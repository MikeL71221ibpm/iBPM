import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

// Types
interface PatientVisualizationParams {
  patientId?: string;
}

interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Color theme definitions
const COLOR_THEMES = {
  iridis: {
    name: 'Iridis (Purple-Blue)',
    HIGHEST: '#4A0672', // Dark violet/purple
    HIGH: '#6930C3',    // Medium violet
    MEDIUM: '#8282F6',  // Light blue-violet
    LOW: '#A5C8E4',     // Very light blue
    LOWEST: '#EDF7F9'   // Almost white blue
  },
  viridis: {
    name: 'Viridis (Colorblind-friendly)',
    HIGHEST: '#440154', // Dark purple
    HIGH: '#3B528B',    // Medium blue-purple
    MEDIUM: '#21908C',  // Dark cyan
    LOW: '#5DC963',     // Light green
    LOWEST: '#FDE725'   // Yellow
  },
  highContrast: {
    name: 'High Contrast',
    HIGHEST: '#000000', // Black
    HIGH: '#454545',    // Dark gray
    MEDIUM: '#858585',  // Medium gray
    LOW: '#C5C5C5',     // Light gray
    LOWEST: '#FFFFFF'   // White
  },
  redBlue: {
    name: 'Red-Blue',
    HIGHEST: '#67001F', // Dark red
    HIGH: '#B2182B',    // Medium red
    MEDIUM: '#F7F7F7',  // White/neutral
    LOW: '#2166AC',     // Medium blue
    LOWEST: '#053061'   // Dark blue
  }
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
  
  // Get the active color set based on the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // Fetch pivot data for this data type
  const { data: pivotData, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
    enabled: !!patientId && !!dataType,
  });
  
  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error || !pivotData) {
    return (
      <div className="flex items-center justify-center h-[300px] text-destructive">
        Error loading data
      </div>
    );
  }
  
  // Prepare the scatter plot data
  const data = [
    {
      id: dataType,
      data: pivotData.rows.flatMap((row, rowIndex) => {
        // For each row (symptom, diagnosis, etc.)
        const validPoints = [];
        
        for (const col of pivotData.columns) {
          // For each column (date)
          const value = pivotData.data[row]?.[col] || 0;
          
          // Skip points with no data
          if (value === 0) continue;
          
          // Find the max value for relative scaling
          const allValues = Object.values(pivotData.data).flatMap(item => 
            Object.values(item).filter(v => typeof v === 'number')
          ) as number[];
          const maxValue = Math.max(...allValues);
          
          // Calculate frequency (how many sessions this item appears in)
          const frequency = pivotData.columns.filter(column => 
            (pivotData.data[row]?.[column] || 0) > 0
          ).length;
          
          validPoints.push({
            x: col,
            y: row,
            size: value,            // Used for intensity (how many occurrences total)
            frequency: frequency,   // Used for node sizing (how many sessions)
            intensity: value        // Alias for consistent naming in component
          });
        }
        
        return validPoints;
      })
    }
  ];
  
  // Dynamic left margin calculation based on data
  const longestYLabel = pivotData.rows.reduce(
    (longest, current) => current.length > longest.length ? current : longest,
    ''
  );
  
  // Calculate dynamic left margin
  const leftMargin = compact 
    ? Math.min(180, Math.max(60, longestYLabel.length * 5)) 
    : Math.min(300, Math.max(100, longestYLabel.length * 7));
  
  // Find max value for relative color scaling
  const allValues = Object.values(pivotData.data).flatMap(item => 
    Object.values(item).filter(v => typeof v === 'number')
  ) as number[];
  
  const maxValue = Math.max(...allValues);

  // Function to get color based on intensity value
  const getColorForIntensity = (intensity: number) => {
    if (intensity >= 11) return colorSet.HIGHEST; 
    if (intensity >= 8) return colorSet.HIGH;
    if (intensity >= 5) return colorSet.MEDIUM;
    if (intensity >= 2) return colorSet.LOW;
    return colorSet.LOWEST;
  };
  
  // Calculate the chart margin
  const margin = compact 
    ? { top: 15, right: 10, bottom: 70, left: leftMargin }
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  // Generate a sample scatterplot
  console.log(`RENDERING ${dataType} CHART WITH ${data[0]?.data?.length || 0} POINTS`);
  
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ResponsiveScatterPlot
        data={data}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{ type: 'point' }}
        axisTop={null}
        axisRight={null}
        animate={false}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: titleRotation,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 46
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (v: any) => {
            const label = String(v);
            if (compact && label.length > 20) {
              return label.substring(0, 18) + '...';
            }
            return label;
          }
        }}
        // Size based on frequency
        nodeSize={(d: any) => {
          if (!d?.data) return 20;
          const frequency = d.data.frequency || 1;
          
          if (frequency === 1) return 20;
          if (frequency === 2) return 28;
          if (frequency === 3) return 36;
          if (frequency === 4) return 44;
          if (frequency === 5) return 52;
          if (frequency <= 7) return 60;
          if (frequency <= 10) return 70;
          if (frequency <= 15) return 85;
          return 100;
        }}
        
        // Modified approach: use a color function that directly maps intensity
        colors={(node: any) => {
          if (!node?.data) return '#cccccc'; // default gray
          
          const intensity = node.data.intensity || 0; 
          const nodeColor = getColorForIntensity(intensity);
          
          // Log node color assignment for debugging
          console.log(`Node color for ${node.data.y}: intensity=${intensity}, color=${nodeColor}`);
          
          return nodeColor;
        }}
        
        useMesh={true}
        debugMesh={false}
        enableGridX={true}
        enableGridY={true}
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
          
          // Use the same normalization as the node coloring
          const normalizedValue = intensity / (maxValue || 1);
          
          // Determine intensity level label using SIMPLIFIED direct mapping
          let intensityLabel = 'Lowest';
          let dotColor = colorSet.LOWEST;
          
          // Use the same direct value mapping as in the color function
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
          } else {
            intensityLabel = 'Lowest (1)';
            dotColor = colorSet.LOWEST;
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
                    color: normalizedValue > 0.5 ? 'white' : 'black',
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
        theme={{
          tooltip: {
            container: {
              background: '#ffffff',
              position: 'relative'
            }
          }
        }}
      />
    </div>
  );
};

// Data types definition
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms' },
  { id: 'diagnosis', name: 'Diagnoses' },
  { id: 'diagnostic-category', name: 'Diagnostic Categories' },
  { id: 'hrsn', name: 'HRSN Indicators' },
];

// Main component - displays all four scatter plots in a grid layout
export default function NivoDirectTheme() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-direct-theme/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

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
            Quick overview of all patient data through bubble chart visualizations (direct theme approach).
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
                    <SelectItem value="iridis">Iridis (Purple-Blue)</SelectItem>
                    <SelectItem value="viridis">Viridis (Colorblind-friendly)</SelectItem>
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
          
          {/* 2x2 Grid of scatter plots for the four data types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <Card key={type.id} className="overflow-hidden">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">{type.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0" style={{ height: '350px' }}>
                  <ScatterSection 
                    dataType={type.id} 
                    patientId={patientToDisplay} 
                    colorTheme={currentTheme} 
                    compact={true}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <Button onClick={() => window.location.href = `/nivo-scatter-view-themed/${patientToDisplay}`}>
              View Original Implementation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}