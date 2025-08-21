import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

// Define theme type for TypeScript
type ThemeName = 'iridis' | 'viridis' | 'highContrast' | 'redBlue';

// Define multiple color schemes
const COLOR_THEMES = {
  // Iridis (purple-blue) theme
  iridis: {
    name: "Iridis (Purple-Blue)",
    HIGHEST: '#6A0DAD',  // Highest - Deep purple
    HIGH: '#9370DB',     // High - Medium purple
    MEDIUM: '#B19CD9',   // Medium - Light purple
    LOW: '#CCCCFF',      // Low - Very light purple
    LOWEST: '#F8F8FF',   // Lowest - Almost white with slight purple
  },
  
  // Viridis color scheme - colorblind friendly
  viridis: {
    name: "Viridis (Colorblind-friendly)",
    HIGHEST: '#440154',  // Highest - Dark purple
    HIGH: '#31688E',     // High - Dark teal
    MEDIUM: '#35B779',   // Medium - Green
    LOW: '#90D743',      // Low - Light green
    LOWEST: '#FDE725',   // Lowest - Yellow
  },
  
  // High contrast theme
  highContrast: {
    name: "High Contrast",
    HIGHEST: '#000000',  // Highest - Black
    HIGH: '#555555',     // High - Dark gray
    MEDIUM: '#999999',   // Medium - Medium gray
    LOW: '#DDDDDD',      // Low - Light gray
    LOWEST: '#FFFFFF',   // Lowest - White
  },
  
  // Red-Blue (diverging) - also colorblind friendly
  redBlue: {
    name: "Red-Blue",
    HIGHEST: '#9E0142',  // Highest - Dark red
    HIGH: '#F46D43',     // High - Orange
    MEDIUM: '#FFFFFF',   // Medium - White
    LOW: '#74ADD1',      // Low - Light blue
    LOWEST: '#313695',   // Lowest - Dark blue
  },
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component
export default function SimpleBubbleChartFixed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('iridis');
  
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
                setCurrentTheme(value as ThemeName);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select color theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iridis">Iridis (Purple-Blue)</SelectItem>
                <SelectItem value="viridis">Viridis (Green-Blue)</SelectItem>
                <SelectItem value="highContrast">High Contrast</SelectItem>
                <SelectItem value="redBlue">Red-Blue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/export-grids-to-pdf", "_blank")}
          >
            Export Grids to PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/export-grids-to-png", "_blank")}
          >
            Export Grids to PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/simplified-auto-pivot/1", "_blank")}
          >
            View Pivot Tables
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/enhanced-heatmap-view-fixed/1", "_blank")}
          >
            View Heatmaps
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Simulate refreshing data by toggling theme
              const newTheme = currentTheme === 'iridis' ? 'viridis' : 'iridis';
              setCurrentTheme(newTheme);
              setTimeout(() => setCurrentTheme(currentTheme), 100);
            }}
          >
            Refresh Data
          </Button>
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

// Bubble Chart Card Component
const BubbleChartCard = ({ 
  dataType, 
  patientId,
  themeName
}: { 
  dataType: string; 
  patientId: string;
  themeName: ThemeName;
}) => {
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  const endpointName = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS];
  
  console.log(`BubbleChartCard rendered: ${dataType} with theme: ${themeName}`);
  
  // Get the active color theme
  const themeColors = COLOR_THEMES[themeName];
  
  // Fetch the data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${endpointName}/${patientId}`],
  });
  
  // State for transformed bubble data
  const [bubbleData, setBubbleData] = useState<{
    id: string;
    row: string;
    col: string;
    x: number;
    y: number;
    size: number;
    color: string;
    value: number;
    frequency: number;
  }[]>([]);
  
  // Fixed dimensions for visualization
  const chartDimensions = {
    width: 600,
    height: 400, // Increased height to accommodate 14 rows
    marginTop: 20,
    marginRight: 20,
    marginBottom: 20, // Reduced bottom margin
    marginLeft: 180,
  };
  
  // Effect to transform data when it changes or theme changes
  useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log(`Processing data for ${dataType} with theme: ${themeName}`);
    console.log("USING COLORS:", themeColors);
    
    // Calculate frequencies for each row
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
    
    // Limit to exactly 14 rows for display
    // Sort rows by frequency to show the most common items first
    const sortedRows = [...data.rows].sort((a, b) => {
      return (rowFrequencies[b] || 0) - (rowFrequencies[a] || 0);
    });
    
    // Take only the first 14 rows or all if less than 14
    const displayRows = sortedRows.slice(0, 14);
    
    // Create a color mapping that assigns colors to each row
    const colorKeys = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;
    const rowColors: Record<string, string> = {};
    
    // Assign a color to each row cyclically from our theme palette
    displayRows.forEach((row, index) => {
      const colorKey = colorKeys[index % colorKeys.length] as keyof typeof themeColors;
      const color = themeColors[colorKey];
      rowColors[row] = color;
      
      // For debugging color assignment
      console.log(`Row "${row}" assigned theme color ${colorKey} (${color})`);
    });
    
    // Create bubble data
    const transformedData: {
      id: string;
      row: string;
      col: string;
      x: number;
      y: number;
      size: number;
      color: string;
      value: number;
      frequency: number;
    }[] = [];
    
    // Calculate chart area dimensions
    const chartWidth = chartDimensions.width - chartDimensions.marginLeft - chartDimensions.marginRight;
    const chartHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;
    
    // Fixed number of rows (14) with equal spacing
    const exactRowCount = 14;
    const yStep = chartHeight / exactRowCount;
    
    // For each row (symptom, diagnosis, etc.)
    displayRows.forEach((row, rowIndex) => {
      // For each date column
      data.columns.forEach((col, colIndex) => {
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
          
          // Calculate positions carefully
          // For x-position, distribute evenly across the width
          const xPos = chartDimensions.marginLeft + 
            (colIndex / Math.max(1, data.columns.length - 1)) * chartWidth;
          
          // For y-position, ensure equal spacing between rows
          const yPos = chartDimensions.marginTop + (rowIndex * yStep) + (yStep / 2);
          
          transformedData.push({
            id: `${row}-${col}`,
            row,
            col,
            x: xPos,
            y: yPos,
            size,
            color: rowColors[row], // Use row-specific color
            value,
            frequency,
          });
        }
      });
    });
    
    setBubbleData(transformedData);
  }, [data, themeName, themeColors, dataType]);
  
  // State for expanded view - must be before any conditional returns
  const [isExpanded, setIsExpanded] = useState(false);
  
  // SVG reference for the download function - must be before any conditional returns
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  // Function to handle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Function to download the chart as an SVG
  const downloadAsSVG = () => {
    if (!svgRef.current) return;
    
    // Create a clone of the SVG to avoid modifying the displayed one
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // Add a white background
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "white");
    svgClone.insertBefore(background, svgClone.firstChild);
    
    // Create a serialized version of the SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // Create a link to download the SVG and trigger the download
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${typeInfo?.name || dataType}_chart_p${patientId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Release the object URL
    URL.revokeObjectURL(svgUrl);
  };
  
  if (isLoading) {
    return (
      <Card className="h-[450px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
          <CardDescription className="text-xs">{typeInfo?.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[380px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="h-[450px] w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[380px]">
          <p className="text-destructive">{error ? 'Error loading data' : 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate row frequencies for display
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
  
  // Limit to exactly 14 rows for display
  // Sort rows by frequency to show the most common items first
  const sortedRows = [...data.rows].sort((a, b) => {
    return (rowFrequencies[b] || 0) - (rowFrequencies[a] || 0);
  });
  
  // Take only the first 14 rows or all if less than 14
  const displayRows = sortedRows.slice(0, 14);
  
  // Fixed number of rows (14) with equal spacing
  const exactRowCount = 14;
  const chartHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;
  const yStep = chartHeight / exactRowCount;
  
  return (
    <Card className={`w-full ${isExpanded ? 'fixed inset-8 z-50 h-[calc(100vh-64px)]' : 'h-[450px]'} overflow-hidden transition-all duration-300`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{typeInfo?.name || dataType}</CardTitle>
            <CardDescription className="text-xs">ID: P{patientId.padStart(4, '0')} | {data.rows.length} items | Theme: {themeName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleExpand}
              className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? 
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg> 
                : 
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              }
            </button>
            <button 
              onClick={downloadAsSVG}
              className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title="Download SVG"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-2 overflow-visible" style={{ height: isExpanded ? 'calc(100% - 64px)' : 380 }}>
        <div style={{ height: isExpanded ? 'calc(100% - 10px)' : '380px', width: '100%', position: 'relative' }}>
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
            className="overflow-visible"
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
            {displayRows.map((row, index) => {
              const yPos = chartDimensions.marginTop + (index * yStep) + (yStep / 2);
              const xPos = chartDimensions.marginLeft;
              
              // Find the color for this row - use the same colorKeys as used for bubble generation
              const colorKeys = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;
              const colorKey = colorKeys[index % colorKeys.length] as keyof typeof themeColors;
              const color = themeColors[colorKey];
              
              return (
                <g key={`y-label-${row}`}>
                  {/* Tick Line */}
                  <line 
                    x1={xPos - 5} 
                    y1={yPos} 
                    x2={xPos} 
                    y2={yPos} 
                    stroke="#ccc" 
                    strokeWidth={1} 
                  />
                  
                  {/* Colored Bullet */}
                  <circle 
                    cx={xPos - 15} 
                    cy={yPos} 
                    r={4} 
                    fill={color} 
                  />
                  
                  {/* Label Text */}
                  <text 
                    x={xPos - 25} 
                    y={yPos} 
                    textAnchor="end" 
                    dominantBaseline="middle"
                    fontSize="9px" 
                    fill="#666"
                  >
                    {row} ({rowFrequencies[row] || 0})
                  </text>
                </g>
              );
            })}
            
            {/* X Axis Labels */}
            {data.columns.map((col, index) => {
              // Use the same calculation as for the bubbles
              const chartWidth = chartDimensions.width - chartDimensions.marginLeft - chartDimensions.marginRight;
              const xPos = chartDimensions.marginLeft + (index / Math.max(1, data.columns.length - 1)) * chartWidth;
              const yPos = chartDimensions.height - chartDimensions.marginBottom;
              
              return (
                <g key={`x-label-${col}`} transform={`translate(${xPos},${yPos})`}>
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
            {bubbleData.map((bubble) => (
              <circle 
                key={bubble.id} 
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