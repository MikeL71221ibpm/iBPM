import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, Maximize2, X, FileSpreadsheet, FileImage, FileText } from 'lucide-react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

// Interface for patient visualization parameters
interface PatientVisualizationParams {
  patientId?: string;
}

// Data types for visualization
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms', description: 'Patient symptoms extracted from clinical notes.' },
  { id: 'diagnosis', name: 'Diagnoses', description: 'Diagnosed conditions identified in clinical documentation.' },
  { id: 'category', name: 'Diagnostic Categories', description: 'Broader diagnostic classifications of conditions.' },
  { id: 'hrsn', name: 'HRSN Indicators', description: 'Health-related social needs affecting patient health.' }
];

// API endpoint mapping
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
  size: number; // Value for this data point (occurrences)
  frequency: number; // How many sessions this item appears in
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

// Color themes - these define vibrancy of the colors, not the individual colors themselves
const COLOR_THEMES = {
  // COLOR INTENSITY THEMES
  vivid: {
    name: "Vivid Colors",
    saturation: 90,  // Very vivid
    lightness: 60,   // Medium-bright
    alpha: 1,        // Fully opaque
  },
  
  pastel: {
    name: "Pastel Colors",
    saturation: 60,  // Moderately saturated
    lightness: 80,   // Lighter/Pastel
    alpha: 0.8,      // Slightly transparent
  },
  
  muted: {
    name: "Muted Colors",
    saturation: 40,  // Less saturated
    lightness: 50,   // Medium lightness
    alpha: 0.9,      // Mostly opaque
  },
  
  dark: {
    name: "Dark Colors",
    saturation: 70,  // Moderately saturated
    lightness: 30,   // Darker
    alpha: 1,        // Fully opaque
  },
  
  light: {
    name: "Light Colors",
    saturation: 50,  // Medium saturation
    lightness: 70,   // Lighter
    alpha: 0.85,     // Slightly transparent
  },
  
  // Viridis - colorblind friendly theme based on the matplotlib viridis palette
  // Uses a specific, scientifically designed color sequence that's perceptually uniform
  viridis: {
    name: "Viridis (Colorblind Friendly)",
    isCustomPalette: true,
    colors: [
      '#440154', // Dark purple
      '#414487', // Deep blue-purple
      '#2A788E', // Blue-green
      '#22A884', // Green
      '#7AD151', // Light green-yellow
      '#FDE725'  // Yellow
    ]
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
  const expandedChartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Get the active color settings based on the current theme
  const colorSettings = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.vivid;
  
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
  
  // Calculate row totals for adding counts to labels and sorting
  const rowTotals = React.useMemo(() => {
    if (!data || !data.rows || !data.data) return {};
    
    const totals: Record<string, number> = {};
    
    // Calculate total for each row across all columns
    data.rows.forEach(row => {
      if (!row) return;
      const rowData = data.data[row];
      if (!rowData) return;
      
      let rowTotal = 0;
      
      // Sum all values in this row
      data.columns.forEach(column => {
        if (!column) return;
        if (rowData[column] !== undefined && rowData[column] !== null) {
          const value = Number(rowData[column]);
          if (!isNaN(value)) {
            rowTotal += value;
          }
        }
      });
      
      totals[row] = rowTotal;
    });
    
    return totals;
  }, [data]);
  
  // Generate distinct colors for rows based on color theme settings
  const rowColors = React.useMemo(() => {
    if (!data || !data.rows) return {};
    
    // Sort the rows by total values in descending order
    const sortedRows = [...(data.rows || [])].sort((a, b) => {
      return (rowTotals[b] || 0) - (rowTotals[a] || 0);
    });
    
    // Generate colors with consistent hue distribution
    const colors: Record<string, string> = {};
    
    // Check if this is a custom palette theme (like Viridis)
    if (colorSettings.isCustomPalette && colorSettings.colors) {
      // Use the predefined palette and cycle through it
      const palette = colorSettings.colors;
      
      sortedRows.forEach((row, index) => {
        // Cycle through the colors in the palette
        const colorIndex = index % palette.length;
        const color = palette[colorIndex];
        
        // Store colors for row and row with count
        colors[row] = color;
        colors[`${row} (${rowTotals[row] || 0})`] = color;
      });
    } else {
      // Generate colors using HSL for normal themes
      // Extract theme settings
      const { saturation, lightness, alpha } = colorSettings;
      
      sortedRows.forEach((row, index) => {
        // Distribute hues evenly around the color wheel (0-360 degrees)
        const hue = Math.floor((index * 360) / Math.max(1, sortedRows.length));
        
        // Apply the theme's saturation and lightness
        const color = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        
        // Store colors for row and row with count
        colors[row] = color;
        colors[`${row} (${rowTotals[row] || 0})`] = color;
      });
    }
    
    return colors;
  }, [data, rowTotals, colorSettings]);
  
  // Process data into scatter plot format using the rows as series
  const scatterData = React.useMemo(() => {
    if (!data || !data.rows || !data.columns || !data.data) {
      return [];
    }
    
    // Get sorted rows for display order (highest totals first)
    const sortedRows = [...data.rows].sort((a, b) => {
      return (rowTotals[b] || 0) - (rowTotals[a] || 0);
    });
    
    // Create one series per row with the row as the series ID
    return sortedRows.map(row => {
      // Skip invalid rows
      if (!row) return null;
      
      // Create data points for this row
      const rowPoints: ScatterDataPoint[] = [];
      
      // Process each column for this row
      data.columns.forEach(column => {
        if (!column) return; // Skip invalid columns
        
        const rowData = data.data[row];
        if (!rowData) return; // Skip if row data is missing
        
        // Get value with null checking
        let value = 0;
        if (rowData[column] !== undefined && rowData[column] !== null) {
          value = Number(rowData[column]);
          if (isNaN(value)) value = 0;
        }
        
        // Only include non-zero values
        if (value > 0) {
          // Calculate frequency (how many sessions this appears in)
          let sessionsCount = 0;
          data.columns.forEach(col => {
            if (rowData[col] && rowData[col] > 0) {
              sessionsCount++;
            }
          });
          
          rowPoints.push({
            x: column,
            y: `${row} (${rowTotals[row] || 0})`, // Use row name with total count
            size: value, // The value for this specific data point
            frequency: sessionsCount
          });
        }
      });
      
      // Only return series with data points
      if (rowPoints.length === 0) return null;
      
      return {
        id: row, // Use row name as series ID for color mapping
        data: rowPoints
      };
    }).filter(Boolean) as ScatterGroupData[]; // Filter out null values
  }, [data, rowTotals, colorSettings]);
  
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
  
  // Dynamic margin based on compact mode
  const margin = compact 
    ? { top: 40, right: 30, bottom: 70, left: 180 } 
    : { top: 60, right: 140, bottom: 100, left: 200 };
  
  // Enhanced scatter plot component
  const ScatterChart = () => {
    return (
      <div style={{ 
          height: dataType === 'hrsn' ? '250px' : (
            dataType === 'category' ? '350px' : 
            dataType === 'diagnosis' ? '450px' : '450px'
          ), 
          width: '100%',
          position: 'relative',
          overflow: 'visible'
        }}>
        <ResponsiveScatterPlot
          data={scatterData}
          margin={margin}
          xScale={{ type: 'point' }}
          yScale={{ type: 'point' }}
          axisTop={null}
          axisRight={null}
          blendMode="normal"
          animate={false}
          enableGridX={true}
          enableGridY={true}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 46,
            truncateTickAt: 0
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: -50,
            truncateTickAt: 0,
            // Custom renderer for Y-axis ticks with colored bullet points
            renderTick: (tick) => {
              // Get the color for this row
              const rowName = tick.value.toString();
              const baseRowName = rowName.split(' (')[0]; // Get base name without count
              const color = rowColors[baseRowName] || rowColors[rowName] || '#333';
              
              // For compact mode, truncate long label names
              let displayText = rowName;
              if (compact && displayText.length > 30) {
                displayText = displayText.substring(0, 28) + '...';
              }
              
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line stroke="#ccc" x1={-3} x2={0} y1={0} y2={0} />
                  {/* Add colored bullet point that matches the row color */}
                  <circle cx={-8} cy={0} r={3} fill={color} />
                  <text
                    x={-12}
                    y={0}
                    textAnchor="end"
                    dominantBaseline="central"
                    style={{ 
                      fontSize: compact ? '9px' : '11px', 
                      fill: '#333',
                      fontWeight: 400
                    }}
                  >
                    {displayText}
                  </text>
                </g>
              );
            }
          }}
          // Use the row colors for the node color
          colors={(d: any) => {
            // For Nivo ScatterPlot, the node has id/serieId depending on context
            const seriesId = d.serieId || d.id;
            if (!seriesId) return '#888'; // Fallback color
            
            // Get the color for this series (which is mapped to row)
            return rowColors[seriesId] || '#888';
          }}
          // Node size is based on value (occurrences in the specific session)
          nodeSize={(node: any) => {
            if (!node.data) return 4; // Default size
            
            // Get occurrence count for this specific data point
            const occurrences = node.data.size || 1;
            
            // Size bubbles based on occurrences: 
            // 1 occurrence = 4px, 2 occurrences = 7px, 3 occurrences = 10px, etc.
            return Math.max(4, Math.min(16, 4 + (occurrences - 1) * 3));
          }}
          // Enhanced tooltip with more information
          tooltip={({ node }: { node: any }) => {
            // Safety check for missing data
            if (!node || !node.data) {
              return (
                <div className="bg-white p-2 border shadow-md rounded-md">
                  <div className="text-xs">No data available</div>
                </div>
              );
            }
            
            const datum = node.data;
            const rowName = datum.y?.split(' (')[0] || '';
            const color = rowColors[rowName] || '#888';
            
            return (
              <div className="bg-white p-2 border shadow-md rounded-md">
                <div className="font-bold text-sm mb-1 flex items-center">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: color }}
                  ></span>
                  <span>{rowName}</span>
                </div>
                <div className="text-xs">
                  Date: {datum.x || 'Unknown'}
                </div>
                <div className="text-xs">
                  Occurrences in this session: {datum.size || 0}
                </div>
                <div className="text-xs">
                  Present in {datum.frequency || 0} session{datum.frequency !== 1 ? 's' : ''}
                </div>
              </div>
            );
          }}
          // No legends for compact view
          legends={compact ? [] : [
            {
              anchor: 'top-right',
              direction: 'column',
              justify: false,
              translateX: 130,
              translateY: 0,
              itemWidth: 100,
              itemHeight: 12,
              itemsSpacing: 5,
              itemDirection: 'left-to-right',
              symbolSize: 12,
              symbolShape: 'circle'
            }
          ]}
        />
      </div>
    );
  };
  
  // Export to CSV function
  
  // Export to CSV function
  const exportToCsv = () => {
    if (!data) return;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header row with dates (columns)
    csvContent += "Symptom," + data.columns.join(",") + "\n";
    
    // Sort rows by total occurrences (highest first)
    const sortedRows = [...data.rows].sort((a, b) => {
      return (rowTotals[b] || 0) - (rowTotals[a] || 0);
    });
    
    // Add data rows
    sortedRows.forEach(row => {
      if (!row) return;
      
      // Start with row name and total count
      const rowName = `${row} (${rowTotals[row] || 0})`;
      let rowData = rowName;
      
      // Add values for each column
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || '';
        rowData += "," + value;
      });
      
      csvContent += rowData + "\n";
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patient-${patientId}-${dataType}.csv`);
    document.body.appendChild(link);
    
    // Trigger download and clean up
    link.click();
    document.body.removeChild(link);
  };
  
  // Export expanded view to PNG
  const exportExpandedToPng = async () => {
    if (!expandedChartRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Capture the chart
      const canvas = await html2canvas(expandedChartRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false
      });
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `patient-${patientId}-${dataType}.png`);
        }
        setIsExporting(false);
      });
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      setIsExporting(false);
    }
  };
  
  // Export expanded view to PDF
  const exportExpandedToPdf = async () => {
    if (!expandedChartRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Capture the chart
      const canvas = await html2canvas(expandedChartRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false
      });
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });
      
      // Calculate dimensions to maintain aspect ratio
      const imgWidth = 280; // mm (A4 landscape width with margins)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF with patient identifier and data type
      pdf.setFontSize(14);
      pdf.text(`Patient: ${getPatientName(parseInt(patientId))} - ${displayName}`, 10, 10);
      pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, imgHeight);
      
      // Save PDF
      pdf.save(`patient-${patientId}-${dataType}.pdf`);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsExporting(false);
    }
  };
  
  // Card click handler for expanding view
  const handleCardClick = () => {
    if (compact) {
      setDialogOpen(true);
    }
  };
  
  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader className={compact ? "py-0 px-1" : "px-6 py-4"}>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className={compact ? "text-xs" : "text-xl"}>{displayName}</CardTitle>
              {!compact && (
                <CardDescription>
                  Patient {patientId} - {data.rows.length} items tracked over time
                </CardDescription>
              )}
            </div>
            {compact && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0" 
                onClick={() => setDialogOpen(true)}
                title="Expand view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={compact ? "p-0" : "p-4"}>
          <div 
            style={{ 
              height: dataType === 'hrsn' ? '220px' : (
                dataType === 'category' ? '350px' : (
                  dataType === 'diagnosis' ? '400px' : '400px'
                )
              ),
              width: '100%', 
              position: 'relative',
              display: 'block',
              border: '1px solid #f0f0f0',
              padding: '2px',
              zIndex: 10,
              overflow: 'visible'
            }} 
            ref={chartRef}
          >
            <ScatterChart />
          </div>
        </CardContent>
      </Card>
      
      {/* Full size dialog for expanded view with sticky dates */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-4 overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl">
                {displayName} - Patient {getPatientName(parseInt(patientId))}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={exportToCsv}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={exportExpandedToPng}
                  disabled={isExporting}
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Export to PNG
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={exportExpandedToPdf}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={() => setDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            <div 
              style={{ 
                height: '85vh', 
                width: '100%',
                position: 'relative',
                overflow: 'visible'
              }}
              ref={expandedChartRef}
            >
              {/* Expanded chart with sticky columns */}
              <div className="bg-white p-4">
                <ResponsiveScatterPlot
                  data={scatterData}
                  margin={{ top: 60, right: 140, bottom: 100, left: 280 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'point' }}
                  axisTop={null}
                  axisRight={null}
                  blendMode="normal"
                  animate={false}
                  enableGridX={true}
                  enableGridY={true}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Date',
                    legendPosition: 'middle',
                    legendOffset: 70,
                    truncateTickAt: 0,
                    // Custom renderer for bottom axis to create sticky date headers
                    renderTick: (tick) => {
                      return (
                        <g transform={`translate(${tick.x},${tick.y})`}>
                          <line stroke="#ccc" x1={0} x2={0} y1={0} y2={5} />
                          <text
                            transform={`translate(0,10) rotate(-45)`}
                            textAnchor="end"
                            dominantBaseline="central"
                            style={{ 
                              fontSize: '11px', 
                              fill: '#333',
                              fontWeight: 500
                            }}
                          >
                            {tick.value}
                          </text>
                        </g>
                      );
                    }
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: -50,
                    truncateTickAt: 0,
                    // Custom renderer for Y-axis ticks with colored bullet points
                    renderTick: (tick) => {
                      // Get the color for this row
                      const rowName = tick.value.toString();
                      const baseRowName = rowName.split(' (')[0]; // Get base name without count
                      const color = rowColors[baseRowName] || rowColors[rowName] || '#333';
                      
                      return (
                        <g transform={`translate(${tick.x},${tick.y})`}>
                          <line stroke="#ccc" x1={-3} x2={0} y1={0} y2={0} />
                          {/* Add colored bullet point that matches the row color */}
                          <circle cx={-8} cy={0} r={3} fill={color} />
                          <text
                            x={-12}
                            y={0}
                            textAnchor="end"
                            dominantBaseline="central"
                            style={{ 
                              fontSize: '11px', 
                              fill: '#333',
                              fontWeight: 400
                            }}
                          >
                            {tick.value}
                          </text>
                        </g>
                      );
                    }
                  }}
                  // Use the row colors for the node color
                  colors={(d: any) => {
                    // For Nivo ScatterPlot, the node has id/serieId depending on context
                    const seriesId = d.serieId || d.id;
                    if (!seriesId) return '#888'; // Fallback color
                    
                    // Get the color for this series (which is mapped to row)
                    return rowColors[seriesId] || '#888';
                  }}
                  // Node size is based on value (occurrences in the specific session)
                  nodeSize={(node: any) => {
                    if (!node.data) return 4; // Default size
                    
                    // Get occurrence count for this specific data point
                    const occurrences = node.data.size || 1;
                    
                    // Size bubbles based on occurrences: 
                    // 1 occurrence = 4px, 2 occurrences = 7px, 3 occurrences = 10px, etc.
                    return Math.max(4, Math.min(16, 4 + (occurrences - 1) * 3));
                  }}
                  // Enhanced tooltip with more information
                  tooltip={({ node }: { node: any }) => {
                    // Safety check for missing data
                    if (!node || !node.data) {
                      return (
                        <div className="bg-white p-2 border shadow-md rounded-md">
                          <div className="text-xs">No data available</div>
                        </div>
                      );
                    }
                    
                    const datum = node.data;
                    const rowName = datum.y?.split(' (')[0] || '';
                    const color = rowColors[rowName] || '#888';
                    
                    return (
                      <div className="bg-white p-2 border shadow-md rounded-md">
                        <div className="font-bold text-sm mb-1 flex items-center">
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-1"
                            style={{ backgroundColor: color }}
                          ></span>
                          <span>{rowName}</span>
                        </div>
                        <div className="text-xs">
                          Date: {datum.x || 'Unknown'}
                        </div>
                        <div className="text-xs">
                          Occurrences in this session: {datum.size || 0}
                        </div>
                        <div className="text-xs">
                          Present in {datum.frequency || 0} session{datum.frequency !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  }}
                  // Show legends for the expanded view
                  legends={[
                    {
                      anchor: 'top-right',
                      direction: 'column',
                      justify: false,
                      translateX: 130,
                      translateY: 0,
                      itemWidth: 100,
                      itemHeight: 12,
                      itemsSpacing: 5,
                      itemDirection: 'left-to-right',
                      symbolSize: 12,
                      symbolShape: 'circle'
                    }
                  ]}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-2 border-t">
            <Button 
              variant="ghost" 
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main component - displays all four scatter plots in a grid layout
export default function NivoThemedRowColors() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Create refs for the grid container and export title
  const gridRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  
  // State for theme selection - default to 'vivid'
  const [currentTheme, setCurrentTheme] = React.useState('vivid');
  const [isExporting, setIsExporting] = React.useState(false);
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-themed-row-colors/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);
  
  // Theme change handler
  const handleThemeChange = (value: string) => {
    setCurrentTheme(value);
  };
  
  // Export to PNG handler
  const handleExportToPNG = async () => {
    if (!gridRef.current || !titleRef.current) return;
    
    // Show exporting status
    setIsExporting(true);
    
    try {
      // Create a container that includes both the title and grid
      const container = document.createElement('div');
      container.style.backgroundColor = 'white';
      container.style.padding = '20px';
      container.style.width = '1200px';
      
      // Clone the title section for the export
      const titleClone = titleRef.current.cloneNode(true) as HTMLElement;
      titleClone.style.marginBottom = '20px';
      container.appendChild(titleClone);
      
      // Clone the grid for the export
      const gridClone = gridRef.current.cloneNode(true) as HTMLElement;
      container.appendChild(gridClone);
      
      // Temporarily append to document to capture
      document.body.appendChild(container);
      
      // Capture the combined content
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false
      });
      
      // Remove temporary container
      document.body.removeChild(container);
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `patient-${patientToDisplay}-visualization.png`);
        }
        setIsExporting(false);
      });
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      setIsExporting(false);
    }
  };
  
  // Export to PDF handler
  const handleExportToPDF = async () => {
    if (!gridRef.current || !titleRef.current) return;
    
    // Show exporting status
    setIsExporting(true);
    
    try {
      // Create a container that includes both the title and grid
      const container = document.createElement('div');
      container.style.backgroundColor = 'white';
      container.style.padding = '20px';
      container.style.width = '1200px';
      
      // Clone the title section for the export
      const titleClone = titleRef.current.cloneNode(true) as HTMLElement;
      titleClone.style.marginBottom = '20px';
      container.appendChild(titleClone);
      
      // Clone the grid for the export
      const gridClone = gridRef.current.cloneNode(true) as HTMLElement;
      container.appendChild(gridClone);
      
      // Temporarily append to document to capture
      document.body.appendChild(container);
      
      // Capture the combined content
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false
      });
      
      // Remove temporary container
      document.body.removeChild(container);
      
      // Create PDF with correct dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });
      
      // Calculate dimensions to maintain aspect ratio
      const imgWidth = 280; // mm (A4 landscape width with margins)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Save PDF
      pdf.save(`patient-${patientToDisplay}-visualization.pdf`);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsExporting(false);
    }
  };
  
  return (
    <Card className="container mx-auto my-0 p-0" style={{ minHeight: '95vh', maxHeight: '95vh', overflow: 'visible' }}>
      <CardHeader className="py-0 px-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center" ref={titleRef}>
          <div>
            <CardTitle className="text-sm">Patient Visualization: {getPatientName(parseInt(patientToDisplay))}</CardTitle>
            <CardDescription className="text-xs">
              Visual timeline of all symptoms, diagnoses, and health indicators
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 mt-1 md:mt-0">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground">Color Theme:</span>
              <Select value={currentTheme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
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
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleExportToPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileDown className="w-3 h-3 mr-1" />}
              Export Grids to PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleExportToPNG}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileDown className="w-3 h-3 mr-1" />}
              Export Grids to PNG
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs" 
              onClick={() => window.location.reload()}
              disabled={isExporting}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Display all four scatter plots in a 2x2 grid */}
      <CardContent className="p-1" style={{ height: 'calc(95vh - 45px)', overflow: 'visible' }}>
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-1 h-full" 
          style={{ overflow: 'visible' }}
          ref={gridRef}
        >
          {DATA_TYPES.map((type) => (
            <div key={type.id} className="border border-gray-200 min-h-[300px]" style={{ overflow: 'visible' }}>
              <ScatterSection 
                dataType={type.id} 
                patientId={patientToDisplay}
                colorTheme={currentTheme}
                compact={true}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}