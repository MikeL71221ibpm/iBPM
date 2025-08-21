import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
export default function DirectBubbleChartNew() {
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
        
        {/* Display all four charts in a 2x2 grid */}
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

// Bubble Chart Card Component - Completely rebuilt with SVG for direct control
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
  
  // State for transformed bubble data
  const [bubbleData, setBubbleData] = useState<{
    row: string;
    col: string;
    x: number;
    y: number;
    size: number;
    color: string;
    value: number;
    frequency: number;
  }[]>([]);
  
  // Using fixed dimensions initially to ensure we have valid values
  const [chartDimensions, setChartDimensions] = useState({
    width: 600,
    height: 280,
    marginTop: 10,
    marginRight: 10,
    marginBottom: 120,
    marginLeft: 200,
  });
  
  // Reference for the container
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Effect to update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        // Get the actual dimensions from the DOM
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Make sure we have valid dimensions (non-zero)
        if (width > 0 && height > 0) {
          console.log(`Container dimensions: ${width}x${height}`);
          setChartDimensions(prev => ({
            ...prev,
            width,
            height,
          }));
        } else {
          console.log("Container has zero dimensions, using defaults");
        }
      }
    };
    
    // Initial update
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Additional update after a short delay to ensure rendering is complete
    const timer = setTimeout(updateDimensions, 300);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);
  
  // Effect to transform data when it changes or theme changes
  useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log(`Processing data for ${dataType} with theme: ${themeName}`);
    console.log("Theme colors:", themeColors);
    
    // First step: Calculate frequencies for each row
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
    const colorKeys = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;
    const rowColors: Record<string, string> = {};
    
    // Assign a color to each row cyclically from our theme palette
    data.rows.forEach((row, index) => {
      const colorKey = colorKeys[index % colorKeys.length] as keyof typeof themeColors;
      const color = themeColors[colorKey];
      rowColors[row] = color;
      
      console.log(`Row "${row}" assigned theme color ${colorKey} (${color})`);
    });
    
    // Calculate x and y positions for each point
    const chartWidth = chartDimensions.width - chartDimensions.marginLeft - chartDimensions.marginRight;
    const chartHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;
    
    // Create scales for positioning with fixed steps for even distribution
    const xScale = (col: string) => {
      const index = data.columns.indexOf(col);
      // Use a fixed step size based on available width and number of columns
      const stepSize = chartWidth / Math.max(1, data.columns.length - 1);
      return chartDimensions.marginLeft + (index * stepSize);
    };
    
    const yScale = (row: string) => {
      const index = data.rows.indexOf(row);
      // Use a fixed step size for rows - make bubbles more spaced out vertically
      const availableHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;
      const stepSize = availableHeight / Math.max(1, data.rows.length);
      // Add a little offset to center the bubble with its label
      return chartDimensions.marginTop + (index * stepSize) + (stepSize / 2);
    };
    
    // No longer needed since we calculate these positions directly in the render
    
    // Create bubble data
    const transformedData: {
      row: string;
      col: string;
      x: number;
      y: number;
      size: number;
      color: string;
      value: number;
      frequency: number;
    }[] = [];
    
    // For each row (symptom, diagnosis, etc.)
    data.rows.forEach(row => {
      // For each date column
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        
        if (value > 0) {
          const frequency = rowFrequencies[row];
          
          // Calculate bubble size based on frequency
          let size = 5;
          if (frequency >= 10) size = 23;
          else if (frequency >= 9) size = 21;
          else if (frequency >= 8) size = 19;
          else if (frequency >= 7) size = 17;
          else if (frequency >= 6) size = 15;
          else if (frequency >= 5) size = 13;
          else if (frequency >= 4) size = 11;
          else if (frequency >= 3) size = 9;
          else if (frequency >= 2) size = 7;
          
          transformedData.push({
            row,
            col,
            x: xScale(col),
            y: yScale(row),
            size,
            color: rowColors[row],
            value,
            frequency,
          });
        }
      });
    });
    
    setBubbleData(transformedData);
  }, [data, themeName, themeColors, dataType, chartDimensions]);
  
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
        <div ref={containerRef} style={{ height: '280px', width: '100%', position: 'relative' }}>
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
          >
            {/* Y Axis Line */}
            <line 
              x1={chartDimensions.marginLeft} 
              y1={chartDimensions.marginTop} 
              x2={chartDimensions.marginLeft} 
              y2={chartDimensions.height - chartDimensions.marginBottom} 
              stroke="#ccc" 
              strokeWidth={1} 
            />
            
            {/* X Axis Line */}
            <line 
              x1={chartDimensions.marginLeft} 
              y1={chartDimensions.height - chartDimensions.marginBottom} 
              x2={chartDimensions.width - chartDimensions.marginRight} 
              y2={chartDimensions.height - chartDimensions.marginBottom} 
              stroke="#ccc" 
              strokeWidth={1} 
            />
            
            {/* Y Axis Labels with Colored Bullets */}
            {data.rows.map((row, index) => {
              // Calculate y position for consistent alignment
              const availableHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;
              const stepSize = availableHeight / Math.max(1, data.rows.length);
              const y = chartDimensions.marginTop + (index * stepSize) + (stepSize / 2);
              
              // Find the color for this row
              const rowBubble = bubbleData.find(b => b.row === row);
              const color = rowBubble ? rowBubble.color : themeColors.LOWEST;
              
              return (
                <g key={`y-label-${row}`}>
                  {/* Tick Line */}
                  <line 
                    x1={chartDimensions.marginLeft - 5} 
                    y1={y} 
                    x2={chartDimensions.marginLeft} 
                    y2={y} 
                    stroke="#ccc" 
                    strokeWidth={1} 
                  />
                  
                  {/* Colored Bullet */}
                  <circle 
                    cx={chartDimensions.marginLeft - 15} 
                    cy={y} 
                    r={4} 
                    fill={color} 
                  />
                  
                  {/* Label Text */}
                  <text 
                    x={chartDimensions.marginLeft - 25} 
                    y={y} 
                    textAnchor="end" 
                    dominantBaseline="middle" 
                    fontSize="9px" 
                    fill="#666"
                  >
                    {row}
                  </text>
                </g>
              );
            })}
            
            {/* X Axis Labels */}
            {data.columns.map((col, index) => {
              // Calculate x position for consistent alignment
              const chartWidth = chartDimensions.width - chartDimensions.marginLeft - chartDimensions.marginRight;
              const stepSize = chartWidth / Math.max(1, data.columns.length - 1);
              const x = chartDimensions.marginLeft + (index * stepSize);
              
              return (
                <g key={`x-label-${col}`} transform={`translate(${x},${chartDimensions.height - chartDimensions.marginBottom})`}>
                  {/* Tick Line */}
                  <line 
                    x1={0} 
                    y1={0} 
                    x2={0} 
                    y2={5} 
                    stroke="#ccc" 
                    strokeWidth={1} 
                  />
                  
                  {/* Label Text - Rotated 45 degrees */}
                  <text 
                    transform="translate(0,7)rotate(45)" 
                    textAnchor="start" 
                    dominantBaseline="text-before-edge" 
                    fontSize="9px" 
                    fill="#666"
                  >
                    {col}
                  </text>
                </g>
              );
            })}
            
            {/* Bubbles */}
            {bubbleData.map((bubble, index) => (
              <circle 
                key={`bubble-${index}`} 
                cx={bubble.x} 
                cy={bubble.y} 
                r={bubble.size / 2} 
                fill={bubble.color} 
                opacity={0.8} 
              />
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};