import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

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

// Define API endpoint mappings (for types that have different endpoint names)
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
  value: number;
  color: string;
}

// Interface for API response data
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Define multiple color themes for different needs and preferences
const COLOR_THEMES = {
  // Original Iridis (purple-blue) theme
  iridis: {
    name: "Iridis (Purple-Blue)",
    HIGHEST: '#994C99',  // Deep purple 
    HIGH: '#8856A7',     // Dark purple
    MEDIUM: '#8C96C6',   // Purple
    LOW: '#B3CDE3',      // Blue/purple
    LOWEST: '#EDF8FB',   // Light blue/purple
  },
  
  // Viridis color scheme - colorblind friendly
  viridis: {
    name: "Viridis (Colorblind-friendly)",
    HIGHEST: '#440154',  // Dark purple
    HIGH: '#3B528B',     // Blue
    MEDIUM: '#21908C',   // Teal
    LOW: '#5DC963',      // Green
    LOWEST: '#FDE725',   // Yellow
  },
  
  // High contrast theme
  highContrast: {
    name: "High Contrast",
    HIGHEST: '#000000',  // Black
    HIGH: '#404040',     // Dark gray
    MEDIUM: '#808080',   // Medium gray
    LOW: '#C0C0C0',      // Light gray
    LOWEST: '#FFFFFF',   // White
  },
  
  // Red-Blue (diverging) - also colorblind friendly
  redBlue: {
    name: "Red-Blue",
    HIGHEST: '#67001F',  // Dark red
    HIGH: '#B2182B',     // Red
    MEDIUM: '#F7F7F7',   // White
    LOW: '#2166AC',      // Blue
    LOWEST: '#053061',   // Dark blue
  },
};

// Theme context to share theme state across components
interface ThemeContextType {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  themeColors: typeof COLOR_THEMES.iridis;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('iridis');
  const themeColors = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Color Theme:</span>
      <select 
        className="text-sm border rounded px-2 py-1"
        value={currentTheme}
        onChange={(e) => setCurrentTheme(e.target.value)}
      >
        {Object.entries(COLOR_THEMES).map(([key, theme]) => (
          <option key={key} value={key}>{theme.name}</option>
        ))}
      </select>
    </div>
  );
};

// Component for displaying a section of scatter plot data
const ScatterSection = ({ 
  dataType, 
  patientId,
  compact = true 
}: { 
  dataType: string; 
  patientId: string;
  compact?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  const { themeColors } = useTheme();
  
  // Fetch data from API
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: dataType === 'category' ? 3 : 2, // More retries for category data
    retryDelay: 1000,
    staleTime: 60000
  });
  
  // Process data for visualization
  const scatterData = React.useMemo(() => {
    if (!data) return [];
    
    // Check for valid data structure first
    if (!data.rows || !data.columns || !data.data || !Array.isArray(data.rows) || 
        !Array.isArray(data.columns) || typeof data.data !== 'object') {
      console.error(`Invalid data structure for ${dataType}:`, data);
      return [];
    }
    
    console.log(`Processing ${dataType} data: ${data.rows.length} rows, ${data.columns.length} columns`);
    
    const points: ScatterDataPoint[] = [];
    
    // Process each row and column combination
    data.rows.forEach((row) => {
      if (!row) return; // Skip invalid rows
      
      data.columns.forEach((column) => {
        if (!column) return; // Skip invalid columns
        
        const rowData = data.data[row];
        if (!rowData) return; // Skip if row data is missing
        
        const value = rowData[column] || 0;
        if (value > 0) {
          // Calculate normalized value and get color from theme
          const normalizedValue = value / data.maxValue;
          const color = getThemeColor(normalizedValue, themeColors);
          
          // Create a data point with the theme color
          points.push({
            x: column,
            y: row,
            value,
            color: color
          });
        }
      });
    });
    
    console.log(`Generated ${points.length} data points for ${dataType}`);
    return points;
  }, [data, dataType, themeColors]);
  
  // Generate color legend
  const renderColorLegend = () => {
    return (
      <div className="flex items-center gap-2 mt-1 mb-2 text-xs">
        <div className="flex items-center">
          <div style={{ width: 12, height: 12, backgroundColor: themeColors.HIGHEST, borderRadius: '50%' }} />
          <span className="ml-1">Highest</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: themeColors.HIGH, borderRadius: '50%' }} />
          <span className="ml-1">High</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: themeColors.MEDIUM, borderRadius: '50%' }} />
          <span className="ml-1">Medium</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: themeColors.LOW, borderRadius: '50%' }} />
          <span className="ml-1">Low</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 8, height: 8, backgroundColor: themeColors.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
          <span className="ml-1">Lowest</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium">{displayName}</h3>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            disabled={isLoading || !data}
          >
            Expand
          </Button>
        </div>
      </div>
      
      {/* Color legend */}
      {!isLoading && !error && data && renderColorLegend()}
      
      {/* Expanded view dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{displayName} - Full View</DialogTitle>
          </DialogHeader>
          
          {data && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-2 bg-slate-50 border-b mb-4">
                <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                <p className="text-sm text-gray-500">
                  Showing {data.rows.length} items. Bubble size indicates frequency count.
                </p>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">
                      Hover over bubbles to see details
                    </div>
                    <div className="flex items-center flex-wrap gap-3 text-xs">
                      <div className="flex items-center">
                        <div style={{ width: 14, height: 14, backgroundColor: themeColors.HIGHEST, borderRadius: '50%' }} />
                        <span className="ml-1">Highest (85-100%)</span>
                      </div>
                      <div className="flex items-center">
                        <div style={{ width: 12, height: 12, backgroundColor: themeColors.HIGH, borderRadius: '50%' }} />
                        <span className="ml-1">High (65-85%)</span>
                      </div>
                      <div className="flex items-center">
                        <div style={{ width: 12, height: 12, backgroundColor: themeColors.MEDIUM, borderRadius: '50%' }} />
                        <span className="ml-1">Medium (45-65%)</span>
                      </div>
                      <div className="flex items-center">
                        <div style={{ width: 12, height: 12, backgroundColor: themeColors.LOW, borderRadius: '50%' }} />
                        <span className="ml-1">Low (25-45%)</span>
                      </div>
                      <div className="flex items-center">
                        <div style={{ width: 10, height: 10, backgroundColor: themeColors.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
                        <span className="ml-1">Lowest (0-25%)</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
                
                <div 
                  className="flex-1 overflow-auto" 
                  style={{ 
                    height: '75vh',
                    maxHeight: '75vh'
                  }}
                >
                  <div style={{
                    height: Math.max(25 * data.rows.length, 
                      dataType === 'hrsn' ? 400 : (
                        dataType === 'category' ? 1000 : (
                          dataType === 'diagnosis' ? 2000 : 2500
                        )
                      )
                    ) + 'px',
                    minHeight: '600px',
                    width: '100%'
                  }}>
                    <DirectScatterChart 
                      data={scatterData} 
                      rows={data.rows}
                      columns={data.columns}
                      maxValue={data.maxValue}
                      compact={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data - Please try refreshing
          </div>
        ) : dataType === 'category' && (!data || !data.rows || data.rows.length === 0) ? (
          <div className="text-center py-4 text-amber-500 text-xs">
            No diagnostic categories available for this patient
          </div>
        ) : (
          <div 
            className="mt-1" 
            style={{ 
              height: dataType === 'hrsn' ? '170px' : '300px',
              overflowY: 'scroll',
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }}
          >
            <div style={{
              height: '400px',
              width: '100%',
              border: '1px solid #eaeaea'
            }}>
              {data && (
                <DirectScatterChart 
                  data={scatterData} 
                  rows={data.rows}
                  columns={data.columns}
                  maxValue={data.maxValue}
                  compact={compact}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Function to determine color based on normalized value using theme
function getThemeColor(normalizedValue: number, colors: typeof COLOR_THEMES.iridis): string {
  if (normalizedValue >= 0.85) return colors.HIGHEST;
  if (normalizedValue >= 0.65) return colors.HIGH;
  if (normalizedValue >= 0.45) return colors.MEDIUM;
  if (normalizedValue >= 0.25) return colors.LOW;
  return colors.LOWEST;
}

// Custom SVG-based Scatter Chart Component
const DirectScatterChart = ({ 
  data, 
  rows,
  columns,
  maxValue, 
  compact = false 
}: { 
  data: ScatterDataPoint[]; 
  rows: string[];
  columns: string[];
  maxValue: number;
  compact?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<{x: number, y: number, data: ScatterDataPoint} | null>(null);
  const { themeColors } = useTheme(); // Get theme colors
  
  // Calculate dimensions
  const margin = compact ? 
    { top: 10, right: 20, bottom: 60, left: Math.min(Math.max(10 * Math.max(...rows.map(r => r.length)), 100), 200) } :
    { top: 20, right: 40, bottom: 60, left: Math.min(Math.max(10 * Math.max(...rows.map(r => r.length)), 120), 250) };
  
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false };
  }, []);

  // Render the chart using SVG
  useEffect(() => {
    if (!svgRef.current || !rows.length || !columns.length) return;
    
    // For debugging
    console.log("Chart data available:", data.length > 0);
    console.log("Rows:", rows.length, "Columns:", columns.length);
    
    const svg = svgRef.current;
    const width = svg.clientWidth || 800; // Default width if clientWidth is 0
    const height = svg.clientHeight || 600; // Default height if clientHeight is 0
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Clear any existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Create container group with margin
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);
    
    // Calculate grid spacing
    const xStep = chartWidth / (columns.length > 1 ? columns.length - 1 : 1);
    const yStep = chartHeight / (rows.length > 1 ? rows.length - 1 : 1);
    
    // Draw grid lines
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.classList.add('grid-lines');
    g.appendChild(gridGroup);
    
    // Horizontal grid lines
    rows.forEach((_, i) => {
      const y = i * yStep;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', chartWidth.toString());
      line.setAttribute('y1', y.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', '#e6e6e6');
      line.setAttribute('stroke-width', '1');
      gridGroup.appendChild(line);
    });
    
    // Vertical grid lines
    columns.forEach((_, i) => {
      const x = i * xStep;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('x2', x.toString());
      line.setAttribute('y1', '0');
      line.setAttribute('y2', chartHeight.toString());
      line.setAttribute('stroke', '#e6e6e6');
      line.setAttribute('stroke-width', '1');
      gridGroup.appendChild(line);
    });
    
    // Create group for bubbles
    const bubblesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bubblesGroup.classList.add('bubbles');
    g.appendChild(bubblesGroup);
    
    // Draw data points
    data.forEach((d) => {
      const xIndex = columns.indexOf(d.x);
      const yIndex = rows.indexOf(d.y);
      
      if (xIndex >= 0 && yIndex >= 0) {
        const x = xIndex * xStep;
        const y = yIndex * yStep;
        
        // Calculate bubble size
        const minSize = compact ? 5 : 10;
        const maxSize = compact ? 30 : 50;
        const normalized = Math.sqrt(d.value / maxValue);
        const size = minSize + normalized * (maxSize - minSize);
        
        // Create circle element
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x.toString());
        circle.setAttribute('cy', y.toString());
        circle.setAttribute('r', (size / 2).toString());
        circle.setAttribute('fill', d.color);
        
        // Add interaction
        circle.addEventListener('mouseover', (e) => {
          if (isMounted.current) {
            setTooltipData({
              x: parseInt(circle.getAttribute('cx') || '0') + margin.left,
              y: parseInt(circle.getAttribute('cy') || '0') + margin.top,
              data: d
            });
          }
        });
        
        circle.addEventListener('mouseout', () => {
          if (isMounted.current) {
            setTooltipData(null);
          }
        });
        
        bubblesGroup.appendChild(circle);
      }
    });
    
    // Add axes
    
    // X-axis at the bottom
    const xAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisGroup.classList.add('x-axis');
    xAxisGroup.setAttribute('transform', `translate(0,${chartHeight})`);
    g.appendChild(xAxisGroup);
    
    // X-axis labels
    columns.forEach((col, i) => {
      const x = i * xStep;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = col;
      text.setAttribute('x', x.toString());
      text.setAttribute('y', '10');
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'hanging');
      text.setAttribute('transform', `rotate(-45, ${x}, 10)`);
      text.style.fontSize = compact ? '8px' : '10px';
      xAxisGroup.appendChild(text);
    });
    
    // Y-axis on the left
    const yAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yAxisGroup.classList.add('y-axis');
    g.appendChild(yAxisGroup);
    
    // Y-axis labels
    rows.forEach((row, i) => {
      const y = i * yStep;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const displayText = compact && row.length > 20 ? row.substring(0, 18) + '...' : row;
      text.textContent = displayText;
      text.setAttribute('x', '-10');
      text.setAttribute('y', y.toString());
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'middle');
      text.style.fontSize = compact ? '8px' : '10px';
      yAxisGroup.appendChild(text);
    });
    
  }, [data, rows, columns, margin, maxValue, compact]);
  
  // Generate tooltip content
  const renderTooltip = () => {
    if (!tooltipData) return null;
    
    const { x, y, data: d } = tooltipData;
    const normalizedValue = d.value / maxValue;
    let intensityLabel = '';
    
    if (normalizedValue >= 0.85) intensityLabel = 'Highest';
    else if (normalizedValue >= 0.65) intensityLabel = 'High';
    else if (normalizedValue >= 0.45) intensityLabel = 'Medium';
    else if (normalizedValue >= 0.25) intensityLabel = 'Low';
    else intensityLabel = 'Lowest';
    
    return (
      <div 
        className="absolute z-50 p-2 bg-white border border-gray-300 rounded shadow-md text-xs"
        style={{ 
          left: x + 10, 
          top: y - 10,
          maxWidth: '200px'
        }}
      >
        <div className="font-bold mb-1">{d.y}</div>
        <div>Date: <span className="font-semibold">{d.x}</span></div>
        <div>Frequency: <span className="font-semibold">{d.value}</span></div>
        <div>
          Intensity: <span className="font-semibold" style={{ color: d.color }}>{intensityLabel}</span>
        </div>
      </div>
    );
  };
  
  if (!data || data.length === 0 || rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  return (
    <div className="relative w-full h-full">
      <svg 
        ref={svgRef} 
        className="w-full h-full" 
        width="100%" 
        height="100%"
        style={{ minHeight: "200px" }}
      />
      {tooltipData && renderTooltip()}
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component - displays all four scatter plots in a grid layout
export default function DirectScatterView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/direct-scatter-view-themed/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <ThemeProvider>
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
              Quick overview of all patient data through bubble chart visualizations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-4">
              {/* Theme selector */}
              <ThemeSelector />
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
                >
                  View Pivot Tables
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/nivo-heatmap-view/${patientToDisplay}`)}
                >
                  View Heatmaps
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/nivo-scatter-view/${patientToDisplay}`)}
                >
                  View Nivo Scatter
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Data
                </Button>
              </div>
            </div>
            
            {/* Display all four scatter plots in a 2x2 grid - always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DATA_TYPES.map((type) => (
                <ScatterSection 
                  key={type.id} 
                  dataType={type.id} 
                  patientId={patientToDisplay}
                  compact={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}