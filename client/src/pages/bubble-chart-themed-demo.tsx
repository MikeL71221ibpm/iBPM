import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileIcon, FileTextIcon, ImageIcon, InfoIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

// Import custom styles for the bubble chart visualization
import './bubble-chart-styles.css';

// Define data types for visualization
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms', description: 'Patient symptoms extracted from clinical notes.' },
  { id: 'diagnosis', name: 'Diagnoses', description: 'Diagnosed conditions identified in clinical documentation.' },
  { id: 'diagnostic-category', name: 'Diagnostic Categories', description: 'Broader diagnostic classifications of conditions.' },
  { id: 'hrsn', name: 'HRSN Indicators', description: 'Health-related social needs affecting patient health.' }
];

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

// Define color themes
const COLOR_THEMES = {
  iridis: {
    name: "Iridis (Purple-Blue)",
    colors: ["#6A0DAD", "#9370DB", "#B19CD9", "#CCCCFF", "#F8F8FF"],
  },
  viridis: {
    name: "Viridis (Green-Blue)",
    colors: ["#440154", "#31688E", "#35B779", "#90D743", "#FDE725"],
  },
  highContrast: {
    name: "High Contrast",
    colors: ["#000000", "#555555", "#999999", "#DDDDDD", "#FFFFFF"],
  },
  redBlue: {
    name: "Red-Blue",
    colors: ["#9E0142", "#F46D43", "#FFFFFF", "#74ADD1", "#313695"],
  }
};

export default function BubbleChartThemedDemo() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const patientToDisplay = patientId || "1";
  
  // State for theme selection
  const [currentTheme, setCurrentTheme] = useState("iridis");
  
  // State to track which chart is expanded (null if none)
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // If a chart is expanded, show only that chart
  if (expandedChart) {
    const typeInfo = DATA_TYPES.find(t => t.id === expandedChart);
    
    return (
      <div className="fixed inset-0 z-50 bg-white p-6">
        <div className="flex flex-col h-full">
          {/* Header with export controls */}
          <div className="pb-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{typeInfo?.name} - Full View</h2>
              <p className="text-sm text-muted-foreground">
                Expanded view with detailed visualization and export options
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="h-8"
                onClick={() => alert("Exporting to Excel...")}
              >
                <FileIcon className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8"
                onClick={() => alert("Exporting to PDF...")}
              >
                <FileTextIcon className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8"
                onClick={() => alert("Exporting to PNG...")}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8"
                onClick={() => setExpandedChart(null)}
              >
                Close
              </Button>
            </div>
          </div>
          
          {/* Main content with data visualization */}
          <div className="grid-chart-container py-4 flex-1 overflow-auto">
            <div className="mb-3 px-1">
              <h3 className="text-base font-medium">Complete {typeInfo?.name} Data</h3>
              <p className="text-xs text-muted-foreground">Hover over bubbles to see details</p>
            </div>
            
            {/* Use SimpleBubbleChart in full screen mode instead of GridBubbleChart */}
            <div className="border rounded-md bg-white shadow-sm">
              <SimpleBubbleChart
                key={`${expandedChart}-${currentTheme}-full-page`}
                dataType={expandedChart}
                patientId={patientToDisplay}
                colorTheme={currentTheme}
                isFullScreen={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header section with patient info and theme selector */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Patient Bob Test{patientToDisplay} <span className="text-muted-foreground">ID#: P{patientToDisplay.padStart(4, '0')}</span></h1>
            <p className="text-sm text-muted-foreground">Quick overview of all patient data through bubble chart visualizations.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Color Theme:</span>
            <Select
              value={currentTheme}
              onValueChange={setCurrentTheme}
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
        <div className="flex flex-wrap gap-2 mb-6">
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
            onClick={() => window.open("/view-pivot-tables", "_blank")}
          >
            View Pivot Tables
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/view-heatmaps", "_blank")}
          >
            View Heatmaps
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Data refreshed!")}
          >
            Refresh Data
          </Button>
        </div>
        
        {/* Display charts in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DATA_TYPES.map((type) => (
            <SimpleBubbleChart 
              key={`${type.id}-${currentTheme}`}
              dataType={type.id}
              patientId={patientToDisplay}
              colorTheme={currentTheme}
              onExpand={() => setExpandedChart(type.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple Bubble Chart Component
function SimpleBubbleChart({
  dataType,
  patientId,
  colorTheme,
  isFullScreen = false,
  onExpand
}: {
  dataType: string;
  patientId: string;
  colorTheme: string;
  isFullScreen?: boolean;
  onExpand?: () => void;
}) {
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  
  // Get color theme
  const theme = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  
  // State for expanded view
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Fetch data from API
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
  });
  
  // State for SVG ref (for downloads)
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  // State for processed bubble data
  const [bubbles, setBubbles] = useState<any[]>([]);
  
  // Chart dimensions
  const dimensions = {
    width: 600,
    height: 400,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 20,
    marginLeft: 180
  };
  
  // Function to toggle expanded state
  const toggleExpand = () => {
    if (onExpand) {
      // If onExpand prop exists, use it to expand in the parent component
      onExpand();
    } else {
      // Otherwise fall back to local state (for backward compatibility)
      setIsExpanded(!isExpanded);
    }
  };
  
  // Process data when it changes or theme changes
  useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log(`Processing data with theme: ${colorTheme}`);
    
    // Calculate frequencies for each row
    const rowFrequencies: Record<string, number> = {};
    data.rows.forEach(row => {
      let count = 0;
      data.columns.forEach(col => {
        if (data.data[row]?.[col] > 0) count++;
      });
      rowFrequencies[row] = count;
    });
    
    // Sort rows by frequency and limit to 14
    const sortedRows = [...data.rows].sort((a, b) => 
      (rowFrequencies[b] || 0) - (rowFrequencies[a] || 0)
    ).slice(0, 14);
    
    // Process bubble data
    const processedBubbles: any[] = [];
    
    // Calculate chart dimensions - accounting for full screen mode
    const chartDims = isFullScreen ? {
      ...dimensions,
      width: 1200,
      height: 800,
      marginBottom: 80,  // Larger margin for expanded view date labels
      marginRight: 60,
      marginLeft: 200    // Wider left margin for row labels in expanded view
    } : dimensions;
    
    const chartWidth = chartDims.width - chartDims.marginLeft - chartDims.marginRight;
    const chartHeight = chartDims.height - chartDims.marginTop - chartDims.marginBottom;
    const yStep = chartHeight / 14; // Fixed 14 rows
    
    // Get colors from current theme
    // Important: Re-fetch the theme colors here to ensure we have the latest
    const currentThemeColors = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES].colors;
    console.log(`Using theme colors:`, currentThemeColors);
    
    sortedRows.forEach((row, rowIndex) => {
      // Assign color from theme
      const colorIndex = rowIndex % currentThemeColors.length;
      const color = currentThemeColors[colorIndex];
      
      data.columns.forEach((col, colIndex) => {
        const value = data.data[row]?.[col] || 0;
        if (value > 0) {
          const frequency = rowFrequencies[row];
          
          // Calculate bubble size based on frequency
          // Make bubbles larger in full screen mode
          let size = isFullScreen ? 12 : 5;
          if (frequency >= 10) size = isFullScreen ? 48 : 23;
          else if (frequency >= 9) size = isFullScreen ? 44 : 21;
          else if (frequency >= 8) size = isFullScreen ? 40 : 19;
          else if (frequency >= 7) size = isFullScreen ? 36 : 17;
          else if (frequency >= 6) size = isFullScreen ? 32 : 15;
          else if (frequency >= 5) size = isFullScreen ? 28 : 13;
          else if (frequency >= 4) size = isFullScreen ? 24 : 11;
          else if (frequency >= 3) size = isFullScreen ? 20 : 9;
          else if (frequency >= 2) size = isFullScreen ? 16 : 7;
          
          // Calculate position
          const xPos = chartDims.marginLeft + (colIndex / Math.max(1, data.columns.length - 1)) * chartWidth;
          const yPos = chartDims.marginTop + (rowIndex * yStep) + (yStep / 2);
          
          processedBubbles.push({
            id: `${row}-${col}-${colorTheme}-${isFullScreen ? 'fs' : 'card'}`, // Add mode to ID
            row,
            col,
            x: xPos,
            y: yPos,
            size,
            color, // Color from current theme
            value,
            frequency
          });
        }
      });
    });
    
    setBubbles(processedBubbles);
  }, [data, colorTheme, isFullScreen]); // Update when data, theme or display mode changes
  
  // Loading state
  if (isLoading) {
    return (
      <Card className="h-[450px] w-full">
        <CardHeader>
          <CardTitle className="text-base font-bold">{typeInfo?.name}</CardTitle>
          <CardDescription className="text-xs">{typeInfo?.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[380px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error || !data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="h-[450px] w-full">
        <CardHeader>
          <CardTitle className="text-base font-bold">{typeInfo?.name}</CardTitle>
          <CardDescription className="text-xs">No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[380px]">
          <p className="text-destructive">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get display rows (top 14 by frequency)
  const rowFrequencies: Record<string, number> = {};
  data.rows.forEach(row => {
    let count = 0;
    data.columns.forEach(col => {
      if (data.data[row]?.[col] > 0) count++;
    });
    rowFrequencies[row] = count;
  });
  
  const displayRows = [...data.rows]
    .sort((a, b) => (rowFrequencies[b] || 0) - (rowFrequencies[a] || 0))
    .slice(0, 14);
  
  // Calculate chart dimensions for the render phase
  const chartWidth = dimensions.width - dimensions.marginLeft - dimensions.marginRight;
  const chartHeight = dimensions.height - dimensions.marginTop - dimensions.marginBottom;
  const yStep = chartHeight / 14;
  
  // Download chart as SVG
  const downloadAsSVG = () => {
    if (!svgRef.current) return;
    
    // Create a clone of the SVG
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // Add a white background
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "white");
    svgClone.insertBefore(background, svgClone.firstChild);
    
    // Serialize the SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // Download it
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${typeInfo?.name || dataType}_chart_p${patientId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Release the object URL
    URL.revokeObjectURL(svgUrl);
  };


  // Adjust dimensions for "Fit to Page" expanded view mode with tighter space usage
  const chartDimensions = isFullScreen 
    ? {
        ...dimensions,
        width: 1400,         // Compact width
        height: 800,         // Reduced overall height
        marginBottom: 40,    // Smaller margin - dates will be diagonal now
        marginRight: 60,     // Slightly reduced right margin
        marginLeft: 260      // Reduced left margin for row labels
      } 
    : dimensions;
    
  // Calculate chart area size
  const actualChartWidth = chartDimensions.width - chartDimensions.marginLeft - chartDimensions.marginRight;
  const actualChartHeight = chartDimensions.height - chartDimensions.marginTop - chartDimensions.marginBottom;

  return (
    <Card 
      className={isFullScreen 
        ? "h-full w-full" 
        : "h-[450px] w-full overflow-hidden"}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{typeInfo?.name}</CardTitle>
            <CardDescription className="text-xs">ID: P{patientId.padStart(4, '0')} | Theme: {COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES].name}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleExpand}
              className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={isFullScreen ? "Return to Grid" : "Fit to Page"}
            >
              {isFullScreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              )}
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
      
      <CardContent 
        className={`p-0 pt-2 ${isFullScreen ? 'h-full overflow-visible' : 'h-[380px] overflow-hidden'}`}
      >
        <div className="relative" style={{ 
          height: isFullScreen ? '100%' : '100%',
          width: '100%', 
          minHeight: isFullScreen ? '600px' : undefined
        }}>
          {/* Main chart SVG with improved visibility in expanded view */}
          <svg 
            ref={svgRef}
            width={isFullScreen ? chartDimensions.width : "100%"} 
            height={isFullScreen ? chartDimensions.height : "100%"} 
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
            className={isFullScreen ? "expanded-chart-svg" : "overflow-visible"}
            preserveAspectRatio="xMinYMin meet"
            style={{
              display: "block",
              background: "white",
              border: isFullScreen ? "1px solid #e2e8f0" : "none",
              borderRadius: "4px"
            }}
          >
            {/* Background */}
            <rect 
              x={chartDimensions.marginLeft} 
              y={chartDimensions.marginTop} 
              width={actualChartWidth} 
              height={actualChartHeight} 
              fill="#f9f9f9" 
              opacity={0.3} 
            />
            
            {/* Gridlines - Horizontal */}
            {displayRows.map((_, index) => {
              const yPos = chartDimensions.marginTop + (index * yStep);
              return (
                <line 
                  key={`h-grid-${index}`}
                  x1={chartDimensions.marginLeft} 
                  y1={yPos} 
                  x2={chartDimensions.width - chartDimensions.marginRight} 
                  y2={yPos} 
                  stroke="#ddd" 
                  strokeWidth={0.5} 
                  strokeDasharray="3,3"
                />
              );
            })}
            
            {/* Gridlines - Vertical - For date columns */}
            {data.columns.map((_, colIndex) => {
              // Calculate x position
              const xPos = chartDimensions.marginLeft + (colIndex / Math.max(1, data.columns.length - 1)) * actualChartWidth;
              return (
                <line 
                  key={`v-grid-${colIndex}`}
                  x1={xPos} 
                  y1={chartDimensions.marginTop} 
                  x2={xPos} 
                  y2={chartDimensions.height - chartDimensions.marginBottom} 
                  stroke="#ddd" 
                  strokeWidth={0.5} 
                  strokeDasharray="3,3"
                />
              );
            })}
            
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
            
            {/* Date Labels - Now showing diagonally from bottom-left to top-right in fullscreen mode */}
            {data.columns.map((col, colIndex) => {
              // Calculate position based on mode
              const totalCols = data.columns.length;
              
              if (isFullScreen) {
                // DIAGONAL LABELS FOR FULLSCREEN MODE (bottom-left to top-right)
                // Use diagonal positioning
                const startX = chartDimensions.marginLeft;
                const startY = chartDimensions.height - chartDimensions.marginBottom;
                const endX = chartDimensions.width - chartDimensions.marginRight;
                const endY = chartDimensions.marginTop;
                
                // Calculate position along diagonal
                const progress = colIndex / Math.max(1, totalCols - 1);
                const xPos = startX + progress * (endX - startX);
                const yPos = startY - progress * (startY - endY);
                
                // Size and offset adjustments for diagonal labels
                const bgWidth = 60;
                const bgHeight = 24;
                const bgX = xPos - (bgWidth / 2);
                const bgY = yPos - (bgHeight / 2);
                
                return (
                  <g key={`x-label-${col}`} className="diagonal-date-label">
                    {/* Background for better visibility */}
                    <rect
                      x={bgX}
                      y={bgY}
                      width={bgWidth}
                      height={bgHeight}
                      fill="white"
                      fillOpacity={0.95}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                      rx={4}
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.1))"
                    />
                    {/* Date label */}
                    <text
                      x={xPos}
                      y={yPos}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12px"
                      fontWeight="bold"
                      fill="#333333"
                    >
                      {col}
                    </text>
                    
                    {/* Small indicator line */}
                    <line
                      x1={xPos}
                      y1={yPos + (bgHeight / 2) - 2}
                      x2={xPos}
                      y2={yPos + (bgHeight / 2) + 10}
                      stroke="#aaa"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                  </g>
                );
              } else {
                // STANDARD HORIZONTAL LABELS FOR CARD MODE
                // Calculate standard x position
                const xPos = chartDimensions.marginLeft + (colIndex / Math.max(1, totalCols - 1)) * actualChartWidth;
                const yPos = chartDimensions.height - chartDimensions.marginBottom + 15;
                
                // Create a standard background rect for card mode
                const bgWidth = 36;
                const bgHeight = 20;
                const bgX = xPos - (bgWidth / 2);
                const bgY = yPos - 8;
                
                return (
                  <g key={`x-label-${col}`}>
                    <rect
                      x={bgX}
                      y={bgY}
                      width={bgWidth}
                      height={bgHeight}
                      fill="white"
                      fillOpacity={0.95}
                      rx={3}
                    />
                    <text
                      x={xPos}
                      y={yPos}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8px"
                      fontWeight="bold"
                      fill="#333333"
                    >
                      {col}
                    </text>
                  </g>
                );
              }
            })}
            
            {/* Y Axis Labels with Colored Bullets */}
            {displayRows.map((row, index) => {
              const yPos = chartDimensions.marginTop + (index * yStep) + (yStep / 2);
              const xPos = chartDimensions.marginLeft;
              
              // Always get fresh colors directly from the current theme 
              const currentThemeColors = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES].colors;
              const colorIndex = index % currentThemeColors.length;
              const color = currentThemeColors[colorIndex]; 
              
              return (
                <g key={`label-${row}-${colorTheme}`}>
                  {/* Colored bullet */}
                  <circle 
                    cx={xPos-(isFullScreen ? 25 : 15)} 
                    cy={yPos} 
                    r={isFullScreen ? 6 : 4} 
                    fill={color} 
                  />
                  
                  {/* Label */}
                  <text
                    x={xPos-(isFullScreen ? 40 : 25)}
                    y={yPos}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={isFullScreen ? "14px" : "9px"}
                    fontWeight={isFullScreen ? "bold" : "normal"}
                    fill="#555"
                  >
                    {row} ({rowFrequencies[row]})
                  </text>
                </g>
              );
            })}
            
            {/* Enhanced bubbles with better visibility */}
            {bubbles.map(bubble => (
              <g key={bubble.id}>
                {/* Shadow effect for better depth perception in fullscreen mode */}
                {isFullScreen && (
                  <circle
                    cx={bubble.x}
                    cy={bubble.y}
                    r={(bubble.size/2) + 2}
                    fill="rgba(0,0,0,0.08)"
                  />
                )}
                {/* Main bubble */}
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={bubble.size/2}
                  fill={bubble.color}
                  opacity={isFullScreen ? 0.9 : 0.8}
                  stroke={isFullScreen ? "rgba(255,255,255,0.5)" : "none"}
                  strokeWidth={isFullScreen ? 1 : 0}
                />
                {/* Show value in large bubbles for fullscreen mode */}
                {isFullScreen && bubble.size > 30 && (
                  <text
                    x={bubble.x}
                    y={bubble.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10px"
                    fontWeight="bold"
                    style={{textShadow: '0px 1px 2px rgba(0,0,0,0.5)'}}
                  >
                    {bubble.value}
                  </text>
                )}
              </g>
            ))}
          </svg>
          
          {/* Diagonal date labels will now be drawn directly in the chart instead of here */}
        </div>
      </CardContent>
    </Card>
  );
}

// Grid Bubble Chart Component - For full page view with grid alignment
function GridBubbleChart({
  dataType,
  patientId,
  colorTheme
}: {
  dataType: string;
  patientId: string;
  colorTheme: string;
}) {
  const typeInfo = DATA_TYPES.find(t => t.id === dataType);
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);
  
  // Fetch data from API
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
  });
  
  // State for tooltip
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    content: '',
    visible: false
  });
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  if (error || !data || !data.rows || data.rows.length === 0) {
    return <div className="p-4 text-destructive">No data available</div>;
  }
  
  // Calculate frequencies for each row
  const rowFrequencies: Record<string, number> = {};
  data.rows.forEach(row => {
    let count = 0;
    data.columns.forEach(col => {
      if (data.data[row]?.[col] > 0) count++;
    });
    rowFrequencies[row] = count;
  });
  
  // Sort rows by frequency
  const sortedRows = [...data.rows]
    .sort((a, b) => (rowFrequencies[b] || 0) - (rowFrequencies[a] || 0))
    .slice(0, 14); // Limit to 14 rows for consistency
  
  // Get colors from current theme
  const currentThemeColors = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES].colors;
  
  // Handle bubble hover
  const handleBubbleHover = (
    row: string, 
    col: string, 
    value: number, 
    frequency: number,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: `${row} - ${col}: ${value} (${frequency} occurrences)`,
      visible: true
    });
  };
  
  // Handle bubble mouse leave
  const handleBubbleLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };
  
  // Calculate standardized bubble size
  const getBubbleSize = (frequency: number): number => {
    if (frequency >= 10) return 24;
    if (frequency >= 8) return 20;
    if (frequency >= 6) return 18;
    if (frequency >= 4) return 16;
    if (frequency >= 2) return 12;
    return 8;
  };

  return (
    <div className="fullpage-chart">
      <div className="bubble-grid">
        {/* Header row with date columns */}
        <div className="grid-header">
          <div className="grid-header-label">
            {typeInfo?.name}
          </div>
          <div className="grid-date-headers">
            {data.columns.map(col => (
              <div key={`header-${col}`} className="grid-date-header">
                {col}
              </div>
            ))}
          </div>
        </div>
        
        {/* Grid body with rows and cells */}
        <div className="grid-rows">
          {/* Row labels */}
          <div className="grid-row-labels">
            {sortedRows.map((row, index) => {
              const frequency = rowFrequencies[row] || 0;
              const colorIndex = index % currentThemeColors.length;
              const color = currentThemeColors[colorIndex];
              
              return (
                <div key={`label-${row}`} className="grid-row-label">
                  <div 
                    className="grid-row-label-bullet" 
                    style={{ backgroundColor: color }} 
                  />
                  <div className="grid-row-label-text">
                    {row} ({frequency})
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Grid cells */}
          <div className="grid-cells">
            {sortedRows.map(row => {
              const frequency = rowFrequencies[row] || 0;
              const colorIndex = sortedRows.indexOf(row) % currentThemeColors.length;
              const color = currentThemeColors[colorIndex];
              
              return (
                <div key={`row-${row}`} className="grid-row">
                  {data.columns.map(col => {
                    const value = data.data[row]?.[col] || 0;
                    const bubbleId = `${row}-${col}`;
                    const isHovered = hoveredBubble === bubbleId;
                    
                    return (
                      <div key={`cell-${row}-${col}`} className="grid-cell">
                        {value > 0 && (
                          <div
                            className="grid-bubble"
                            style={{
                              width: getBubbleSize(frequency),
                              height: getBubbleSize(frequency),
                              backgroundColor: color,
                              opacity: 0.85,
                              boxShadow: isHovered ? '0 0 8px rgba(0,0,0,0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              setHoveredBubble(bubbleId);
                              handleBubbleHover(row, col, value, frequency, e);
                            }}
                            onMouseLeave={() => {
                              setHoveredBubble(null);
                              handleBubbleLeave();
                            }}
                          >
                            {frequency >= 5 && (
                              <span style={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textShadow: '0 0 2px rgba(0,0,0,0.5)'
                              }}>
                                {value}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div 
          className="bubble-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}