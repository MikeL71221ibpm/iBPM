import React, { useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ResponsiveHeatMap, DefaultHeatMapDatum } from '@nivo/heatmap';

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

// Interface for heatmap data
interface HeatmapCell {
  id: string;
  [key: string]: any;
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

// The ONLY color function to be used for cells - using direct hex codes
const getExactIridisColor = (normalizedValue: number, colorSet: any): string => {
  // Ensure we have valid inputs
  if (isNaN(normalizedValue) || normalizedValue === undefined || normalizedValue === null) {
    return colorSet?.LOWEST || '#EDF8FB'; // Default fallback color
  }
  
  // Ensure colorSet is valid
  if (!colorSet || typeof colorSet !== 'object') {
    // Fallback to a default color if colorSet is invalid
    return '#EDF8FB';
  }
  
  // Ensure extreme values are capped
  const capped = Math.max(0, Math.min(1, normalizedValue));
  
  // Apply logarithmic scaling for better distribution
  // This helps when there's a big gap between the max and other values
  const logScaled = Math.log(1 + capped * 9) / Math.log(10);
  
  // Using an even more dramatic threshold value scale for clearer visual differentiation
  if (logScaled >= 0.80 || capped >= 0.80) return colorSet.HIGHEST || '#994C99';
  if (logScaled >= 0.60 || capped >= 0.60) return colorSet.HIGH || '#8856A7';
  if (logScaled >= 0.40 || capped >= 0.40) return colorSet.MEDIUM || '#8C96C6';
  if (logScaled >= 0.20 || capped >= 0.20) return colorSet.LOW || '#B3CDE3';
  return colorSet.LOWEST || '#EDF8FB';
};

// Helper function for displaying patient name
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// HeatmapSection component for displaying a specific data type
const HeatmapSection = ({ 
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
  // DOM References
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  
  // Derived values
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  
  // Data fetching
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: dataType === 'category' ? 10 : 3,
    retryDelay: 1500,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  // Transform data for heatmap visualization
  const heatmapData = React.useMemo(() => {
    if (!data || !data.rows || !data.columns || !data.data) {
      return [];
    }
    
    // Calculate row totals for parenthetical values
    const rowTotals: Record<string, number> = {};
    
    data.rows.forEach(row => {
      let total = 0;
      data.columns.forEach(column => {
        total += data.data[row]?.[column] || 0;
      });
      rowTotals[row] = total;
    });
    
    // Sort rows by total value (descending) then alphabetically for same values
    const sortedRows = [...data.rows].sort((a, b) => {
      const totalDiff = rowTotals[b] - rowTotals[a];
      if (totalDiff !== 0) return totalDiff;
      return a.localeCompare(b);
    });
    
    console.log("Nivo Heatmap Data:", sortedRows.map(row => ({
      id: `${row} (${rowTotals[row]})`,
      total: rowTotals[row]
    })));

    return sortedRows.map(row => {
      const rowData: Record<string, any> = { 
        id: `${row} (${rowTotals[row]})`, // Add total in parentheses
        originalLabel: row,
        totalValue: rowTotals[row]
      };
      data.columns.forEach(column => {
        rowData[column] = data.data[row]?.[column] || 0;
      });
      return rowData;
    });
  }, [data]);
  
  // Find the maximum value for scaling
  const maxValue = React.useMemo(() => {
    if (!data || !data.rows || !data.columns) return 1;
    
    let max = 0;
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        max = Math.max(max, value);
      });
    });
    return max || 1;
  }, [data]);
  
  // Rendering helpers
  const colors = [
    colorSet.LOWEST || '#F8F8FF',
    colorSet.LOW || '#CCCCFF',
    colorSet.MEDIUM || '#B19CD9',
    colorSet.HIGH || '#9370DB',
    colorSet.HIGHEST || '#6A0DAD'
  ];
  
  const colorConfig = {
    type: 'sequential' as const,
    colors
  };
  
  const dialogTitle = `Patient ${patientId} ${displayName} - Heatmap Visualization`;

  // Export methods
  const downloadAsExcel = React.useCallback(() => {
    if (!data) return;
    
    try {
      setIsDownloading(true);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([
        ['', ...data.columns], // Header row with empty cell for row headers
        ...data.rows.map(row => [
          row,
          ...data.columns.map(col => data.data[row]?.[col] || 0)
        ])
      ]);
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patient Data');
      
      // Save file
      XLSX.writeFile(wb, `patient_${patientId}_${dataType}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [data, dataType, patientId]);
  
  // Using PDF method under the hood for PNG export to ensure consistent rendering
  const downloadAsPNG = React.useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      console.log("Starting PNG generation process via PDF method");
      
      // IMPORTANT: Using the PDF approach for PNG generation to ensure consistent rendering
      
      // Get inner visualization div which contains the actual chart - same as PDF export
      const innerChartDiv = chartRef.current.querySelector('div');
      const targetElement = dialogOpen ? innerChartDiv : chartRef.current;
      
      if (!targetElement) {
        console.error("Could not find target element for capture");
        alert("Error generating PNG: Could not find chart element to capture");
        return;
      }
      
      // Store original styles
      const originalStyle = targetElement.style.cssText;
      
      if (dialogOpen) {
        console.log("Preparing dialog for capture");
        document.body.style.overflow = 'visible';
        targetElement.style.height = `${targetElement.scrollHeight}px`;
        targetElement.style.overflow = 'visible';
        targetElement.style.maxHeight = 'none';
      }
      
      // Create patient info header - exactly as in PDF export
      let patientInfoHeader: HTMLDivElement | null = null;
      if (dialogOpen) {
        console.log("Adding patient info header");
        const patientName = getPatientName(parseInt(patientId));
        
        patientInfoHeader = document.createElement('div');
        patientInfoHeader.style.backgroundColor = '#f8fafc';
        patientInfoHeader.style.padding = '10px';
        patientInfoHeader.style.borderBottom = '1px solid #e5e7eb';
        patientInfoHeader.style.marginBottom = '10px';
        patientInfoHeader.style.textAlign = 'center';
        patientInfoHeader.innerHTML = `
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
            Patient: ${patientName}
          </div>
          <div style="font-size: 14px; color: #64748b;">
            Patient ID: P${patientId.padStart(4, '0')} | ${displayName} Visualization | Generated: ${new Date().toLocaleDateString()}
          </div>
        `;
        
        targetElement.insertBefore(patientInfoHeader, targetElement.firstChild);
      }
      
      // Create a new PDF document first - this is the key difference
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [targetElement.scrollWidth * 1.1, targetElement.scrollHeight * 1.1]
      });
      
      // First render to canvas using html2canvas with PDF quality settings
      const canvas = await html2canvas(targetElement, {
        scale: 3, // Higher resolution for better quality
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: Math.max(targetElement.scrollWidth, targetElement.clientWidth),
        height: Math.max(targetElement.scrollHeight, targetElement.clientHeight),
        onclone: (clonedDoc, clonedElement) => {
          // Use the same element expansion function from PDF export
          const expandElements = (element: HTMLElement) => {
            if (element.style) {
              element.style.height = 'auto';
              element.style.maxHeight = 'none';
              element.style.overflow = 'visible';
            }
            
            Array.from(element.children).forEach(child => {
              expandElements(child as HTMLElement);
            });
          };
          
          expandElements(clonedElement as HTMLElement);
        }
      });
      
      // Clean up DOM before proceeding
      if (dialogOpen) {
        document.body.style.overflow = '';
        targetElement.style.cssText = originalStyle;
        
        if (patientInfoHeader && patientInfoHeader.parentNode) {
          patientInfoHeader.parentNode.removeChild(patientInfoHeader);
        }
      }
      
      // Directly use the canvas data for PNG download instead of converting to PDF
      const link = document.createElement('a');
      link.download = `patient_${patientId}_${dataType}_visualization.png`;
      link.href = canvas.toDataURL('image/png');
      console.log("PNG generated via PDF method, initiating download");
      link.click();
      
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert(`Error generating PNG: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  }, [dialogOpen, patientId, dataType, displayName]);
  
  const downloadAsPDF = React.useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Get inner visualization div which contains the actual chart
      const innerChartDiv = chartRef.current.querySelector('div');
      const targetElement = dialogOpen ? innerChartDiv : chartRef.current;
      
      if (!targetElement) {
        console.error("Could not find target element for capture");
        return;
      }
      
      // Set some temporary styles to make sure we capture the entire visualization
      const originalStyle = targetElement.style.cssText;
      
      // When in dialog, we need to temporarily change the height constraints
      if (dialogOpen) {
        // Temporary overrides for export
        document.body.style.overflow = 'visible';
        targetElement.style.height = `${targetElement.scrollHeight}px`;
        targetElement.style.overflow = 'visible';
        targetElement.style.maxHeight = 'none';
      }
      
      // Create a temporary header with patient info for the export only
      let patientInfoHeader: HTMLDivElement | null = null;
      if (dialogOpen) {
        // Get patient name for the header
        const patientName = getPatientName(parseInt(patientId));
        
        patientInfoHeader = document.createElement('div');
        patientInfoHeader.style.backgroundColor = '#f8fafc';
        patientInfoHeader.style.padding = '10px';
        patientInfoHeader.style.borderBottom = '1px solid #e5e7eb';
        patientInfoHeader.style.marginBottom = '10px';
        patientInfoHeader.style.textAlign = 'center';
        patientInfoHeader.innerHTML = `
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
            Patient: ${patientName}
          </div>
          <div style="font-size: 14px; color: #64748b;">
            Patient ID: P${patientId.padStart(4, '0')} | ${displayName} Visualization | Generated: ${new Date().toLocaleDateString()}
          </div>
        `;
        
        // Insert at the top of the element
        targetElement.insertBefore(patientInfoHeader, targetElement.firstChild);
      }
      
      // Capture entire chart using precise dimensions
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight
      });
      
      // Restore original styles
      if (dialogOpen) {
        document.body.style.overflow = '';
        targetElement.style.cssText = originalStyle;
        
        // Remove the temporary header
        if (patientInfoHeader && patientInfoHeader.parentNode) {
          patientInfoHeader.parentNode.removeChild(patientInfoHeader);
        }
      }
      
      // Calculate dimensions for PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = Math.min(canvas.width, 4000); // Limit max width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF with appropriate dimensions
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`patient_${patientId}_${dataType}_visualization.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [dialogOpen, patientId, dataType, displayName]);
  
  // Simple version of cell and tooltip without extra hooks
  function renderCellContent({ x, y, width, height, color, value }: any) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          fill={color}
          stroke="#ffffff"
          strokeWidth={1}
        />
        {value > 0 && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              fill: value > (maxValue * 0.7) ? '#ffffff' : '#000000'
            }}
          >
            {value}
          </text>
        )}
      </g>
    );
  }
  
  function renderTooltip({ id, value, serieId }: any) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '8px 12px', 
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{serieId}</div>
        <div>Date: {id}</div>
        <div>Count: {value}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>Loading visualization data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>Error loading visualization</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-destructive">Failed to load data</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isDataEmpty = !data.rows || data.rows.length === 0 || !data.columns || data.columns.length === 0;

  if (isDataEmpty) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No data available for this visualization
        </CardContent>
      </Card>
    );
  }

  // Find the maximum value for scaling
  const maxValue = React.useMemo(() => {
    if (!data || !data.rows || !data.columns) return 1;
    
    let max = 0;
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        max = Math.max(max, value);
      });
    });
    return max || 1;
  }, [data]);

  const colors = [
    colorSet.LOWEST || '#F8F8FF',
    colorSet.LOW || '#CCCCFF',
    colorSet.MEDIUM || '#B19CD9',
    colorSet.HIGH || '#9370DB',
    colorSet.HIGHEST || '#6A0DAD'
  ];

  // Configure color scheme
  const colorConfig = {
    type: 'sequential' as const,
    colors
  };

  const dialogTitle = `Patient ${patientId} ${displayName} - Heatmap Visualization`;

  const renderChart = (height: number) => (
    <div style={{ height: `${height}px` }} ref={chartRef}>
      <ResponsiveHeatMap
        data={heatmapData}
        keys={data.columns}
        indexBy="id"
        margin={{ top: 40, right: 30, bottom: 50, left: 220 }}
        padding={2}
        forceSquare={false}
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendOffset: 36
        }}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Date',
          legendPosition: 'middle',
          legendOffset: 40
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 10,
          tickRotation: 0,
          legend: `${displayName}`,
          legendPosition: 'middle',
          legendOffset: -180,
          format: (value) => {
            // Display full value text with no truncation
            return value;
          },
          renderTick: (tick) => {
            // For custom tick rendering if needed
            return (
              <g transform={`translate(${tick.x},${tick.y})`}>
                <line stroke="#777" strokeWidth={1} x1={0} x2={-6} y1={0} y2={0} />
                <text
                  className="tick-text"
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    fill: '#64748b',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  transform="translate(-10,0)"
                >
                  {tick.value}
                </text>
              </g>
            );
          }
        }}
        cellOpacity={1}
        cellBorderWidth={1}
        cellBorderColor="#ffffff"
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
        colors={colorConfig}
        emptyColor="#f8fafc"
        minValue={0}
        maxValue={maxValue}
        hoverTarget="cell"
        cellComponent={renderCellContent}
        // Enhanced tooltip with better formatting
        tooltip={({ cell, serieId, value, data }) => {
          // Extract data from tooltip props safely
          const rawId = data.id || '';
          const splitId = typeof rawId === 'string' ? rawId.split(' (') : ['', ''];
          const itemName = splitId[0];
          const totalValue = splitId.length > 1 ? splitId[1].replace(')', '') : '0';
          
          return (
            <div style={{ 
              background: 'white', 
              padding: '10px 14px', 
              border: '1px solid #ccc',
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              fontSize: '14px',
              maxWidth: '300px'
            }}>
              <div><strong>Item:</strong> {itemName}</div>
              <div><strong>Date:</strong> {serieId}</div>
              <div><strong>Value:</strong> {value || 0}</div>
              <div><strong>Total Occurrences:</strong> {totalValue}</div>
            </div>
          );
        }}
        animate={true}
        motionConfig="gentle"
        theme={{
          tooltip: {
            container: {
              background: 'white',
              fontSize: '12px',
              borderRadius: '4px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }
          },
          axis: {
            ticks: {
              text: {
                fill: '#64748b',
                fontSize: 12
              }
            },
            legend: {
              text: {
                fill: '#334155',
                fontSize: 14,
                fontWeight: 'bold'
              }
            }
          }
        }}
        legends={[
          {
            anchor: 'top',
            translateX: 0,
            translateY: -50,
            length: 120,
            thickness: 10,
            direction: 'row',
            tickPosition: 'after',
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            tickFormat: '>-.2s',
            title: 'Value →',
            titleAlign: 'start',
            titleOffset: 4
          }
        ]}
      />
    </div>
  );

  const compactHeight = 400;
  const fullHeight = 700;

  return (
    <>
      <Card className="w-full h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">{displayName}</CardTitle>
            <CardDescription>
              {DATA_TYPES.find(type => type.id === dataType)?.description || `${displayName} visualization for patient ${patientId}`}
            </CardDescription>
          </div>
          <div className="flex flex-row space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              title="View Full Screen"
            >
              Expand
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {renderChart(compact ? compactHeight : fullHeight)}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-4 px-12 gap-2">
          <DialogHeader className="pb-0 pt-0">
            <div className="flex flex-row justify-between items-center">
              <DialogTitle className="text-base font-bold">{dialogTitle}</DialogTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsExcel}
                  disabled={isDownloading}
                  title="Download Excel"
                  className="h-8"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsPNG}
                  disabled={isDownloading}
                  title="Download PNG"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <FileImage className="h-4 w-4 mr-1" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsPDF}
                  disabled={isDownloading}
                  title="Download PDF"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <File className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">Patient ID: P{patientId.padStart(4, '0')}</span>
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            {renderChart(fullHeight)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function EnhancedHeatmapView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  
  // State for theme selection - default to 'iridis'
  const [currentTheme, setCurrentTheme] = React.useState('iridis');
  
  // Global export functions for the entire grid
  const exportGridAsPDF = useCallback(async () => {
    if (!gridRef.current) return;
    
    try {
      setIsExporting(true);
      
      // Use html2canvas to capture the entire grid
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`patient_${patientToDisplay}_all_heatmaps.pdf`);
      
    } catch (err) {
      console.error('Error exporting grid as PDF:', err);
    } finally {
      setIsExporting(false);
    }
  }, [gridRef, patientToDisplay]);
  
  const exportGridAsPNG = useCallback(async () => {
    if (!gridRef.current) return;
    
    try {
      setIsExporting(true);
      
      // Use html2canvas to capture the entire grid
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `patient_${patientToDisplay}_all_heatmaps.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } catch (err) {
      console.error('Error exporting grid as PNG:', err);
    } finally {
      setIsExporting(false);
    }
  }, [gridRef, patientToDisplay]);

  return (
    <div className="container mx-auto py-6 px-12">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
            </h1>
            <p className="text-muted-foreground">
              ID#: P{patientToDisplay.padStart(4, '0')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Quick overview of all patient data through heatmap visualizations.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Color Theme:</span>
              <Select
                value={currentTheme}
                onValueChange={(value) => setCurrentTheme(value)}
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
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
                onClick={exportGridAsPDF}
                disabled={isExporting}
              >
                <File className="h-4 w-4 mr-2" />
                Export Grids to PDF
              </Button>
              
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
                onClick={exportGridAsPNG}
                disabled={isExporting}
              >
                <FileImage className="h-4 w-4 mr-2" />
                Export Grids to PNG
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={gridRef}>
          {DATA_TYPES.map((dataType) => (
            <HeatmapSection
              key={dataType.id}
              dataType={dataType.id}
              patientId={patientToDisplay}
              colorTheme={currentTheme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}