import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { 
  ResponsiveScatterPlot, 
  type ScatterPlotNodeData 
} from '@nivo/scatterplot';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Maximize,
  File,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Type definitions
interface PatientVisualizationParams {
  patientId?: string;
}

// Interface for our scatter plot data points
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

// Interface for scatter plot data (the main data structure used by Nivo)
interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

// Interface for pivot data from API
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Color themes for different visualization modes
const COLOR_THEMES = {
  iridis: { // Iridis theme - purple to cyan
    HIGHEST: '#994C99',
    HIGH: '#8856A7',
    MEDIUM: '#8C96C6',
    LOW: '#B3CDE3',
    LOWEST: '#EDF8FB'
  },
  bright: { // Bright theme - red to blue
    HIGHEST: '#D7301F',
    HIGH: '#FC8D59',
    MEDIUM: '#FDCC8A',
    LOW: '#9ECAE1',
    LOWEST: '#EFF3FF'
  },
  mono: { // Monochrome theme - dark to light
    HIGHEST: '#252525',
    HIGH: '#636363',
    MEDIUM: '#969696',
    LOW: '#CCCCCC',
    LOWEST: '#F7F7F7'
  },
  // Can add more themes as needed
};

// Get formatted patient name (for display)
function getPatientName(patientId: number): string {
  // In a real app, this would fetch from an API
  return `Patient ${patientId}`;
}

// Main component props
interface VisualizationProps {
  dataType: 'symptom' | 'diagnosis' | 'category' | 'hrsn';
  displayName: string;
  compact?: boolean;
  height?: string | number;
  allowExpand?: boolean;
  exportFileName?: string;
  patientId?: string;
}

// The main component - contains the visualization and controls
export const NivoScatterViewThemed = ({ 
  dataType, 
  displayName, 
  compact = false,
  height,
  allowExpand = true,
  exportFileName,
  patientId = '1' 
}: VisualizationProps) => {
  // States for UI interactions
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isFullPageView, setIsFullPageView] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [scatterData, setScatterData] = React.useState<ScatterGroupData[]>([]);
  
  // Reference to chart container (for export)
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  // For toast notifications
  const { toast } = useToast();
  
  // State for theme selection - default to 'iridis'
  const [currentTheme] = React.useState('iridis');
  
  // Get the active color set
  const colorSet = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES];
  
  // Fetch data from the API based on dataType and patientId
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Store the maxValue from API response or calculate if needed
  const maxValue = data?.maxValue || 0;
  console.log("Calculated maxValue:", maxValue, "for", dataType);
  
  // Create a cache of row colors for consistent rendering
  const [rowColors, setRowColors] = React.useState<Record<string, string>>({});
  
  // Process data for scatter plot when raw data changes
  React.useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log("SCATTER PLOT using maxValue=" + maxValue + " for " + dataType);
    
    // Create a map of row names to colors for consistency
    const newRowColors: Record<string, string> = {};
    
    // Assign a color to each row - use a range of different hues
    // We need to ensure each row gets the same color consistently
    data.rows.forEach((row, index) => {
      const hueStep = 360 / Math.max(20, data.rows.length);
      const hue = (index * hueStep) % 360;
      newRowColors[row] = `hsl(${hue}, 70%, 50%)`;
    });
    
    setRowColors(newRowColors);
    
    // Process the data for the scatter plot - transforms the pivot data
    // into the format required by Nivo scatter plot
    const processedData: ScatterGroupData[] = [
      {
        id: dataType,
        data: []
      }
    ];
    
    // Loop through each row and column to create data points
    data.rows.forEach(row => {
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || 0;
        if (value > 0) {
          // Get frequency count (how many columns this row appears in)
          const frequency = data.columns.filter(col => 
            (data.data[row]?.[col] || 0) > 0
          ).length;
          
          // Add data point
          processedData[0].data.push({
            x: column,
            y: row,
            size: value, // Use actual value for bubble size
            frequency: frequency,
            // We'll apply color in the colors prop function
          });
        }
      });
    });
    
    setScatterData(processedData);
  }, [data, dataType]);

  // Handle generating Excel file
  const downloadAsExcel = async () => {
    if (!data) return;
    
    try {
      setIsDownloading(true);
      
      // Create a worksheet with patient information headers
      const ws = XLSX.utils.aoa_to_sheet([
        ['Patient', getPatientName(parseInt(patientId))],
        ['Patient ID', `P${patientId.padStart(4, '0')}`],
        ['Report Type', displayName],
        ['Generated', new Date().toLocaleDateString()],
        [''] // Empty row
      ]);
      
      // TRANSPOSED: Prepare header row with dates as columns
      const headerRow = ['Item/Symptom', ...data.columns]; // First column is for symptoms/labels
      XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: { r: 5, c: 0 } });
      
      // TRANSPOSED: Add rows for each symptom/item
      data.rows.forEach((rowItem, rowIndex) => {
        const rowData: any[] = [rowItem]; // Start with the symptom/item name
        
        // Add data for each date (now a column)
        data.columns.forEach(date => {
          rowData.push(data.data[rowItem]?.[date] || '');
        });
        
        // Append to worksheet at the appropriate row (accounting for header rows)
        XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: { r: rowIndex + 6, c: 0 } });
      });
      
      // Create workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, displayName);
      
      // Generate file name
      const fileName = exportFileName ? 
        `${exportFileName}.xlsx` : 
        `Patient_${patientId}_${displayName.replace(/\\s+/g, '_')}.xlsx`;
      
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
        useCORS: true,
        windowWidth: chartRef.current.scrollWidth,
        windowHeight: chartRef.current.scrollHeight
      });
      
      // Calculate dimensions - we'll use standardized dimensions for better document navigation
      // Use A4 size in landscape for consistent viewing/navigation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get the dimensions of the PDF page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add patient information
      pdf.setFontSize(16);
      pdf.text(`Patient: ${getPatientName(parseInt(patientId))}`, 10, 15);
      pdf.setFontSize(12);
      pdf.text(`Patient ID: P${patientId.padStart(4, '0')}`, 10, 25);
      pdf.text(`${displayName} - Generated: ${new Date().toLocaleDateString()}`, 10, 35);
      
      // Add the chart image with top margin for patient info
      const imageY = 45; // Leave space for header (in mm)
      const availableHeight = pdfHeight - imageY;
      
      // Get canvas aspect ratio
      const canvasAspect = canvas.width / canvas.height;
      
      // Determine image dimensions to fit in available space
      // while maintaining aspect ratio
      let imageWidth = pdfWidth - 20; // 10mm margin on each side
      let imageHeight = imageWidth / canvasAspect;
      
      // If image height exceeds available height, scale down
      if (imageHeight > availableHeight) {
        imageHeight = availableHeight - 10; // 10mm bottom margin
        imageWidth = imageHeight * canvasAspect;
      }
      
      // Center the image horizontally
      const imageX = (pdfWidth - imageWidth) / 2;
      
      // Add the image to the PDF
      pdf.addImage(
        canvas.toDataURL('image/png'), 
        'PNG', 
        imageX, 
        imageY, 
        imageWidth, 
        imageHeight
      );
      
      // Add navigation instructions at bottom
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Use PDF viewer's zoom and scroll features to navigate the full visualization", 10, pdfHeight - 5);
      
      // Generate file name
      const fileName = exportFileName ? 
        `${exportFileName}.pdf` : 
        `Patient_${patientId}_${displayName.replace(/\\s+/g, '_')}.pdf`;
      
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
      // Include full scrollWidth and scrollHeight to capture the entire visualization
      const canvas = await html2canvas(chartRef.current, { 
        scale: 2,
        logging: false,
        useCORS: true,
        windowWidth: chartRef.current.scrollWidth,
        windowHeight: chartRef.current.scrollHeight,
        width: chartRef.current.scrollWidth,
        height: chartRef.current.scrollHeight
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
          `Patient_${patientId}_${displayName.replace(/\\s+/g, '_')}.png`;
        
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
      <div className="flex justify-between items-center mb-0">
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
        <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) {
              // Reset to standard view when closing the dialog
              setIsFullPageView(false);
            }
            setDialogOpen(open);
          }}>
          <DialogContent 
            className="p-2"
            style={{
              width: isFullPageView ? '95vw' : 'auto',
              maxWidth: isFullPageView ? '95vw' : '90vw', 
              height: isFullPageView ? '90vh' : 'auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '10px 15px',
              marginTop: '10px'
            }}>
            {/* In full page view, we show the patient info directly on top */}
            {isFullPageView && data && (
              <div className="w-full bg-slate-50 p-3 mb-2 rounded-md border border-slate-200">
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
            
            {!isFullPageView && (
              <DialogHeader>
                <DialogTitle>{displayName} - Full View</DialogTitle>
                <DialogDescription>
                  Expanded view with detailed visualization and export options
                </DialogDescription>
              </DialogHeader>
            )}
            
            {data && (
              <>
                {!isFullPageView && (
                  <div className="p-2 bg-slate-50 border-b mb-2">
                    <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                    <p className="text-sm text-gray-500">
                      Showing {data.rows.length} items. Bubble size indicates occurrence count per session.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-2">
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
                
                {/* Main visualization container - flexbox structure completely revamped */}
                <div 
                  className="overflow-auto"
                  style={{ 
                    height: isFullPageView ? 'calc(90vh - 120px)' : '75vh',
                    width: '100%', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    position: 'relative',
                    marginTop: '0'
                  }}
                  ref={chartRef}
                >
                  {/* CSS for sticky date headers at the top */}
                  <style>
                    {`
                      .nivo-axis-top text {
                        position: sticky;
                        top: 0;
                        background: white;
                        z-index: 10;
                      }
                    `}
                  </style>
                  <div style={{
                    height: Math.max(25 * data.rows.length, 
                      dataType === 'hrsn' ? 400 : (
                        dataType === 'category' ? (isFullPageView ? 1500 : 1000) : (
                          dataType === 'diagnosis' ? (isFullPageView ? 2800 : 2000) : (isFullPageView ? 3200 : 2500)
                        )
                      )
                    ) + 'px',
                    minHeight: isFullPageView ? '650px' : '550px',
                    minWidth: isFullPageView ? '1200px' : 'auto',
                    width: '100%',
                    paddingTop: '0'
                  }}>
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
      
      <div className="p-0 mt-0">
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
            className="mt-0" 
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
  compact = false 
}: { 
  data: ScatterGroupData[]; 
  rows: string[];
  maxValue: number;
  colorSet: any;
  rowColors?: Record<string, string>;
  compact?: boolean;
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
  const leftMargin = Math.min(Math.max(8 * maxLabelLength, 100), compact ? 180 : 250);
  
  // Margins and styling
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: leftMargin } 
    : { top: 15, right: 40, bottom: 90, left: leftMargin };
    
  const titleRotation = -45;
  
  // Process data to ensure each point has the correct color from rowColors
  const processedData = data.map(series => {
    return {
      id: series.id,
      data: series.data.map(point => {
        const rowName = point.y;
        return {
          x: point.x,
          y: point.y,
          size: point.size,
          frequency: point.frequency,
          color: rowColors[rowName] || '#3B82F6' // Use row-specific color from rowColors map
        };
      })
    };
  });
  
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
                    pointerEvents: 'none' // Prevents date labels from interfering with points
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
        // IMPORTANT: This controls the bubble color
        colors={(d: any) => {
          const rowName = d.data?.y;
          const color = rowColors[rowName] || '#3B82F6';
          
          // Always return the color from the rowColors map to ensure consistency
          return color;
        }}
        // Enable click to get more info about the point
        tooltip={() => null} // Disable the default tooltip
        // Custom event handling to show our own tooltip
        onMouseEnter={(node: any) => {
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
        onMouseLeave={() => {
          // Clear the show timer if it exists
          if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
          }
          
          // Hide tooltip after a short delay (allows moving to tooltip)
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