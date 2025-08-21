import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Maximize2, Download, FileSpreadsheet, FileImage, Loader2, 
  FilePdf, ChevronDown, BarChart3, ZoomIn
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ResponsiveScatterPlot,
} from '@nivo/scatterplot';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface definitions
interface PatientVisualizationParams {
  patientId?: string;
}

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

interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Bubble Chart Color Sets
const colorPalettes = {
  default: [
    '#396EB0', '#2E8BC0', '#0E9AA7', '#3DA5D9', '#4C5B5C', '#609EA2',
    '#73A9AD', '#5A6ACF', '#6155A6', '#826AED', '#8D72E1', '#8661C1',
    '#191D88', '#1D267D', '#5D3587', '#9A3B3B', '#A04B73', '#B983FF',
    '#9376E0', '#BFCCB5', '#7C9D96', '#687EFF', '#00AEFF'
  ],
  blues: [
    '#1967D2', '#2684FF', '#4C9AFF', '#85B8FF', '#DEEBFF',
    '#034ADA', '#0747A6', '#0052CC', '#0065FF', '#2684FF',
    '#227FFF', '#0052CC', '#0065FF', '#2684FF'
  ],
  rainbow: [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF',
    '#4B0082', '#8B00FF', '#FF007F', '#FF00FF', '#00FFFF',
    '#FF5500', '#CC00FF', '#FFC0CB', '#964B00'
  ],
};

export default function NivoScatterViewThemed() {
  // Get patientId from URL if present
  const params = {} as PatientVisualizationParams;
  
  // State for data
  const [data, setData] = useState<PivotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs and display state 
  const chartRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const [dataType, setDataType] = useState<'symptom' | 'diagnosis' | 'category' | 'hrsn'>('symptom');
  
  // State for color scheme
  const [colorScheme, setColorScheme] = useState<keyof typeof colorPalettes>('default');
  const colorSet = useMemo(() => colorPalettes[colorScheme], [colorScheme]);
  
  // Example rows and column data (to be replaced with actual API response)
  useEffect(() => {
    if (!params.patientId) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call with timeout
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Example data structure - replace with actual API call
        const pivotData: PivotData = {
          rows: [
            'Depression', 'Anxiety', 'Insomnia', 'Headache', 'Fatigue',
            'Dizziness', 'Nausea', 'Muscle Pain', 'Joint Pain', 'Fever'
          ],
          columns: ['03/01/25', '03/15/25', '04/01/25', '04/23/25'],
          data: {
            'Depression': { '03/01/25': 3, '03/15/25': 2, '04/01/25': 1, '04/23/25': 0 },
            'Anxiety': { '03/01/25': 2, '03/15/25': 3, '04/01/25': 2, '04/23/25': 1 },
            'Insomnia': { '03/01/25': 1, '03/15/25': 2, '04/01/25': 3, '04/23/25': 2 },
            'Headache': { '03/01/25': 0, '03/15/25': 1, '04/01/25': 2, '04/23/25': 3 },
            'Fatigue': { '03/01/25': 2, '03/15/25': 2, '04/01/25': 1, '04/23/25': 1 },
            'Dizziness': { '03/01/25': 0, '03/15/25': 1, '04/01/25': 0, '04/23/25': 1 },
            'Nausea': { '03/01/25': 1, '03/15/25': 0, '04/01/25': 0, '04/23/25': 0 },
            'Muscle Pain': { '03/01/25': 3, '03/15/25': 2, '04/01/25': 1, '04/23/25': 0 },
            'Joint Pain': { '03/01/25': 1, '03/15/25': 2, '04/01/25': 3, '04/23/25': 2 },
            'Fever': { '03/01/25': 0, '03/15/25': 0, '04/01/25': 1, '04/23/25': 0 }
          },
          maxValue: 3
        };
        
        setData(pivotData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.patientId, dataType]);
  
  // Process data for Nivo scatter plot 
  // Group by row ID to create colored series
  const [scatterData, rowColors] = useMemo(() => {
    if (!data) return [[], {}];
    
    // 1. Prepare row colors mapping 
    const allRows = data.rows || [];
    const colors: Record<string, string> = {};
    
    // Assign colors from the palette to each row
    allRows.forEach((row, index) => {
      colors[row] = colorSet[index % colorSet.length];
    });
    
    // 2. Prepare scatter plot data - one series per row
    const seriesData: ScatterGroupData[] = allRows.map(row => {
      // Create data points for each row and column combination
      const points: ScatterDataPoint[] = [];
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || 0;
        if (value > 0) {  // Only add points with values > 0
          // Calculate frequency (how many sessions this symptom appears in)
          const frequency = data.columns.filter(col => (data.data[row]?.[col] || 0) > 0).length;
          
          points.push({
            x: column,
            y: row,
            size: value,
            frequency,
            color: colors[row]
          });
        }
      });
      
      return {
        id: row,
        data: points
      };
    });
    
    return [seriesData, colors];
  }, [data, colorSet]);
  
  // Calculate max value for sizing
  const maxValue = useMemo(() => {
    if (!data) return 3;
    return data.maxValue || 3;
  }, [data]);
  
  // Functions for export actions
  const downloadAsExcel = useCallback(() => {
    if (!data) return;
    
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
    XLSX.utils.book_append_sheet(wb, ws, 'Symptom Data');
    
    // Save file
    XLSX.writeFile(wb, `patient_data_${dataType}.xlsx`);
  }, [data, dataType]);
  
  const downloadAsPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#fff',
        logging: false
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `${dataType}_visualization.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    }
  }, [chartRef, dataType]);
  
  const downloadAsPDF = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 1.5,
        backgroundColor: '#fff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${dataType}_visualization.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  }, [chartRef, dataType]);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-medium">View:</div>
          <Select
            value={dataType}
            onValueChange={(value) => setDataType(value as any)}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Symptoms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="symptom">Symptoms</SelectItem>
              <SelectItem value="diagnosis">Diagnoses</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="hrsn">HRSN</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="ml-2 text-sm font-medium">Colors:</div>
          <Select
            value={colorScheme}
            onValueChange={(value) => setColorScheme(value as keyof typeof colorPalettes)}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Color Scheme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard</SelectItem>
              <SelectItem value="blues">Blues</SelectItem>
              <SelectItem value="rainbow">Rainbow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm"
            className="h-7"
            onClick={downloadAsExcel}
            disabled={!data || isLoading}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-7"
            onClick={downloadAsPDF}
            disabled={!data || isLoading}
          >
            <FilePdf className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-7"
            onClick={downloadAsPNG}
            disabled={!data || isLoading}
          >
            <FileImage className="h-3.5 w-3.5 mr-1" /> PNG
          </Button>
          
          <Dialog open={expanded} onOpenChange={setExpanded}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7"
                disabled={!data || isLoading}
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-2 mb-2 border-b">
                <div className="text-lg font-semibold">
                  {dataType === 'symptom' ? 'Symptoms' : 
                   dataType === 'diagnosis' ? 'Diagnoses' :
                   dataType === 'category' ? 'Diagnostic Categories' : 'HRSN Factors'} 
                  Over Time
                </div>
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAsExcel}
                    disabled={!data || isLoading}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAsPDF}
                    disabled={!data || isLoading}
                  >
                    <FilePdf className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAsPNG}
                    disabled={!data || isLoading}
                  >
                    <FileImage className="h-3.5 w-3.5 mr-1" /> PNG
                  </Button>
                </div>
              </div>
              
              <div className="flex-grow overflow-hidden">
                <div 
                  className="w-full h-full overflow-auto pb-4"
                >
                  <div
                    style={{ 
                      height: Math.max(500, 20 * (data?.rows.length || 0)) + 'px',
                      position: 'relative' 
                    }}
                    ref={chartRef}
                  >
                    {data && data.columns && data.columns.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0">
                        <div 
                          style={{
                            display: 'flex',
                            height: '35px',
                            position: 'relative'
                          }}
                        >
                          {/* Left margin spacer - value from chart's leftMargin estimate */}
                          <div 
                            style={{
                              width: '250px', // Adjusted margin to align with scatter plot points
                              flexShrink: 0
                            }}
                          ></div>
                          
                          {/* Container for date labels with precise spacing */}
                          <div 
                            style={{
                              display: 'flex',
                              flex: 1,
                              justifyContent: 'space-between',
                              position: 'relative',
                              paddingRight: '30px' // Reserve space for rightmost items
                            }}
                          >
                            {/* Fixed label positions with accurate spacing */}
                            {data.columns.map((date, i) => {
                              // For a more accurate alignment with the chart points, use:
                              // - For single column: center position (50%)
                              // - For multiple columns: distribute across full width
                              let position;
                              if (data.columns.length === 1) {
                                position = 50; // Center the single label
                              } else {
                                // Calculate even spacing with precise endpoints
                                // This approach ensures better alignment with the scatter plot dots
                                const usableWidth = 92; // Use 92% of width for expanded view
                                const offset = (100 - usableWidth) / 2; // Margin on each side
                                
                                // For expanded view, use evenly distributed positions
                                if (data.columns.length === 2) {
                                  // Special case for just 2 columns - position at 12% and 88%
                                  position = i === 0 ? 12 : 88;
                                } else if (i === 0) {
                                  position = offset; // First label at left edge of usable area
                                } else if (i === data.columns.length - 1) {
                                  position = 100 - offset; // Last label at right edge of usable area
                                } else {
                                  // For middle points, distribute evenly
                                  // We're dividing the space between first and last evenly
                                  const step = usableWidth / (data.columns.length - 1);
                                  position = offset + i * step;
                                }
                              }
                              
                              return (
                                <div 
                                  key={i}
                                  style={{
                                    position: 'absolute',
                                    left: `${position}%`,
                                    top: '2px',
                                    transform: 'translateX(-50%)', // Center the label on its position
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <div 
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      transform: 'rotate(-45deg)',
                                      transformOrigin: 'center top',
                                      color: '#333',
                                      maxWidth: '100%',
                                      padding: '1px 2px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                      borderRadius: '2px',
                                      border: '1px solid #eee'
                                    }}
                                  >
                                    {date}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
          <div className="relative flex flex-col">
            {/* Using a different approach with a container that has a fixed header */}
            <div 
              className="chart-container relative border border-gray-200 rounded-md overflow-hidden flex flex-col"
              style={{
                height: dataType === 'hrsn' ? '170px' : '300px',
              }}
            >
              {/* Scrollable chart area - takes up most of the space */}
              <div 
                className="chart-scroll-container flex-grow"
                style={{ 
                  height: 'calc(100% - 35px)',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  position: 'relative'
                }}
                ref={chartRef}
              >
                <div 
                  style={{
                    height: Math.max(22 * (data?.rows.length || 0), 
                      dataType === 'hrsn' ? 250 : (
                        dataType === 'category' ? 750 : (
                          dataType === 'diagnosis' ? 1800 : 2300
                        )
                      )
                    ) + 'px',
                    minHeight: '250px',
                    width: '100%',
                    position: 'relative'
                  }}
                >
                  <ScatterVisualization 
                    data={scatterData} 
                    rows={data?.rows || []}
                    maxValue={maxValue}
                    compact={compact}
                    colorSet={colorSet}
                    rowColors={rowColors}
                    hideDateLabels={true} // Hide Nivo's built-in date labels
                  />
                </div>
              </div>
              
              {/* Date labels container - fixed at the bottom */}
              {data && data.columns && data.columns.length > 0 && (
                <div 
                  className="date-footer flex-shrink-0"
                  style={{
                    height: '35px',
                    backgroundColor: 'white',
                    borderTop: '1px solid #e5e7eb',
                    boxShadow: '0 -1px 4px rgba(0, 0, 0, 0.1)',
                    zIndex: 10,
                    overflow: 'hidden'
                  }}
                >
                  {/* First, we'll render a fixed-width left margin to match the chart's left margin */}
                  <div 
                    style={{
                      display: 'flex',
                      height: '100%',
                      position: 'relative'
                    }}
                  >
                    {/* Left margin spacer - value from chart's leftMargin estimate */}
                    <div 
                      style={{
                        width: dataType === 'hrsn' ? '100px' : '140px',
                        flexShrink: 0
                      }}
                    ></div>
                    
                    {/* Container for date labels with precise spacing */}
                    <div 
                      style={{
                        display: 'flex',
                        flex: 1,
                        justifyContent: 'space-between',
                        position: 'relative',
                        paddingRight: '20px' // Reserve space for rightmost items
                      }}
                    >
                      {/* Fixed label positions with accurate spacing */}
                      {data.columns.map((date, i) => {
                        // For a more accurate alignment with the chart points, use:
                        // - For single column: center position (50%)
                        // - For multiple columns: distribute across full width
                        let position;
                        if (data.columns.length === 1) {
                          position = 50; // Center the single label
                        } else {
                          // Calculate even spacing with precise endpoints
                          // This approach ensures better alignment with the scatter plot dots
                          const usableWidth = 92; // Use 92% of width for regular view
                          const offset = (100 - usableWidth) / 2; // Margin on each side
                          
                          // For regular view, use evenly distributed positions
                          if (data.columns.length === 2) {
                            // Special case for just 2 columns - position at 12% and 88%
                            position = i === 0 ? 12 : 88;
                          } else if (i === 0) {
                            position = offset; // First label at left edge of usable area
                          } else if (i === data.columns.length - 1) {
                            position = 100 - offset; // Last label at right edge of usable area
                          } else {
                            // For middle points, distribute evenly
                            // We're dividing the space between first and last evenly
                            const step = usableWidth / (data.columns.length - 1);
                            position = offset + i * step;
                          }
                        }
                        
                        return (
                          <div 
                            key={i}
                            style={{
                              position: 'absolute',
                              left: `${position}%`,
                              top: '2px',
                              transform: 'translateX(-50%)', // Center the label on its position
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <div 
                              style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                transform: 'rotate(-45deg)',
                                transformOrigin: 'center top',
                                color: '#333',
                                maxWidth: '100%',
                                padding: '1px 2px',
                                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                borderRadius: '2px',
                                border: '1px solid #eee'
                              }}
                            >
                              {date}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              

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
  const [tooltipData, setTooltipData] = useState<{
    x: string;
    y: string;
    size: number;     // Size represents the occurrence count in this specific session
    frequency: number; // Keep frequency as additional info (unique to this component)
    visible: boolean;
    color: string;
  } | null>(null);
  
  // Use refs to track the debounce timers
  const tooltipTimerRef = useRef<number | null>(null);
  const tooltipCleanupRef = useRef<number | null>(null);
  
  // Clean up timers on component unmount
  useEffect(() => {
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
    
  const titleRotation: number = -45;
  
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
  
  // Extract unique x-axis values (dates) from the scatter data for the sticky dates bar
  const dateLabels = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Extract unique x values from all series data points
    const allDates = new Set<string>();
    data.forEach(series => {
      series.data.forEach(point => {
        if (point.x) allDates.add(String(point.x));
      });
    });
    return Array.from(allDates).sort();
  }, [data]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Chart wrapper with relative positioning for sticky footer */}
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
          // Hide normal date labels if hideDateLabels is true
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
          
          // Determine row color from rowColors map
          const rowId = node.data.serieId || '';
          const color = rowColors[rowId] || '#333';
          
          // Set tooltipData when mouse moves over a node
          setTooltipData({
            x: node.data.x,
            y: node.data.y,
            size: node.data.size,
            frequency: node.data.frequency || 1,
            visible: true,
            color: color
          });
        }}
        onMouseLeave={(node, event) => {
          // Add a small delay before hiding tooltip to prevent flicker
          tooltipCleanupRef.current = window.setTimeout(() => {
            setTooltipData(prev => prev ? { ...prev, visible: false } : null);
            tooltipCleanupRef.current = null;
          }, 300);
        }}
      />
    </div>
  );
};