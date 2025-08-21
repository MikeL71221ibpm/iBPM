import React, { useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, Maximize2, X, FileSpreadsheet, FileImage, FileText, Calendar, RotateCw, TableProperties, Grid3X3, Layout, File } from 'lucide-react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateBubbleSize } from '@/lib/bubble-size-utils';

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

// Define type for color theme
interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

// Color themes - these define vibrancy of the colors, not the individual colors themselves
const COLOR_THEMES: Record<string, ColorThemePreset> = {
  // COLOR INTENSITY THEMES
  vivid: {
    name: "Vivid Colors",
    saturation: 100,  // Increased from 90 to 100 for more vivid colors
    lightness: 55,    // Decreased from 60 to 55 for better contrast
    alpha: 1,        // Fully opaque
  },
  
  pastel: {
    name: "Pastel Colors",
    saturation: 70,  // Increased from 60 to 70 for better differentiation
    lightness: 75,   // Decreased from 80 to 75 for better contrast
    alpha: 0.9,      // Increased opacity from 0.8 to 0.9
  },
  
  muted: {
    name: "Muted Colors",
    saturation: 50,  // Increased from 40 to 50 for better differentiation
    lightness: 45,   // Decreased from 50 to 45 for better contrast
    alpha: 0.95,     // Increased opacity from 0.9 to 0.95
  },
  
  dark: {
    name: "Dark Colors",
    saturation: 85,  // Increased from 70 to 85 for better differentiation
    lightness: 35,   // Increased from 30 to 35 for better visibility
    alpha: 1,        // Fully opaque
  },
  
  light: {
    name: "Light Colors",
    saturation: 60,  // Increased from 50 to 60 for better differentiation
    lightness: 65,   // Decreased from 70 to 65 for better contrast
    alpha: 0.9,      // Increased opacity from 0.85 to 0.9
  },
  
  // Viridis - colorblind friendly theme based on the matplotlib viridis palette
  // Enhanced with more steps for better differentiation
  viridis: {
    name: "Viridis (Colorblind Friendly)",
    isCustomPalette: true,
    colors: [
      '#440154', // Dark purple
      '#482677', // Deep purple
      '#404688', // Deep blue
      '#33638D', // Medium blue
      '#27808E', // Teal
      '#1FA187', // Blue-green
      '#49B97C', // Green
      '#6ECE58', // Light green
      '#A2DB34', // Yellow-green
      '#E0DD12', // Yellow
      '#FDE725'  // Bright yellow
    ]
  }
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Helper function to format patient ID with leading zeros
const getFormattedPatientId = (patientId: number): string => {
  return `P${patientId.toString().padStart(5, '0')}`;
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
  // Define all state and refs first to maintain hook order
  const chartRef = useRef<HTMLDivElement>(null);
  const expandedChartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isFullPage, setIsFullPage] = React.useState(false);
  
  // Add a special effect to handle the dialog size when changing full page mode
  React.useEffect(() => {
    if (dialogOpen) {
      // Apply special styles for fullpage mode
      const dialogContent = document.querySelector('.fullpage-dialog');
      if (dialogContent && isFullPage) {
        document.body.style.overflow = 'hidden';
        // Force the dialog to fill the entire viewport
        if (dialogContent instanceof HTMLElement) {
          dialogContent.style.height = '100vh';
          dialogContent.style.maxHeight = '100vh';
          dialogContent.style.marginTop = '0';
          dialogContent.style.borderRadius = '0';
        }
      } else {
        document.body.style.overflow = '';
      }
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
    };
  }, [dialogOpen, isFullPage]);
  
  // Handle opening the dialog, with optional immediate full page mode
  const openDialog = (fullPageMode: boolean = false) => {
    // First force a state reset to avoid any conflicts
    setDialogOpen(false);
    setIsFullPage(false);
    
    // Then set the states with a delay to ensure clean rendering
    setTimeout(() => {
      setIsFullPage(fullPageMode);
      setTimeout(() => {
        setDialogOpen(true);
      }, 20);
    }, 20);
  };
  
  // Calculate display name
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
    } else if (colorSettings.saturation !== undefined && 
               colorSettings.lightness !== undefined && 
               colorSettings.alpha !== undefined) {
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
  }, [data, rowTotals]);
  
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
    ? { top: 40, right: 30, bottom: 70, left: 240 } // Increased from 180 to 240
    : { top: 60, right: 140, bottom: 100, left: 260 }; // Increased from 200 to 260
  
  // Enhanced scatter plot component
  const ScatterChart = ({ expanded = false }: { expanded?: boolean }) => {
    // Adjust margins for expanded view and full page mode
    const chartMargin = expanded 
      ? (isFullPage 
        ? { top: 8, right: 200, bottom: 100, left: 520 } // Increased from 450 to 520 for more text space
        : { top: 60, right: 200, bottom: 100, left: 320 }) // Increased from 280 to 320
      : margin;
    
    // Calculate dynamic height based on number of rows (minimum 16px per row based on WCAG standards)
    // Add base height for top and bottom margins and padding
    const rowCount = data?.rows?.length || 0;
    
    // Increased spacing per row to improve readability
    const minHeightPerRow = 30; // 16px minimum text height + 14px for spacing (increased from 24px)
    
    // Increased base height to provide more padding
    const baseHeight = 150; // Additional height for margins, padding, axes, etc. (increased from 120px)
    
    // Apply progressively more height as the number of rows increases
    let extraHeight = 0;
    if (rowCount > 15) {
      extraHeight = 100; // Add extra spacing for very large datasets
    } else if (rowCount > 10) {
      extraHeight = 60; // Add moderate extra spacing for medium datasets
    } else if (rowCount > 5) {
      extraHeight = 30; // Add small extra spacing for smaller datasets
    }
    
    const dynamicHeight = Math.max(
      baseHeight + (rowCount * minHeightPerRow) + extraHeight,
      // Still maintain minimum heights by type for smaller datasets with increased minimums
      dataType === 'hrsn' ? 280 : (dataType === 'category' ? 380 : 480)
    );
      
    return (
      <div style={{ 
          height: expanded 
            ? '100%'  // Fill entire container in expanded view
            : dynamicHeight + 'px', // Dynamic height based on content
          width: '100%',
          position: 'relative',
          overflow: 'visible',
          backgroundColor: 'white'
        }}>
        <ResponsiveScatterPlot
          data={scatterData}
          margin={chartMargin}
          xScale={{ type: 'point' }}
          yScale={{ type: 'point' }}
          axisTop={null}
          axisRight={null}
          // Completely disable right Y-axis
          blendMode="normal"
          animate={false}
          enableGridX={true}
          enableGridY={true}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: expanded ? 'Date' : '',
            legendPosition: 'middle',
            legendOffset: expanded ? 70 : 46,
            truncateTickAt: 0,
            // Custom renderer for bottom axis when expanded
            renderTick: expanded ? (tick) => {
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
            } : undefined
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
              if (compact && !expanded && displayText.length > 30) {
                displayText = displayText.substring(0, 28) + '...';
              }
              
              // Always use tooltips for all Y-axis labels for better UX
              // Text is considered visually truncated if it's long
              const isTextVisuallyTruncated = rowName.length > 25;
                            
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  <line stroke="#ccc" x1={-3} x2={0} y1={0} y2={0} />
                  {/* Add colored bullet point that matches the row color - smaller for Y-axis */}
                  <circle cx={-10} cy={0} r={isFullPage ? 4 : 3} fill={color} stroke="#000000" strokeWidth={0.5} />
                  
                  {/* Use a simplified implementation for tooltips that will work reliably */}
                  <g>
                    <title>{rowName}</title>
                    <text
                      x={isFullPage ? -22 : -18}
                      y={0}
                      textAnchor="end"
                      dominantBaseline="central"
                      style={{ 
                        fontSize: expanded 
                          ? (isFullPage ? '16px' : '14px')
                          : (compact ? '13px' : '14px'),
                        fill: '#000', // Darker text (black) for better contrast
                        fontWeight: isFullPage ? 600 : 500 // Slightly bolder font
                      }}
                    >
                      {displayText}
                    </text>
                  </g>
                  
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
            if (!node.data) return 5; // Default size
            
            // Get the value for sizing
            const value = node.data.size || 1;
            
            // Use the standardized bubble size utility function
            return calculateBubbleSize(value);
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
          // No legends at all to avoid duplicate labels
          legends={[]}
        />
      </div>
    );
  };
  
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
        orientation: 'portrait',  // Changed to portrait orientation
        unit: 'mm',
      });
      
      // Calculate dimensions to maintain aspect ratio for portrait
      const imgWidth = 190; // mm (A4 portrait width with margins)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF with patient identifier and data type
      pdf.setFontSize(14);
      pdf.text(`Patient: ${getPatientName(parseInt(patientId))} ID#: ${getFormattedPatientId(parseInt(patientId))} - ${displayName}`, 10, 10);
      pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, imgHeight);
      
      // Save PDF
      pdf.save(`patient-${patientId}-${dataType}.pdf`);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsExporting(false);
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
              <div className="flex items-center">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 mr-2" 
                  onClick={() => openDialog(false)}
                  title="Expand view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={compact ? "p-0" : "p-4"}>
          <div 
            style={{ 
              // Use fixed heights based on data type, with significantly increased sizes
              height: dataType === 'hrsn' ? 360 : 
                dataType === 'category' ? 460 : 560,
              width: '100%', 
              position: 'relative',
              display: 'block',
              border: '1px solid #f0f0f0',
              padding: '4px',
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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
          // Only allow close if not in full page mode
          if (!open && isFullPage) {
            // First exit full page mode, then close dialog
            setIsFullPage(false);
            setTimeout(() => setDialogOpen(false), 50);
          } else {
            setDialogOpen(open);
          }
        }} modal={true}>
        <DialogContent className={`${isFullPage ? 'fullpage-dialog w-screen h-screen max-w-none max-h-none' : 'max-w-[95vw] w-[95vw] h-[95vh]'} p-0 m-0 gap-0 overflow-hidden flex flex-col bg-white`}
          style={{ 
            width: isFullPage ? '100vw' : undefined,
            height: isFullPage ? '100vh' : undefined,
            marginTop: isFullPage ? '0' : undefined,
            marginLeft: isFullPage ? '0' : undefined,
            marginRight: isFullPage ? '0' : undefined,
            marginBottom: isFullPage ? '0' : undefined,
            padding: isFullPage ? '0' : undefined,
            gap: '0',
            position: isFullPage ? 'fixed' : undefined,
            top: isFullPage ? '0' : undefined,
            left: isFullPage ? '0' : undefined,
            right: isFullPage ? '0' : undefined,
            bottom: isFullPage ? '0' : undefined,
            borderRadius: isFullPage ? '0' : undefined,
            transform: isFullPage ? 'none' : undefined,
            maxWidth: isFullPage ? '100vw' : undefined,
            maxHeight: isFullPage ? '100vh' : undefined
          }}>
          <DialogHeader className="pb-2 pt-0 px-4 border-b m-0 bg-white" style={{ 
            margin: 0, 
            padding: '0 16px 8px 16px',
            position: isFullPage ? 'fixed' : 'relative',
            top: isFullPage ? '0' : 'auto',
            left: isFullPage ? '0' : 'auto',
            right: isFullPage ? '0' : 'auto',
            zIndex: isFullPage ? 100 : 'auto',
            width: isFullPage ? '100%' : 'auto',
            backgroundColor: 'white'
          }}> {/* Added proper positioning for full page mode */}
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl">
                {displayName} - Patient {getPatientName(parseInt(patientId))} ID#: {getFormattedPatientId(parseInt(patientId))}
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
                  variant={isFullPage ? "outline" : "default"}
                  className={isFullPage ? "" : "bg-blue-600 text-white hover:bg-blue-700"}
                  onClick={() => {
                    // Toggle full page mode directly without closing dialog
                    const newMode = !isFullPage;
                    setIsFullPage(newMode);
                    
                    // Apply direct DOM manipulation for immediate visual effect
                    if (newMode) {
                      document.body.style.overflow = 'hidden';
                      
                      // Force the browser to recalculate layout with a reflow
                      setTimeout(() => {
                        // Apply direct DOM manipulation to make it full screen
                        const dialogContent = document.querySelector('.fullpage-dialog');
                        if (dialogContent && dialogContent instanceof HTMLElement) {
                          dialogContent.style.position = 'fixed';
                          dialogContent.style.top = '0px'; /* Full page dialog should start from the top */
                          dialogContent.style.left = '0';
                          dialogContent.style.right = '0';
                          dialogContent.style.bottom = '0';
                          dialogContent.style.width = '100vw';
                          dialogContent.style.height = '100vh'; /* Full height */
                          dialogContent.style.maxHeight = '100vh';
                          dialogContent.style.maxWidth = '100vw';
                          dialogContent.style.margin = '0';
                          dialogContent.style.padding = '0';
                          dialogContent.style.borderRadius = '0';
                          dialogContent.style.zIndex = '9999';
                        }
                        
                        // Find the chart container and force scroll to top
                        const chartContainer = document.querySelector('.fullpage-chart-container');
                        if (chartContainer && chartContainer instanceof HTMLElement) {
                          // Reset scroll position to top
                          chartContainer.scrollTop = 0;
                          
                          // Add scroll reset after a short delay to ensure rendering is complete
                          setTimeout(() => {
                            chartContainer.scrollTop = 0;
                          }, 100);
                          
                          // Apply full screen styles to this chart container
                          chartContainer.style.position = 'fixed';
                          chartContainer.style.top = '55px'; /* Set to 55px to align with header */
                          chartContainer.style.left = '0';
                          chartContainer.style.right = '0';
                          chartContainer.style.bottom = '0'; 
                          chartContainer.style.width = '100vw';
                          chartContainer.style.height = 'calc(100vh - 55px)'; /* Adjusted for 55px header */
                          chartContainer.style.overflow = 'auto';
                        }
                      }, 10);
                    } else {
                      document.body.style.overflow = '';
                    }
                  }}
                >
                  {isFullPage ? "Exit Full Page" : "Full Page View"}
                </Button>
                {isExporting && <Loader2 className="h-4 w-4 animate-spin text-gray-500 ml-2" />}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-white p-0 m-0" style={{ padding: 0, margin: 0 }}>
            <div 
              style={{ 
                height: isFullPage ? '100vh' : '85vh',
                width: '100%',
                position: isFullPage ? 'fixed' : 'relative',
                top: isFullPage ? '55px' : 'auto', /* Set to 55px to align with header */
                left: isFullPage ? '0' : 'auto',
                right: isFullPage ? '0' : 'auto',
                bottom: isFullPage ? '0' : 'auto',
                backgroundColor: 'white',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'flex-start', /* Align to top instead of center for better scrolling */
                justifyContent: 'center',
                paddingTop: isFullPage ? '0' : '0', /* Completely eliminated paddingTop */
                paddingBottom: isFullPage ? '100px' : '0' /* Added bottom padding in full page mode */
              }}
              ref={expandedChartRef}
              className={isFullPage ? 'fullpage-chart-container' : ''}
            >
              {/* Expanded chart with sticky columns */}
              <div style={{ 
                width: isFullPage ? '100%' : '100%', 
                height: isFullPage ? '100%' : '100%', 
                minHeight: isFullPage ? '3500px' : 'auto', /* Force much taller chart in full page mode */
                maxWidth: 'none',  /* No width constraint */
                maxHeight: 'none', /* No height constraint */
                position: isFullPage ? 'relative' : 'relative',
                top: isFullPage ? '0' : 'auto',
                left: isFullPage ? '0' : 'auto',
                right: isFullPage ? '0' : 'auto',
                bottom: isFullPage ? '0' : 'auto',
                padding: isFullPage ? '0px' : '0', /* Removed inner padding to reduce white space */
                transform: isFullPage ? 'scale(1)' : 'none'
              }}>
                <ScatterChart expanded={true} />
              </div>
            </div>
          </div>
          
          {!isFullPage && (
            <DialogFooter className="py-3 px-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          )}
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
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [patientNotes, setPatientNotes] = useState<Array<{date: string, text: string}>>([]);
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-themed-row-colors-fixed/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);
  
  // Load patient notes when patient ID changes
  React.useEffect(() => {
    const fetchPatientNotes = async () => {
      try {
        const response = await fetch(`/api/patient/${patientToDisplay}/notes`);
        if (response.ok) {
          const notes = await response.json();
          setPatientNotes(notes);
        } else {
          // For demo, create some sample notes
          setPatientNotes([
            { date: '1/1/24', text: 'Patient reports difficulty concentrating and physical harm. Shows signs of overreating and loss of appetite.' },
            { date: '1/20/25', text: 'Patient demonstrates slow thinking and somatic complaints. Guilt and interruptions during group conversations noted.' },
            { date: '1/22/24', text: 'Observed physical harm tendencies and failure to fulfill obligations. Patient displays depressive symptoms and anxiety.' },
            { date: '1/27/25', text: 'Patient reports drug usage and housing instability. Difficulty paying for food and stress noted.' },
            { date: '12/16/24', text: 'Patient exhibits attention deficit and alcohol usage. Symptoms of bipolar disorder and persistent depressive disorder.' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching patient notes:', error);
        // Create sample notes on error
        setPatientNotes([
          { date: '1/1/24', text: 'Patient reports difficulty concentrating and physical harm. Shows signs of overreating and loss of appetite.' },
          { date: '1/20/25', text: 'Patient demonstrates slow thinking and somatic complaints. Guilt and interruptions during group conversations noted.' },
          { date: '1/22/24', text: 'Observed physical harm tendencies and failure to fulfill obligations. Patient displays depressive symptoms and anxiety.' },
          { date: '1/27/25', text: 'Patient reports drug usage and housing instability. Difficulty paying for food and stress noted.' },
          { date: '12/16/24', text: 'Patient exhibits attention deficit and alcohol usage. Symptoms of bipolar disorder and persistent depressive disorder.' },
        ]);
      }
    };
    
    fetchPatientNotes();
  }, [patientToDisplay]);
  
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
      
      // Convert to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait', // Changed to portrait orientation
        unit: 'mm',
      });
      
      // Add image to PDF
      const imgWidth = 190; // mm (A4 portrait width with margins)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.setFontSize(14);
      pdf.text(`Patient: ${getPatientName(parseInt(patientToDisplay))} ID#: ${getFormattedPatientId(parseInt(patientToDisplay))} - All Data`, 10, 10);
      pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, imgHeight);
      
      pdf.save(`patient-${patientToDisplay}-visualization.pdf`);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsExporting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-4 px-4">
      {/* Header section with patient info and color theme to the right */}
      <div className="mb-2" ref={titleRef}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Patient {getPatientName(parseInt(patientToDisplay))} <span className="text-muted-foreground">ID#: {getFormattedPatientId(parseInt(patientToDisplay))}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Interactive visualization of patient health data with bubble charts.
            </p>
          </div>
          
          {/* Color theme selector to the right of patient info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium whitespace-nowrap">Color Theme:</span>
            <Select value={currentTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select color theme" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                  <SelectItem key={key} value={key}>{theme.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Export buttons moved to the left */}
        <div className="flex justify-start items-center mb-3">
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={handleExportToPDF}
              disabled={isExporting}
            >
              <File className="h-3 w-3 mr-1" />
              Export Grids to PDF
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={handleExportToPNG}
              disabled={isExporting}
            >
              <FileImage className="h-3 w-3 mr-1" />
              Export Grids to PNG
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={() => window.location.href = `/pivot-tables/${patientToDisplay}`}
            >
              <TableProperties className="h-3 w-3 mr-1" />
              View Pivot Tables
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={() => window.location.href = `/enhanced-heatmap-v2/${patientToDisplay}`}
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              View Heatmaps
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={() => setNotesDialogOpen(true)}
            >
              <FileText className="h-3 w-3 mr-1" />
              Review Notes
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="h-3 w-3 mr-1" />
              Refresh Data
            </Button>
            
            {isExporting && <Loader2 className="h-4 w-4 animate-spin text-gray-500 ml-2" />}
          </div>
        </div>
      </div>
      
      {/* Visualization grid */}
      <div 
        className="grid grid-cols-2 gap-6" 
        ref={gridRef}
      >
        {DATA_TYPES.map(dataType => (
          <ScatterSection
            key={dataType.id}
            dataType={dataType.id}
            patientId={patientToDisplay}
            colorTheme={currentTheme}
          />
        ))}
      </div>
      
      {/* Patient Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[85vh]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">
              Patient Notes - {getPatientName(parseInt(patientToDisplay))} ID#: {getFormattedPatientId(parseInt(patientToDisplay))}
            </DialogTitle>
            <DialogDescription>
              Review clinical notes to compare with extracted symptoms and diagnoses.
            </DialogDescription>
          </DialogHeader>
          
          {patientNotes.length === 0 ? (
            <div className="p-4 border rounded-md bg-gray-50 text-center">
              No notes available for this patient.
            </div>
          ) : (
            <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-3 text-left font-medium text-gray-700 w-[120px] border-b border-r">Date</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-700 border-b">Clinical Note</th>
                  </tr>
                </thead>
                <tbody>
                  {patientNotes.map((note, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-3 border-r align-top">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-blue-500 flex-shrink-0" />
                          <span className="font-medium">{note.date}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button onClick={() => setNotesDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}