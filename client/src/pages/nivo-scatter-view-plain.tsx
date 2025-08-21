// A simplified version with minimal changes to fix Full Page View

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet, FileImage, File, Maximize } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

interface PatientVisualizationParams {
  patientId?: string;
}

interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number;
  frequency: number;
  color?: string;
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Define our interface for the component props
interface VisualizationProps {
  dataType: 'symptom' | 'diagnosis' | 'category' | 'hrsn';
  displayName: string;
  compact?: boolean;
  height?: string | number;
  allowExpand?: boolean;
  exportFileName?: string;
  patientId?: string;
}

export const NivoScatterViewPlain = ({ 
  dataType, 
  displayName,
  compact = false,
  height,
  allowExpand = true,
  exportFileName,
  patientId: propPatientId
}: VisualizationProps) => {
  // Get the patient ID from URL params or props
  const params = useParams<PatientVisualizationParams>();
  const urlPatientId = params.patientId || '';
  const patientId = propPatientId || urlPatientId || '1';
  
  // This handles the expand/collapse functionality
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFullPageView, setIsFullPageView] = useState(false);
  
  // For tracking export status
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // For capturing the chart for export
  const chartRef = useRef<HTMLDivElement>(null);

  // Function to get patient name
  const getPatientName = (id: number): string => {
    const patientMap: Record<number, string> = {
      1: 'Bob Test',
      2: 'Jane Demo',
      3: 'Chris Sample',
      4: 'Mark Example',
      5: 'Mary User'
    };
    return patientMap[id] || `Patient ${id}`;
  };
  
  // Colors map for intensity-based coloring
  const INTENSITY_COLORS = {
    "HIGHEST": "#994C99", // Purple
    "HIGH": "#8856A7",    // Light Purple
    "MEDIUM": "#8C96C6",  // Periwinkle
    "LOW": "#B3CDE3",     // Light Blue
    "LOWEST": "#EDF8FB"   // Near White
  };
  
  // Use this color set for this specific visualization
  const colorSet = INTENSITY_COLORS;

  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
    enabled: !!patientId, // Only fetch when we have a patientId
  });
  
  // For storing processed data and row colors from the data
  const [scatterData, setScatterData] = useState<ScatterGroupData[]>([]);
  const [rowColors, setRowColors] = useState<Record<string, string>>({});
  const [maxValue, setMaxValue] = useState<number>(1);
  
  // Process the data when it changes
  useEffect(() => {
    if (!data) return;
    
    // Set the max value for sizing bubbles properly
    setMaxValue(data.maxValue || 1);
    console.log("Calculated maxValue:", data.maxValue, "for", dataType);
    console.log("SCATTER PLOT using maxValue=" + data.maxValue + " for " + dataType);

    // Process the data for Nivo Scatter Plot
    const processedData: ScatterGroupData[] = [];
    const rowColorMap: Record<string, string> = {};
    
    // First, create a map of how many times each row (y-value) appears across dates
    const rowFrequencyMap: Record<string, number> = {};
    
    // Calculate frequency for each row
    data.rows.forEach(row => {
      let totalOccurrencesAcrossDates = 0;
      let datesWithOccurrence = 0;
      
      data.columns.forEach(col => {
        // If this row has any data for this column (date), count it
        if (data.data[row]?.[col] && data.data[row][col] > 0) {
          totalOccurrencesAcrossDates += data.data[row][col];
          datesWithOccurrence++;
        }
      });
      
      // Set frequency as number of dates this row appears in
      rowFrequencyMap[row] = datesWithOccurrence;
    });
    
    // Helper function to get color based on average intensity
    const getIntensityColor = (avgIntensity: number) => {
      if (avgIntensity >= 0.8) return INTENSITY_COLORS.HIGHEST;
      if (avgIntensity >= 0.6) return INTENSITY_COLORS.HIGH;
      if (avgIntensity >= 0.4) return INTENSITY_COLORS.MEDIUM;
      if (avgIntensity >= 0.2) return INTENSITY_COLORS.LOW;
      return INTENSITY_COLORS.LOWEST;
    };
    
    // Assign unique colors to each row based on its average value
    data.rows.forEach((row, index) => {
      // Calculate row's average value
      let totalValue = 0;
      let nonZeroColumns = 0;
      
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        if (value > 0) {
          totalValue += value;
          nonZeroColumns++;
        }
      });
      
      // Calculate average value for only dates where this row appears
      const avgValue = nonZeroColumns > 0 ? totalValue / nonZeroColumns : 0;
      
      // Normalize to 0-1 range using max value in the dataset
      const normalizedAvg = data.maxValue ? avgValue / data.maxValue : 0;
      
      // Get color for this row - this assigns a consistent color to each row
      rowColorMap[row] = getIntensityColor(normalizedAvg);
    });
    
    // Set row colors state
    setRowColors(rowColorMap);
    
    // Convert to Nivo scatter plot format
    const scatterGroup: ScatterGroupData = {
      id: `${dataType}-data`,
      data: []
    };
    
    // Create scatter points for each cell with data
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        if (value > 0) {
          // Add a data point
          scatterGroup.data.push({
            x: col,
            y: row,
            size: value,
            frequency: rowFrequencyMap[row] || 1,
            color: rowColorMap[row] // This will be used in the colors function
          });
        }
      });
    });
    
    processedData.push(scatterGroup);
    setScatterData(processedData);
  }, [data, dataType]);

  // Handle generating Excel file
  const downloadAsExcel = async () => {
    if (!data) return;
    
    try {
      setIsDownloading(true);
      
      // Create a worksheet
      const ws = XLSX.utils.aoa_to_sheet([
        ['Patient', getPatientName(parseInt(patientId))],
        ['Patient ID', `P${patientId.padStart(4, '0')}`],
        ['Report Type', displayName],
        ['Generated', new Date().toLocaleDateString()],
        [''], // Empty row
        ['Date of Service', ...data.rows] // Header row with row names as columns
      ]);
      
      // Add data rows - dates as rows, items as columns
      data.columns.forEach((date, dateIndex) => {
        const rowData: any[] = [date]; // Start with the date
        
        // Add data for each row (now a column)
        data.rows.forEach(rowItem => {
          rowData.push(data.data[rowItem]?.[date] || '');
        });
        
        // Append to worksheet at the appropriate row (accounting for header rows)
        XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: { r: dateIndex + 6, c: 0 } });
      });
      
      // Create workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, displayName);
      
      // Generate file name
      const fileName = exportFileName ? 
        `${exportFileName}.xlsx` : 
        `Patient_${patientId}_${displayName.replace(/\s+/g, '_')}.xlsx`;
      
      // Write and download
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Excel export error:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle PDF export
  const downloadAsPDF = async () => {
    if (!chartRef.current || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Use html2canvas to capture the entire grid
      const canvas = await html2canvas(chartRef.current, { 
        scale: 2, 
        logging: false,
        useCORS: true
      });
      
      // Calculate dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pdf = new jsPDF({
        orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvasWidth, canvasHeight]
      });
      
      // Get the dimensions accounting for margins
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add patient information
      pdf.setFontSize(16);
      pdf.text(`Patient: ${getPatientName(parseInt(patientId))}`, 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Patient ID: P${patientId.padStart(4, '0')}`, 20, 40);
      pdf.text(`${displayName} - Generated: ${new Date().toLocaleDateString()}`, 20, 60);
      
      // Add the chart image with top margin for patient info
      const imageY = 80; // Leave space for header
      const availableHeight = pdfHeight - imageY;
      const aspectRatio = canvasHeight / canvasWidth;
      const imageHeight = Math.min(availableHeight, pdfWidth * aspectRatio);
      
      pdf.addImage(
        canvas.toDataURL('image/png'), 
        'PNG', 
        0, 
        imageY, 
        pdfWidth, 
        imageHeight
      );
      
      // Generate file name
      const fileName = exportFileName ? 
        `${exportFileName}.pdf` : 
        `Patient_${patientId}_${displayName.replace(/\s+/g, '_')}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle PNG export
  const downloadAsPNG = async () => {
    if (!chartRef.current || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Create a hidden canvas for higher quality export
      const canvas = await html2canvas(chartRef.current, { 
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      // Add patient info text at the top
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Save current transform/settings
        ctx.save();
        
        // Add white rectangle for header
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, 80);
        
        ctx.fillStyle = 'black';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Patient: ${getPatientName(parseInt(patientId))}`, 20, 30);
        
        ctx.font = '16px Arial';
        ctx.fillText(`Patient ID: P${patientId.padStart(4, '0')}`, 20, 50);
        ctx.fillText(`${displayName} - Generated: ${new Date().toLocaleDateString()}`, 20, 70);
        
        // Restore original context
        ctx.restore();
      }
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate file name
        const fileName = exportFileName ? 
          `${exportFileName}.png` : 
          `Patient_${patientId}_${displayName.replace(/\s+/g, '_')}.png`;
        
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setIsExporting(false);
      }, 'image/png');
    } catch (error) {
      console.error('PNG export error:', error);
      setIsExporting(false);
    }
  };

  // Component render
  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{displayName}</h3>
        {allowExpand && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 text-xs"
          >
            <Maximize className="h-3 w-3" />
            <span>Expand</span>
          </Button>
        )}
      </div>
      
      <div>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setIsFullPageView(false);
            }
            setDialogOpen(open);
          }}
        >
          <DialogContent
            className={`
              ${isFullPageView ? 'w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh]' : 'max-w-5xl max-h-[90vh]'} 
              p-4 overflow-auto
            `}
          >
            {/* Display patient info in full page view */}
            {isFullPageView && data && (
              <div className="w-full bg-slate-50 p-4 mb-4 rounded-md border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <h2 className="text-xl font-bold">
                      Patient: {getPatientName(parseInt(patientId))}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Patient ID: P{patientId.padStart(4, '0')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{displayName}</h3>
                    <p className="text-sm text-gray-500">
                      {data.rows.length} items | Generated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Display header in standard view */}
            {!isFullPageView && (
              <DialogHeader>
                <DialogTitle>{displayName} - Full View</DialogTitle>
                <DialogDescription>
                  Expanded view with detailed visualization
                </DialogDescription>
              </DialogHeader>
            )}
            
            {/* Display data content */}
            {data && (
              <>
                {!isFullPageView && (
                  <div className="p-2 bg-slate-50 border-b mb-4">
                    <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                    <p className="text-sm text-gray-500">
                      Showing {data.rows.length} items. Bubble size indicates occurrence count per session.
                    </p>
                  </div>
                )}
                
                {/* Toolbar */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">
                      Hover over bubbles to see details
                    </div>
                    <Button
                      variant={isFullPageView ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsFullPageView(!isFullPageView)}
                    >
                      {isFullPageView ? "Standard View" : "Full Page View"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadAsExcel}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                      )}
                      Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadAsPDF}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <File className="h-4 w-4 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadAsPNG}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <FileImage className="h-4 w-4 mr-1" />
                      )}
                      PNG
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
                
                {/* Chart container */}
                <div 
                  className="overflow-auto bg-white"
                  style={{ 
                    height: isFullPageView ? 'calc(75vh - 120px)' : '75vh',
                    width: '100%', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                  ref={chartRef}
                >
                  <div style={{
                    height: Math.max(25 * data.rows.length, 
                      dataType === 'hrsn' ? 400 : (
                        dataType === 'category' ? (isFullPageView ? 1500 : 1000) : (
                          dataType === 'diagnosis' ? (isFullPageView ? 2800 : 2000) : (isFullPageView ? 3200 : 2500)
                        )
                      )
                    ) + 'px',
                    minHeight: isFullPageView ? '700px' : '600px',
                    width: '100%'
                  }}>
                    {/* scatter visualization component */}
                    <ScatterVisualization 
                      data={scatterData} 
                      rows={data.rows}
                      maxValue={maxValue}
                      compact={false}
                      colorSet={colorSet}
                      rowColors={rowColors}
                    />
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Main content area - compact view */}
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
  compact = false 
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  colorSet: any;
  rowColors?: Record<string, string>;
  compact?: boolean;
}) => {
  // For the tooltip
  const [tooltipData, setTooltipData] = React.useState<{
    x: string;
    y: string;
    size: number;
    frequency: number;
    visible: boolean;
    color: string;
  } | null>(null);
  
  // Use refs to track the debounce timers
  const tooltipTimerRef = React.useRef<number | null>(null);
  const tooltipCleanupRef = React.useRef<number | null>(null);
  
  // Clean up timers on component unmount
  React.useEffect(() => {
    return () => {
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
  const leftMargin = Math.min(Math.max(8 * maxLabelLength, 100), compact ? 180 : 250);
  
  // Margins and styling
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: leftMargin } 
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  // Process the data
  const processedData = data.map(series => {
    return {
      id: series.id,
      data: series.data.map(point => {
        return {
          x: point.x,
          y: point.y,
          size: point.size,
          frequency: point.frequency,
          color: point.color
        };
      })
    };
  });
  
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Tooltip */}
      {tooltipData && tooltipData.visible && (
        <div className="absolute top-0 left-0 right-0 flex justify-center h-auto" style={{ zIndex: 1000 }}>
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
            <div className="text-xs my-1">
              <strong>Present in sessions:</strong> {tooltipData.frequency}
            </div>
          </div>
        </div>
      )}
      
      {/* Scatter Plot */}
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
          renderTick: (tick: any) => {
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
                  transform={`translate(0,1) rotate(${titleRotation})`} 
                  style={{ 
                    dominantBaseline: 'middle', 
                    textAnchor: 'end',
                    pointerEvents: 'none'
                  }}
                >
                  <text style={{ fill: '#333', fontSize: '10px', fontWeight: 'bold' }}>
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
                
                {/* Text label */}
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
        // Size based on occurrences
        nodeSize={(d: any) => {
          if (!d?.data) return 4;
          const occurrences = d.data.size || 1;
          const scaledSize = Math.max(4, Math.min(24, 4 + (occurrences - 1) * 3));
          return scaledSize;
        }}
        theme={{
          tooltip: { container: { background: 'transparent', padding: 0, boxShadow: 'none' } },
          crosshair: { line: { stroke: 'transparent' } }
        }}
        colors={(d: any) => {
          // If point has a specific color, use it
          if (d.data?.color) return d.data.color;
          
          // Otherwise, get color from rowColors using y value (row name)
          const rowName = d.data?.y;
          if (rowName && rowColors[rowName]) {
            return rowColors[rowName];
          }
          
          // Default fallback
          return '#3B82F6';
        }}
        tooltip={() => null} // Disable the default tooltip
        onMouseEnter={(node: any, event) => {
          // Clear any existing hide timer
          if (tooltipCleanupRef.current !== null) {
            window.clearTimeout(tooltipCleanupRef.current);
            tooltipCleanupRef.current = null;
          }
          
          // Get data about this point
          const point = node.data;
          const rowName = point.y;
          const size = point.size;
          const freq = point.frequency;
          const color = rowColors[rowName] || '#333';
          
          // Show tooltip after a short delay
          tooltipTimerRef.current = window.setTimeout(() => {
            setTooltipData({
              x: point.x,
              y: rowName,
              size: size,
              frequency: freq,
              visible: true,
              color: color
            });
          }, 100);
        }}
        onMouseLeave={(node: any, event) => {
          // Clear the show timer if it exists
          if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
          }
          
          // Hide tooltip after a short delay
          tooltipCleanupRef.current = window.setTimeout(() => {
            setTooltipData(null);
          }, 200);
        }}
        enableGridX={false}
        enableGridY={false}
      />
    </div>
  );
};

export default NivoScatterViewPlain;