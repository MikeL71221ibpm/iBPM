import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  size: number;
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

// Generate distinct colors for rows
const generateRowColors = (rows: string[]) => {
  // Predefined set of distinct colors
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
    '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
    '#393b79', '#637939', '#8c6d31', '#843c39', '#7b4173',
    '#5254a3', '#8ca252', '#bd9e39', '#ad494a', '#a55194',
    '#6b6ecf', '#b5cf6b', '#e6ab02', '#a6761d', '#e7969c',
    '#7570b3', '#66a61e', '#a6761d', '#666666', '#1b9e77',
    '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
    '#a6761d', '#666666', '#e41a1c', '#377eb8', '#4daf4a',
    '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'
  ];

  // Map rows to colors, recycle colors if there are more rows than colors
  const rowColors: Record<string, string> = {};
  rows.forEach((row, index) => {
    rowColors[row] = colors[index % colors.length];
  });

  return rowColors;
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// ScatterSection component for displaying a specific data type
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
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [tooltipData, setTooltipData] = React.useState<{
    x: string;
    y: string;
    size: number;
    visible: boolean;
    color?: string;
  } | null>(null);
  
  // Use refs to track the debounce timers
  const tooltipTimerRef = React.useRef<number | null>(null);
  const tooltipCleanupRef = React.useRef<number | null>(null);
  
  // Clean up timers on component unmount
  React.useEffect(() => {
    return () => {
      // Clear any pending timers when component unmounts
      if (tooltipTimerRef.current !== null) {
        window.clearTimeout(tooltipTimerRef.current);
      }
      if (tooltipCleanupRef.current !== null) {
        window.clearTimeout(tooltipCleanupRef.current);
      }
    };
  }, []);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Fetch data from API
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: dataType === 'category' ? 10 : 3, // More retries for category data
    retryDelay: 1500,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  // Row colors mapping - each row gets its own color
  const rowColors = React.useMemo(() => {
    if (!data || !data.rows) return {};
    return generateRowColors(data.rows);
  }, [data]);

  // Process data into scatter plot format - one series per row
  const scatterData = React.useMemo(() => {
    if (!data || !data.rows || !data.columns || !data.data) return [];
    
    // Add debugging for the specific rows we're investigating
    if (dataType === 'hrsn') {
      console.log("HRSN Raw Data:", data);
      
      // Debug specifically for maltreatment entries
      const maltreatmentRows = data.rows.filter(row => 
        row.includes('maltreatment') || row.includes('Maltreatment'));
      
      console.log("Found maltreatment rows:", maltreatmentRows);
      
      // Check each maltreatment row for data on 12/16/24
      maltreatmentRows.forEach(row => {
        const rowData = data.data[row] || {};
        console.log(`${row} data:`, rowData);
        if ('12/16/24' in rowData) {
          console.log(`${row} on 12/16/24:`, rowData['12/16/24']);
        }
      });
      
      if (data.rows.includes('abandonment')) {
        const abandonmentData = data.data['abandonment'] || {};
        console.log("Abandonment data:", abandonmentData);
        console.log("Dates with abandonment:", Object.keys(abandonmentData).filter(date => abandonmentData[date] > 0));
      }
      
      if (data.rows.some(row => row.includes('vape'))) {
        const vapeRow = data.rows.find(row => row.includes('vape'));
        if (vapeRow) {
          const vapeData = data.data[vapeRow] || {};
          console.log("Vape data:", vapeData);
          console.log("Dates with vape:", Object.keys(vapeData).filter(date => vapeData[date] > 0));
        }
      }
    }
    
    // Each row becomes its own series
    return data.rows.map(row => {
      const rowData: ScatterDataPoint[] = [];
      
      // Go through each column (date) and add a point if there's a value
      data.columns.forEach(column => {
        const value = data.data[row]?.[column];
        if (value && value > 0) {
          rowData.push({
            x: column,
            y: row,
            size: value
          });
        }
      });
      
      return {
        id: row,
        data: rowData
      };
    }).filter(series => series.data.length > 0);
  }, [data, dataType]);
  
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

  // Get max value for sizing
  const maxValue = data.maxValue || 1;
  
  // Dynamic margin based on compact mode
  const margin = compact 
    ? { top: 40, right: 30, bottom: 70, left: 180 } 
    : { top: 60, right: 140, bottom: 100, left: 200 };
  
  // Enhanced scatter plot 
  const ScatterChart = () => {
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <ResponsiveScatterPlot
          data={scatterData}
          margin={margin}
          xScale={{ type: 'point' }}
          yScale={{ type: 'point' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 46,
            truncateTickAt: 0
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legendPosition: 'middle',
            legendOffset: -50,
            truncateTickAt: 0,
            renderTick: (tick) => {
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line stroke="#bbb" strokeWidth={1} x1={0} x2={-6} y1={0} y2={0} />
                  <circle
                    cx={-12}
                    cy={0}
                    r={3}
                    fill={rowColors[tick.value] || '#888'}
                    stroke="#888"
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="end"
                    dominantBaseline="central"
                    style={{
                      fontFamily: 'sans-serif',
                      fontSize: 10
                    }}
                    x={-20}
                    y={0}
                  >
                    {/* Show label and total occurrence count across all dates */}
                    {tick.value} {data.data[tick.value] ? 
                      `(${Object.values(data.data[tick.value])
                        .filter(v => typeof v === 'number')
                        .reduce((sum, val) => sum + val, 0)})` 
                      : ''}
                  </text>
                </g>
              );
            }
          }}
          // Use the color lookup to color each series/row consistently
          colors={(d: any) => {
            // For Nivo ScatterPlot the node can have either 'id' or 'serieId' depending on context
            const key = d.id || d.serieId;
            return rowColors[key] || '#888';
          }}
          // Node size is based on value - each occurrence increases the size with more dramatic scaling
          nodeSize={(d) => {
            // Scale node size based on the actual number of occurrences
            const occurrences = d.data.size;
            
            // More dramatic scaling - 1 occurrence = 4px, 2 occurrences = 7px, 3 occurrences = 10px, etc.
            // Minimum size of 4px, grows by 3px per occurrence, max of 16px
            const scaledSize = Math.max(4, Math.min(16, 4 + (occurrences - 1) * 3));
            
            return scaledSize;
          }}
          blendMode="normal"
          useMesh={true}
          tooltip={() => null} // Disable default tooltip completely
          onMouseMove={(node) => {
            if (!node.data) return;
            
            const datum = node.data;
            const value = datum.size || 0;
            const seriesId = node.serieId || '';
            const color = rowColors[seriesId] || '#3B82F6';
            
            // Debug log for maltreatment on 12/16/24
            if ((datum.y === 'adult maltreatment' || datum.y === ' maltreatment' || datum.y === ' adult maltreatment') && datum.x === '12/16/24') {
              console.log(`Found maltreatment data for 12/16/24:`, datum.y, 'Occurrences:', value);
            }
            
            // Clear any existing timer
            if (tooltipTimerRef.current !== null) {
              window.clearTimeout(tooltipTimerRef.current);
            }
            
            // Set a new timer to show tooltip after a short delay (prevents flickering)
            tooltipTimerRef.current = window.setTimeout(() => {
              setTooltipData({
                x: datum.x,
                y: datum.y,
                size: value,
                visible: true,
                color: color
              });
            }, 100); // 100ms delay before showing tooltip
          }}
          onMouseLeave={() => {
            // Clear any pending tooltip timer
            if (tooltipTimerRef.current !== null) {
              window.clearTimeout(tooltipTimerRef.current);
              tooltipTimerRef.current = null;
            }
            
            // Clear any existing cleanup timer
            if (tooltipCleanupRef.current !== null) {
              window.clearTimeout(tooltipCleanupRef.current);
            }
            
            // Hide tooltip after a brief delay to prevent flickering
            tooltipCleanupRef.current = window.setTimeout(() => {
              setTooltipData(null);
              tooltipCleanupRef.current = null;
            }, 300);
          }}
        />
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
      
      {/* Chart container with fixed height */}
      <div className="w-full h-96 border rounded-md overflow-hidden relative" ref={chartRef}>
        <ScatterChart />
        
        {/* Fixed-position centered tooltip */}
        {tooltipData && tooltipData.visible && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Semi-transparent overlay */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-30"
              onClick={() => setTooltipData(null)}
            ></div>
            
            {/* Tooltip content */}
            <div 
              className="relative z-10 bg-white p-4 rounded-md shadow-lg border-2 border-blue-500 max-w-xs"
              style={{ 
                borderColor: tooltipData.color || '#3B82F6'
              }}
            >
              <div className="flex justify-between items-center mb-2 pb-1 border-b">
                <div className="font-bold text-sm">Data Point</div>
                <button 
                  onClick={() => setTooltipData(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs my-1"><strong>Date:</strong> {tooltipData.x || 'Unknown'}</div>
              <div className="text-xs my-1"><strong>Item:</strong> {tooltipData.y || 'Unknown'}</div>
              <div className="text-xs my-1">
                <strong>Times mentioned in this session:</strong> {tooltipData.size}
                {tooltipData.size > 1 && (
                  <div className="mt-1 text-xs text-amber-600">
                    This item was mentioned multiple times in this session
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Expanded view dialog */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>{displayName} - Full View</DialogTitle>
              <DialogDescription>
                Each row has its own color. Bubble size indicates occurrences (larger = more times mentioned).
              </DialogDescription>
            </DialogHeader>
            
            {data && (
              <div className="w-full h-[calc(90vh-10rem)] min-h-[500px] bg-white border rounded p-4">
                {/* Create a new chart with a wider margin for expanded view */}
                <ResponsiveScatterPlot
                  data={scatterData}
                  margin={{ top: 60, right: 140, bottom: 100, left: 300 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'point' }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legendPosition: 'middle',
                    legendOffset: 46,
                    truncateTickAt: 0
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legendPosition: 'middle',
                    legendOffset: -50,
                    truncateTickAt: 0,
                    renderTick: (tick) => {
                      return (
                        <g transform={`translate(${tick.x},${tick.y})`}>
                          <line stroke="#bbb" strokeWidth={1} x1={0} x2={-6} y1={0} y2={0} />
                          <circle
                            cx={-12}
                            cy={0}
                            r={3}
                            fill={rowColors[tick.value] || '#888'}
                            stroke="#888"
                            strokeWidth={1}
                          />
                          <text
                            textAnchor="end"
                            dominantBaseline="central"
                            style={{
                              fontFamily: 'sans-serif',
                              fontSize: 12
                            }}
                            x={-20}
                            y={0}
                          >
                            {/* Show label and total occurrence count across all dates */}
                            {tick.value} {data.data[tick.value] ? 
                              `(${Object.values(data.data[tick.value])
                                .filter(v => typeof v === 'number')
                                .reduce((sum, val) => sum + val, 0)})` 
                              : ''}
                          </text>
                        </g>
                      );
                    }
                  }}
                  colors={(d: any) => {
                    // For Nivo ScatterPlot the node can have either 'id' or 'serieId' depending on context
                    const key = d.id || d.serieId;
                    return rowColors[key] || '#888';
                  }}
                  nodeSize={(d) => {
                    // Scale node size based on the actual number of occurrences
                    const occurrences = d.data.size;
                    
                    // Larger size for expanded view
                    const scaledSize = Math.max(6, Math.min(24, 6 + (occurrences - 1) * 4));
                    
                    return scaledSize;
                  }}
                  blendMode="normal"
                  useMesh={true}
                  tooltip={() => null} // Disable default tooltip completely
                  onMouseMove={(node) => {
                    if (!node.data) return;
                    
                    const datum = node.data;
                    const value = datum.size || 0;
                    const seriesId = node.serieId || '';
                    const color = rowColors[seriesId] || '#3B82F6';
                    
                    // Clear any existing timer
                    if (tooltipTimerRef.current !== null) {
                      window.clearTimeout(tooltipTimerRef.current);
                    }
                    
                    // Set a new timer to show tooltip after a short delay (prevents flickering)
                    tooltipTimerRef.current = window.setTimeout(() => {
                      setTooltipData({
                        x: datum.x,
                        y: datum.y,
                        size: value,
                        visible: true,
                        color: color
                      });
                    }, 100); // 100ms delay before showing tooltip
                  }}
                  onMouseLeave={() => {
                    // Clear any pending tooltip timer
                    if (tooltipTimerRef.current !== null) {
                      window.clearTimeout(tooltipTimerRef.current);
                      tooltipTimerRef.current = null;
                    }
                    
                    // Clear any existing cleanup timer
                    if (tooltipCleanupRef.current !== null) {
                      window.clearTimeout(tooltipCleanupRef.current);
                    }
                    
                    // Hide tooltip after a brief delay to prevent flickering
                    tooltipCleanupRef.current = window.setTimeout(() => {
                      setTooltipData(null);
                      tooltipCleanupRef.current = null;
                    }, 300);
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoRowColors() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-row-colors/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

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
            Row-colored bubble chart visualization - each item has its own distinct color.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 p-3 mb-4 rounded-md border">
            <div className="text-xs text-slate-600">
              <strong>Bubble Chart Legend</strong>:
              <ul className="mt-1 ml-2 list-disc list-inside">
                <li>Each row has its own <span className="font-medium">color</span> (shown as a dot next to the label)</li>
                <li>A bubble appears whenever an item is mentioned in a session</li>
                <li>Bubble <span className="font-medium">size</span> increases with the number of mentions in that specific session</li>
                <li>Hover over any bubble to see exact details for that session</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end mb-4">
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
                onClick={() => setLocation(`/nivo-multi-series/${patientToDisplay}`)}
              >
                Intensity Colors
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
  );
}