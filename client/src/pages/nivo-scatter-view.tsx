import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  color: string; // Always include color - we'll set it directly in the data
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

// Define EXACT Iridis color scheme hex values - these will be used consistently everywhere
// Use the same values in both the legend and the bubbles to ensure they match
// DEBUGGING: Log these colors to make sure they're consistent across the app
console.log("USING COLORS:", {
  HIGHEST: '#994C99',
  HIGH: '#8856A7',
  MEDIUM: '#8C96C6',
  LOW: '#B3CDE3',
  LOWEST: '#EDF8FB'
});

const EXACT_COLORS = {
  HIGHEST: '#994C99',  // Highest - Deep purple 
  HIGH: '#8856A7',     // High - Dark purple
  MEDIUM: '#8C96C6',   // Medium - Purple
  LOW: '#B3CDE3',      // Low - Blue/purple
  LOWEST: '#EDF8FB',   // Lowest - Light blue/purple
};

// Single source of truth for the color values
const IRIDIS_COLORS = {
  highest: EXACT_COLORS.HIGHEST,
  high: EXACT_COLORS.HIGH,
  medium: EXACT_COLORS.MEDIUM,
  low: EXACT_COLORS.LOW,
  lowest: EXACT_COLORS.LOWEST,
};

// The ONLY color function to be used for bubbles - using direct hex codes
const getExactIridisColor = (normalizedValue: number): string => {
  // Using fixed threshold values for consistency in quantization
  if (normalizedValue >= 0.85) return EXACT_COLORS.HIGHEST;
  if (normalizedValue >= 0.65) return EXACT_COLORS.HIGH;
  if (normalizedValue >= 0.45) return EXACT_COLORS.MEDIUM;
  if (normalizedValue >= 0.25) return EXACT_COLORS.LOW;
  return EXACT_COLORS.LOWEST;
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
  
  // Process data into scatter plot format
  const scatterData = React.useMemo(() => {
    if (!data) return [];
    
    // Default fallback for diagnostic categories if there's an error
    if (dataType === 'category' && (!data.rows || data.rows.length === 0)) {
      // Create basic placeholder data for now
      console.log("Creating fallback data for diagnostic categories");
      return [{
        id: 'frequency',
        data: []
      }];
    }
    
    // Check for valid data structure first
    if (!data.rows || !data.columns || !data.data || !Array.isArray(data.rows) || 
        !Array.isArray(data.columns) || typeof data.data !== 'object') {
      console.error(`Invalid data structure for ${dataType}:`, data);
      return [];
    }
    
    // For scatter plot, we need a different approach than the original
    // We'll create a single series with all points
    const allPoints: ScatterDataPoint[] = [];
    
    try {
      // Process each row and column combination
      data.rows.forEach((row) => {
        if (!row) return; // Skip invalid rows
        
        data.columns.forEach((column) => {
          if (!column) return; // Skip invalid columns
          
          const rowData = data.data[row];
          if (!rowData) return; // Skip if row data is missing
          
          const value = rowData[column] || 0;
          if (value > 0) {
            // Calculate normalized value for coloring
            const normalizedValue = value / (data.maxValue || 1);
            
            // Determine color based on normalized value using our exact colors
            const bubbleColor = 
              normalizedValue >= 0.85 ? EXACT_COLORS.HIGHEST :
              normalizedValue >= 0.65 ? EXACT_COLORS.HIGH :
              normalizedValue >= 0.45 ? EXACT_COLORS.MEDIUM :
              normalizedValue >= 0.25 ? EXACT_COLORS.LOW :
              EXACT_COLORS.LOWEST;
              
            // Store the color directly in the data point
            allPoints.push({
              x: column,
              y: row,
              size: value,
              color: bubbleColor // Include exact color in the data point
            });
          }
        });
      });
    } catch (err) {
      console.error(`Error processing ${dataType} data:`, err);
    }
    
    // Return as a single series (even if empty)
    return [{
      id: 'frequency',
      data: allPoints
    }];
  }, [data, dataType]);
  
  // Extract max value for scaling bubbles
  const maxValue = data?.maxValue || 1;
  
  // Create color legend
  const renderColorLegend = () => {
    return (
      <div className="flex items-center gap-2 mt-1 mb-2 text-xs">
        <div className="flex items-center">
          <div style={{ width: 12, height: 12, backgroundColor: EXACT_COLORS.HIGHEST, borderRadius: '50%' }} />
          <span className="ml-1">Highest</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: EXACT_COLORS.HIGH, borderRadius: '50%' }} />
          <span className="ml-1">High</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: EXACT_COLORS.MEDIUM, borderRadius: '50%' }} />
          <span className="ml-1">Medium</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 10, height: 10, backgroundColor: EXACT_COLORS.LOW, borderRadius: '50%' }} />
          <span className="ml-1">Low</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: 8, height: 8, backgroundColor: EXACT_COLORS.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
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
      <div>
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
                          <div style={{ width: 14, height: 14, backgroundColor: EXACT_COLORS.HIGHEST, borderRadius: '50%' }} />
                          <span className="ml-1">Highest (85-100%)</span>
                        </div>
                        <div className="flex items-center">
                          <div style={{ width: 12, height: 12, backgroundColor: EXACT_COLORS.HIGH, borderRadius: '50%' }} />
                          <span className="ml-1">High (65-85%)</span>
                        </div>
                        <div className="flex items-center">
                          <div style={{ width: 12, height: 12, backgroundColor: EXACT_COLORS.MEDIUM, borderRadius: '50%' }} />
                          <span className="ml-1">Medium (45-65%)</span>
                        </div>
                        <div className="flex items-center">
                          <div style={{ width: 12, height: 12, backgroundColor: EXACT_COLORS.LOW, borderRadius: '50%' }} />
                          <span className="ml-1">Low (25-45%)</span>
                        </div>
                        <div className="flex items-center">
                          <div style={{ width: 10, height: 10, backgroundColor: EXACT_COLORS.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
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
                    ref={chartRef}
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
                      <ScatterVisualization 
                        data={scatterData} 
                        rows={data.rows}
                        maxValue={maxValue}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
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
              overflowY: 'scroll', // Force scrollbar to match pivot table style
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }}
            ref={chartRef}
          >
            <div style={{
              height: Math.max(22 * (data?.rows.length || 0), 
                dataType === 'hrsn' ? 250 : (
                  dataType === 'category' ? 750 : (
                    dataType === 'diagnosis' ? 1800 : 2300
                  )
                )
              ) + 'px',
              minHeight: '250px',
              width: '100%'
            }}>
              <ScatterVisualization 
                data={scatterData} 
                rows={data?.rows || []}
                maxValue={maxValue}
                compact={compact}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Scatter Visualization Component
const ScatterVisualization = ({ 
  data, 
  rows,
  maxValue, 
  compact = false 
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  compact?: boolean;
}) => {
  if (!data || data.length === 0 || rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Calculate margins based on the length of the row labels
  const maxLabelLength = Math.max(...rows.map(row => row.length));
  const leftMargin = Math.min(Math.max(8 * maxLabelLength, 100), compact ? 180 : 250);
  
  // Margins and styling
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: leftMargin } 
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ResponsiveScatterPlot
        data={data}
        margin={margin}
        xScale={{ 
          type: 'point',
        }}
        yScale={{ 
          type: 'point',
        }}
        // Make sure we show all labels even when no data points
        // We'll handle this in a different way since domain isn't supported directly
        axisTop={null}
        axisRight={null}
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
            // Truncate long labels if in compact mode
            const label = String(v);
            if (compact && label.length > 20) {
              return label.substring(0, 18) + '...';
            }
            return label;
          }
        }}
        nodeSize={(d: any) => {
          // Scale bubble size between 5 and 25 based on value, using square root scaling
          const minSize = compact ? 5 : 10;
          const maxSize = compact ? 30 : 50;
          const value = Number(d.data.size) || 0;
          const normalized = Math.sqrt(value / maxValue);
          return minSize + normalized * (maxSize - minSize);
        }}
        // Use the color directly from the data point that we set earlier
        colors={(d: any) => {
          if (!d.data || !d.data.color) return EXACT_COLORS.LOWEST;
          return d.data.color;
        }}
        blendMode="normal"
        enableGridX={true}
        enableGridY={true}
        tooltip={({ node }: { node: any }) => {
          // Get the intensity level based on the frequency
          const value = node.data.size;
          const max = maxValue;
          const normalizedValue = value / max;
          let intensityLabel = '';
          
          if (normalizedValue >= 0.85) intensityLabel = 'Highest';
          else if (normalizedValue >= 0.65) intensityLabel = 'High';
          else if (normalizedValue >= 0.45) intensityLabel = 'Medium';
          else if (normalizedValue >= 0.25) intensityLabel = 'Low';
          else intensityLabel = 'Lowest';
          
          return (
            <div
              style={{
                padding: '8px 12px',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                color: '#333',
                fontSize: '0.8rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{node.data.y}</div>
              <div>Date: <span style={{ fontWeight: 'bold' }}>{node.data.x}</span></div>
              <div>Frequency: <span style={{ fontWeight: 'bold' }}>{node.data.size}</span></div>
              <div>Intensity: <span style={{ 
                fontWeight: 'bold',
                color: normalizedValue >= 0.85 ? EXACT_COLORS.HIGHEST :
                       normalizedValue >= 0.65 ? EXACT_COLORS.HIGH :
                       normalizedValue >= 0.45 ? EXACT_COLORS.MEDIUM :
                       normalizedValue >= 0.25 ? EXACT_COLORS.LOW :
                       EXACT_COLORS.LOWEST
              }}>{intensityLabel}</span></div>
            </div>
          );
        }}
        theme={{
          axis: {
            ticks: {
              text: {
                fontSize: compact ? 8 : 10,
              }
            },
            legend: {
              text: {
                fontSize: compact ? 10 : 12,
                fontWeight: 'bold'
              }
            }
          },
          grid: {
            line: {
              stroke: '#e6e6e6',
              strokeWidth: 1
            }
          }
        }}
      />
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  // For this application, we'll use "Bob Test" followed by the ID number
  return `Bob Test${patientId}`;
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoScatterView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-scatter-view/${patientToDisplay}`);
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
            Quick overview of all patient data through bubble chart visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Global color legend */}
          <div className="bg-slate-50 p-3 mb-4 rounded-md border flex flex-col">
            <p className="text-xs text-slate-600 mb-2">
              <strong>Bubble Chart Legend</strong>: Size indicates frequency and color indicates intensity 
              relative to maximum values.
            </p>
            <div className="flex items-center flex-wrap gap-4 text-xs">
              <div className="flex items-center">
                <div style={{ width: 16, height: 16, backgroundColor: EXACT_COLORS.HIGHEST, borderRadius: '50%' }} />
                <span className="ml-1">Highest (85-100%)</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 14, height: 14, backgroundColor: EXACT_COLORS.HIGH, borderRadius: '50%' }} />
                <span className="ml-1">High (65-85%)</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 12, height: 12, backgroundColor: EXACT_COLORS.MEDIUM, borderRadius: '50%' }} />
                <span className="ml-1">Medium (45-65%)</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 10, height: 10, backgroundColor: EXACT_COLORS.LOW, borderRadius: '50%' }} />
                <span className="ml-1">Low (25-45%)</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 8, height: 8, backgroundColor: EXACT_COLORS.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
                <span className="ml-1">Lowest (0-25%)</span>
              </div>
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