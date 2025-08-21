// Backup of nivo-scatter-view-themed.tsx with date alignment and download buttons added
// Timestamp: 05/03/2025 15:26 UTC
// Contains:
// - Fixed date labels alignment by increasing margins
// - Added download buttons (Excel/CSV, PDF, PNG) to full page view
// - Improved date label display in all views

import * as React from 'react';
import { useLocation, useParams } from 'wouter';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Data type interface(s) - used to drive query parameters 
interface PatientVisualizationParams {
  patientId?: string;
}

// Scatter data structure for Nivo - series based
interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number; // Total value (intensity)
  frequency: number; // How many sessions this item appears in
  color?: string; // Optional: Row color - matches Y-axis label bullet color
  intensityCategory?: string; // Optional: Category for coloring ("highest", "high", etc.)
  intensityIndex?: number; // Optional: Index for colorBy scheme (0=highest, etc.)
  rowId?: string; // Optional: Internal use for processing - not used in final data
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

// Database data interface
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Color themes lookup table
export const COLOR_THEMES = {
  iridis: {
    HIGHEST: '#6A0DAD', // Deep purple
    HIGH: '#9370DB',    // Medium purple
    MEDIUM: '#B19CD9',  // Light purple
    LOW: '#CCCCFF',     // Very light purple
    LOWEST: '#F8F8FF'   // Almost white (ghost white)
  },
  viridis: {
    HIGHEST: '#440154', // Dark purple
    HIGH: '#3b528b',    // Dark blue
    MEDIUM: '#21918c',  // Teal
    LOW: '#5ec962',     // Light green
    LOWEST: '#fde725'   // Yellow
  },
  highContrast: {
    HIGHEST: '#000000', // Black
    HIGH: '#cc0000',    // Red
    MEDIUM: '#ff6600',  // Orange
    LOW: '#0066cc',     // Blue
    LOWEST: '#009900'   // Green
  },
  redBlue: {
    HIGHEST: '#67001f', // Dark red
    HIGH: '#d6604d',    // Red
    MEDIUM: '#f7f7f7',  // White
    LOW: '#4393c3',     // Blue
    LOWEST: '#053061'   // Dark blue
  }
};

// Data type definitions for filters
export const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms' },
  { id: 'diagnosis', name: 'Diagnoses' },
  { id: 'category', name: 'Diagnostic Categories' },
  { id: 'hrsn', name: 'HRSN' },
];

// Mock patient names for demonstration
const PATIENT_NAMES = [
  "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson",
  "Jessica Martinez", "Daniel Anderson", "Jennifer Taylor", "Christopher Thomas", "Ashley Garcia"
];

// Helper function to get patient name 
export const getPatientName = (id: number): string => {
  if (id < 1 || id > PATIENT_NAMES.length) return "Unknown Patient";
  return PATIENT_NAMES[id - 1];
};

// Individual section component for each data type
const ScatterSection = ({ 
  dataType, 
  patientId,
  colorTheme = 'iridis',
  compact = false
}: { 
  dataType: string;
  patientId: string;
  colorTheme?: string;
  compact?: boolean;
}) => {
  const [data, setData] = React.useState<PivotData | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const [scatterData, setScatterData] = React.useState<ScatterGroupData[]>([]);
  const [maxValue, setMaxValue] = React.useState<number>(0);
  const [rowColors, setRowColors] = React.useState<Record<string, string>>({});
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  // Get display name for this data type
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Use the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.iridis;
  
  // Load data from API
  React.useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Format API endpoint based on data type
        const endpoint = `/api/pivot/${dataType}/${patientId}`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (isMounted) {
          setData(result);
          setMaxValue(result.maxValue);
          console.log(`Calculated maxValue: ${result.maxValue} for ${dataType}`);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading data:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    if (patientId) {
      fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [dataType, patientId]);
  
  // Transform data for Nivo scatter chart after data loads
  React.useEffect(() => {
    if (!data) return;
    
    // Log data to check
    console.log(`SCATTER PLOT using maxValue=${maxValue} for ${dataType}`);
    
    // Transform data for scatter plot
    const transformedGroups: ScatterGroupData[] = [];
    const colorMap: Record<string, string> = {};
    
    // Process each row
    data.rows.forEach((row, rowIdx) => {
      // Calculate the color index for each row 
      // NOTE: We're using a color per row, NOT a color per value now
      // Generate a distinct color for each row, distributed across spectrum
      let rowColor = '';
      
      switch (dataType) {
        case 'hrsn':
          // For HRSN, we'll use a redder spectrum since they represent needs
          rowColor = `hsl(${Math.floor(120 + 240 * (rowIdx / data.rows.length))}, 70%, 45%)`;
          break;
        case 'category':
          // For categories, use blues and purples
          rowColor = `hsl(${Math.floor(180 + 60 * (rowIdx / data.rows.length))}, 70%, 45%)`;
          break;
        case 'diagnosis':
          // For diagnoses, use greens
          rowColor = `hsl(${Math.floor(90 + 50 * (rowIdx / data.rows.length))}, 70%, 45%)`;
          break;
        default:
          // For symptoms, use full spectrum
          rowColor = `hsl(${Math.floor(360 * (rowIdx / data.rows.length))}, 70%, 45%)`;
      }
      
      // Store color for this row in map
      colorMap[row] = rowColor;
      
      // Create data series for this row
      const dataPoints: ScatterDataPoint[] = [];
      let sessionCount = 0;
      
      // Add a point for each non-zero value in this row
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || 0;
        
        if (value > 0) {
          sessionCount++;
          
          // Add data point
          dataPoints.push({
            x: column,             // Date (column header)
            y: row,                // Item name (row label)
            size: value,           // Raw occurrence count
            frequency: sessionCount, // Number of sessions this item appears in (unique dates)
          });
        }
      });
      
      // Add this series to our groups if it has data points
      if (dataPoints.length > 0) {
        transformedGroups.push({
          id: row, // Use row name as the series ID - critical for color mapping
          data: dataPoints
        });
      }
    });
    
    setScatterData(transformedGroups);
    setRowColors(colorMap);
  }, [data, dataType, maxValue]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg mb-1">{displayName}</h3>
          {data && (
            <div className="text-xs text-gray-500">
              Showing {data.rows.length} items across {data.columns.length} dates
            </div>
          )}
        </div>
        
        {/* Expand button */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <span className="pr-1">↗</span> Expand
          </Button>
          
          {/* Full dialog for expanded view */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-5xl w-full h-[90vh] p-0 flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-2 border-b">
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl flex items-baseline">
                    {displayName}
                    <span className="ml-2 text-sm text-gray-500 font-normal">
                      Patient {patientId}
                    </span>
                  </DialogTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Open a new window with just this visualization
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        // Create a dates footer bar for the full page view at the bottom
                        let dateFooter = '<div style="height: 60px; border-top: 1px solid #e5e7eb; position: fixed; bottom: 0; left: 0; right: 0; background: white; display: flex; align-items: center; z-index: 1000;">';
                        
                        // Add download buttons
                        dateFooter += `
                          <div style="position: absolute; left: 10px; top: 10px; display: flex; gap: 8px;">
                            <button style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center;" onclick="exportTableToCSV('${displayName}_data.csv')">
                              <span style="margin-right: 4px;">📄</span> Excel/CSV
                            </button>
                            <button style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center;" onclick="exportToPDF()">
                              <span style="margin-right: 4px;">📑</span> PDF
                            </button>
                            <button style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center;" onclick="exportToPNG()">
                              <span style="margin-right: 4px;">🖼️</span> PNG
                            </button>
                          </div>
                        `;
                        
                        dateFooter += '<div style="position: absolute; left: 280px; right: 30px; display: flex; justify-content: space-between; padding: 16px 16px 0 16px; height: 60px;">';
                        
                        // Add each date label - make sure data exists
                        if (data && data.columns) {
                          data.columns.forEach(date => {
                            dateFooter += `
                              <div style="flex-shrink: 0; text-align: center; font-weight: bold; font-size: 11px; color: #333; transform: rotate(-45deg) translateY(10px); transform-origin: center left; white-space: nowrap; padding: 0 2px; min-width: 50px;">
                                ${date}
                              </div>
                            `;
                          });
                        }
                        
                        dateFooter += '</div></div>';
                        
                        newWindow.document.write(`
                          <html>
                            <head>
                              <title>${displayName} - Full Page View</title>
                              <style>
                                body { margin: 0; padding: 20px 20px 80px 20px; font-family: sans-serif; }
                                .chart-container { width: 100%; height: calc(95vh - 140px); }
                                h1 { font-size: 18px; margin-bottom: 20px; }
                                .tooltip { 
                                  position: absolute; 
                                  padding: 10px; 
                                  background: white; 
                                  border: 2px solid #3B82F6; 
                                  border-radius: 4px; 
                                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                  z-index: 1000;
                                  font-size: 12px;
                                  display: none;
                                }
                              </style>
                            </head>
                            <body>
                              <h1>${displayName} - Patient ${patientId}</h1>
                              
                              <div class="tooltip" id="tooltip">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
                                  <div style="font-weight: bold;">Data Point</div>
                                  <button style="border: none; background: none; cursor: pointer;" onclick="document.getElementById('tooltip').style.display='none'">✕</button>
                                </div>
                                <div id="tooltip-content"></div>
                              </div>
                              
                              <div class="chart-container">
                                ${chartRef.current?.innerHTML || ''}
                              </div>
                              
                              ${dateFooter}
                              
                              <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
                              <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
                              <script>
                                // Add tooltip functionality
                                document.querySelectorAll('.nivo-point').forEach(point => {
                                  point.addEventListener('mouseenter', (e) => {
                                    // Get the circle data from its attributes
                                    const circle = e.target;
                                    const date = circle.getAttribute('data-x') || 'Unknown';
                                    const label = circle.getAttribute('data-y') || 'Unknown';
                                    const size = circle.getAttribute('data-size') || '1';
                                    
                                    // Create tooltip content
                                    const tooltipContent = document.getElementById('tooltip-content');
                                    tooltipContent.innerHTML = \`
                                      <div style="margin: 5px 0;"><strong>Date:</strong> \${date}</div>
                                      <div style="margin: 5px 0;"><strong>Item:</strong> \${label}</div>
                                      <div style="margin: 5px 0;"><strong>Times mentioned in this session:</strong> \${size}</div>
                                    \`;
                                    
                                    // Show and position tooltip
                                    const tooltip = document.getElementById('tooltip');
                                    tooltip.style.display = 'block';
                                    tooltip.style.left = (e.clientX + 10) + 'px';
                                    tooltip.style.top = (e.clientY + 10) + 'px';
                                  });
                                });
                                
                                // Export functions
                                function exportTableToCSV(filename) {
                                  const rows = [];
                                  const title = document.querySelector('h1').textContent;
                                  rows.push(['Patient Visualization Data']);
                                  rows.push([title]);
                                  rows.push(['Generated on:', new Date().toLocaleDateString()]);
                                  rows.push([]);
                                  
                                  // Get all points from the chart
                                  const points = document.querySelectorAll('.nivo-point');
                                  const dataMap = new Map();
                                  
                                  // Extract and group data from points
                                  points.forEach(point => {
                                    const symptom = point.getAttribute('data-y') || '';
                                    const date = point.getAttribute('data-x') || '';
                                    const value = point.getAttribute('data-size') || '0';
                                    
                                    if (!dataMap.has(symptom)) {
                                      dataMap.set(symptom, {});
                                    }
                                    
                                    dataMap.get(symptom)[date] = value;
                                  });
                                  
                                  // Get all unique dates
                                  const dates = [...new Set(Array.from(points).map(p => p.getAttribute('data-x')))].filter(Boolean).sort();
                                  
                                  // Create header row with dates
                                  const headerRow = ['Item', ...dates];
                                  rows.push(headerRow);
                                  
                                  // Create data rows
                                  dataMap.forEach((dateValues, symptom) => {
                                    const row = [symptom];
                                    
                                    dates.forEach(date => {
                                      row.push(dateValues[date] || '0');
                                    });
                                    
                                    rows.push(row);
                                  });
                                  
                                  // Convert to CSV
                                  let csvContent = rows.map(row => row.join(',')).join('\\n');
                                  
                                  // Create download link
                                  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
                                  const link = document.createElement('a');
                                  link.setAttribute('href', encodedUri);
                                  link.setAttribute('download', filename);
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                                
                                function exportToPDF() {
                                  // Hide the fixed date footer temporarily
                                  const dateFooter = document.querySelector('div[style*="position: fixed; bottom: 0"]');
                                  dateFooter.style.visibility = 'hidden';
                                  
                                  // Create the PDF
                                  const { jsPDF } = window.jspdf;
                                  const doc = new jsPDF('landscape', 'pt', 'a4');
                                  const title = document.querySelector('h1').textContent;
                                  
                                  html2canvas(document.querySelector('.chart-container'), {
                                    scale: 1,
                                    useCORS: true,
                                    allowTaint: true,
                                    scrollY: -window.scrollY,
                                  }).then(canvas => {
                                    const imgData = canvas.toDataURL('image/png');
                                    const imgWidth = doc.internal.pageSize.getWidth() - 40;
                                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                    
                                    doc.text(title, 20, 30);
                                    doc.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight);
                                    doc.save('visualization.pdf');
                                    
                                    // Show the date footer again
                                    dateFooter.style.visibility = 'visible';
                                  });
                                }
                                
                                function exportToPNG() {
                                  // Hide the fixed date footer temporarily
                                  const dateFooter = document.querySelector('div[style*="position: fixed; bottom: 0"]');
                                  dateFooter.style.visibility = 'hidden';
                                  
                                  html2canvas(document.querySelector('.chart-container'), {
                                    scale: 2,
                                    useCORS: true,
                                    allowTaint: true,
                                    scrollY: -window.scrollY,
                                  }).then(canvas => {
                                    const link = document.createElement('a');
                                    link.download = 'visualization.png';
                                    link.href = canvas.toDataURL('image/png');
                                    link.click();
                                    
                                    // Show the date footer again
                                    dateFooter.style.visibility = 'visible';
                                  });
                                }
                              </script>
                            </body>
                          </html>
                        `);
                        newWindow.document.close();
                      }
                    }}
                  >
                    <span className="pr-1">🔍</span> Full Page
                  </Button>
                </div>
              </DialogHeader>
              
              {data && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-2 bg-slate-50 border-b mb-4">
                    <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                    <p className="text-sm text-gray-500">
                      Showing {data.rows.length} items. Bubble size indicates occurrence count per session.
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-2">
                          Hover over bubbles to see details
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
                    
                    {/* Enhanced expanded view container - shows full chart with sticky date labels */}
                    <div className="flex flex-col" style={{ height: '75vh', maxHeight: '75vh' }}>
                      {/* Main chart container with scrolling - takes most of the height */}
                      <div 
                        className="flex-grow overflow-auto"
                        style={{ 
                          height: 'calc(100% - 60px)' // Leave space for the date footer (60px)
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
                          width: '100%',
                          position: 'relative'
                        }}>
                          <ScatterVisualization 
                            data={scatterData} 
                            rows={data.rows}
                            maxValue={maxValue}
                            compact={false}
                            colorSet={colorSet}
                            rowColors={rowColors}
                            hideDateLabels={true} // Hide the date labels in the main chart
                          />
                        </div>
                      </div>
                      
                      {/* Sticky date labels footer that perfectly align with chart data points */}
                      <div className="h-[60px] border-t border-gray-200 bg-white flex items-center relative">
                        <div 
                          className="absolute overflow-x-auto" 
                          style={{ 
                            left: '280px', 
                            right: '30px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '16px 16px 0 16px',
                            height: '60px'
                          }}
                        >
                          {data.columns.map((date, index) => (
                            <div 
                              key={date} 
                              className="flex-shrink-0 text-center font-bold text-xs text-gray-800"
                              style={{ 
                                transform: 'rotate(-45deg) translateY(10px)',
                                transformOrigin: 'center left',
                                whiteSpace: 'nowrap',
                                padding: '0 2px',
                                minWidth: '50px',
                                fontSize: '11px'
                              }}
                            >
                              {date}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
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
                colorSet={colorSet}
                rowColors={rowColors}
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
  colorSet,
  rowColors = {},
  compact = false,
  hideDateLabels = false
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  colorSet: any;
  rowColors?: Record<string, string>;
  compact?: boolean;
  hideDateLabels?: boolean;
}) => {
  // For the tooltip - implementing the exact same approach as in nivo-row-colors.tsx
  const [tooltipData, setTooltipData] = React.useState<{
    x: string;
    y: string;
    size: number;     // Size represents the occurrence count in this specific session
    frequency: number; // Keep frequency as additional info (unique to this component)
    visible: boolean;
    color: string;
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

  if (!data || data.length === 0 || rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Calculate margins based on the length of the row labels
  const maxLabelLength = Math.max(...rows.map(row => row.length));
  // Increase left margin to ensure proper alignment of the chart
  const leftMargin = Math.min(Math.max(8 * maxLabelLength, 120), compact ? 200 : 280);
  
  // Margins and styling
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: leftMargin } 
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  // Process the data - we don't need to modify the data for colors 
// because we'll directly use rowColors lookup in the colors function
const processedData = data.map(series => {
  return {
    id: series.id,
    data: series.data.map(point => {
      return {
        x: point.x,
        y: point.y,
        size: point.size,
        frequency: point.frequency,
        color: '' // Add empty color since it's marked as required by LSP
      };
    })
  };
});
  
  // Removed unused color intensity function
  
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Improved tooltip position at top center of chart */}
      {tooltipData && tooltipData.visible && (
        <div className="absolute top-0 left-0 right-0 flex justify-center h-auto" style={{ zIndex: 1000 }}>
          {/* Tooltip content */}
          <div 
            className="bg-white p-3 rounded-md shadow-lg border-2 max-w-[250px] mt-1"
            style={{ 
              borderColor: tooltipData.color || '#3B82F6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            <div className="flex justify-between items-center mb-1 pb-1 border-b">
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
            {/* Additional frequency info (unique to this chart type) */}
            <div className="text-xs my-1">
              <strong>Present in sessions:</strong> {tooltipData.frequency}
            </div>
          </div>
        </div>
      )}
      <ResponsiveScatterPlot
        data={processedData}
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
          legendOffset: 46,
          // Using CSS to make the axis sticky
          renderTick: (tick: any) => {
            if (hideDateLabels) {
              // If we're hiding date labels, just render a tick mark with no text
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line 
                    x1="0" 
                    x2="0" 
                    y1="0" 
                    y2="-5" 
                    style={{ stroke: '#777' }}
                  />
                </g>
              );
            }
            
            // Otherwise render normal date labels
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                <line 
                  x1="0" 
                  x2="0" 
                  y1="0" 
                  y2="-5" 
                  style={{ stroke: '#777' }}
                />
                <g 
                  transform={`translate(0,20) rotate(${titleRotation})`} 
                  style={{ 
                    dominantBaseline: 'middle', 
                    textAnchor: 'end',
                    pointerEvents: 'none' // Prevents date labels from interfering with points
                  }}
                >
                  <text style={{ fill: '#333', fontSize: '11px', fontWeight: 'bold' }}>
                    {tick.value}
                  </text>
                </g>
              </g>
            );
          }
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
          },
          renderTick: (tick: any) => {
            // Get the color for this row from rowColors
            const color = rowColors[tick.value] || '#333';
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                {/* Line tick mark */}
                <line 
                  x1="0" 
                  x2="-5" 
                  y1="0" 
                  y2="0" 
                  style={{ stroke: '#777' }}
                />
                
                {/* Color bullet */}
                <circle
                  cx="-10"
                  cy="0"
                  r="3"
                  style={{ fill: color }}
                />
                
                {/* Text label (in standard black color) */}
                <text 
                  x="-16" 
                  y="0" 
                  dy="0.32em" 
                  textAnchor="end" 
                  style={{ fill: '#333', fontSize: '11px' }}
                >
                  {tick.value}
                </text>
              </g>
            );
          }
        }}
        // Size based on occurrences (not frequency)
        nodeSize={(d: any) => {
          if (!d?.data) return 4;
          
          // We need to use the size (occurrences/intensity) not frequency for sizing
          const occurrences = d.data.size || 1;
          
          // Use the same scaling as in nivo-row-colors.tsx:
          // 1 occurrence = 4px, 2 occurrences = 8px, 3 occurrences = 12px, etc.
          const scaledSize = Math.max(4, Math.min(24, 4 + (occurrences - 1) * 3));
          
          return scaledSize;
        }}
        // Simple theme config to make tooltip invisible
        theme={{
          tooltip: { container: { background: 'transparent', padding: 0, boxShadow: 'none' } },
          crosshair: { line: { stroke: 'transparent' } }
        }}
        // Use row colors based on the EXACT same approach as nivo-row-colors.tsx
        colors={(d: any) => {
          // For Nivo ScatterPlot the node can have either 'id' or 'serieId' depending on context
          const key = d.id || d.serieId;
          // Return the color for this row (from rowColors) or a gray fallback if not found
          return rowColors[key] || '#888';
        }}
        
        blendMode="normal" // Use normal blend mode to preserve colors
        useMesh={true}
        debugMesh={false}
        nodeId={(node) => `${node.x}-${node.y}`}
        isInteractive={true}
        onMouseMove={(node: any, event) => {
          // Clear any pending hide timer
          if (tooltipCleanupRef.current !== null) {
            window.clearTimeout(tooltipCleanupRef.current);
            tooltipCleanupRef.current = null;
          }
          
          // Clear previous show timer if it exists
          if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
          }
          
          // Set a new timer to show the tooltip after a short delay (debounce)
          tooltipTimerRef.current = window.setTimeout(() => {
            if (node && node.data) {
              const datum = node.data;
              const value = datum.size || 0;
              const freq = datum.frequency || 1;
              
              // Get the color for this row from the series ID
              const seriesId = node.serieId || '';
              const color = rowColors[seriesId] || '#3B82F6';
              
              setTooltipData({
                x: datum.x || 'Unknown',
                y: datum.y || 'Unknown',
                size: value,
                frequency: freq,
                visible: true,
                color: color
              });
            }
          }, 100); // 100ms delay for debounce
        }}
        onMouseLeave={() => {
          // Clear show timer if it exists
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
        tooltip={() => null} // Disable the native tooltip

      />
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoScatterViewThemed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-scatter-view-themed/${patientToDisplay}`);
    }
    
    // Print the color thresholds to console for debugging
    const thresholds = {
      "1": COLOR_THEMES.iridis.LOWEST,
      "2-4": COLOR_THEMES.iridis.LOW,
      "5-7": COLOR_THEMES.iridis.MEDIUM,
      "8-10": COLOR_THEMES.iridis.HIGH,
      "11+": COLOR_THEMES.iridis.HIGHEST
    };
    console.log("INTENSITY COLOR THRESHOLDS:", thresholds);
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
            Quick overview of all patient data through bubble chart visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Theme selector and color legend */}
          <div className="bg-slate-50 p-3 mb-4 rounded-md border flex flex-col">
            <div className="flex justify-between items-center mb-2">
              {/* Removed legend text */}

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
            {/* Removed legend details */}
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
                onClick={() => setLocation(`/nivo-scatter-view/${patientToDisplay}`)}
              >
                Original View
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
                colorTheme={currentTheme}
                compact={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}