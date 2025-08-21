import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File, RotateCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { calculateBubbleSize } from '@/lib/bubble-size-utils';

// Last updated: May 9, 2025 - 5:50 AM
// Controls route: /nivo-scatter-view-themed/:patientId?

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
  size: number; // Total value (intensity)
  frequency: number; // How many sessions this item appears in
  color?: string; // Optional: Row color - matches Y-axis label bullet color
  intensityCategory?: string; // Optional: Category for coloring ("highest", "high", etc.)
  intensityIndex?: number; // Optional: Index for colorBy scheme (0=highest, etc.)
  rowId?: string; // Optional: Internal use for processing - not used in final data
}

// Interface for scatter group
interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

// Interface for API response data
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Color themes
const COLOR_THEMES = [
  { id: 'blues', name: 'Blues', colors: ['#0d47a1', '#1976d2', '#42a5f5', '#90caf9', '#e3f2fd'] },
  { id: 'greens', name: 'Greens', colors: ['#1b5e20', '#388e3c', '#66bb6a', '#a5d6a7', '#e8f5e9'] },
  { id: 'purples', name: 'Purples', colors: ['#4a148c', '#7b1fa2', '#ab47bc', '#ce93d8', '#f3e5f5'] },
  { id: 'oranges', name: 'Oranges', colors: ['#e65100', '#ef6c00', '#fb8c00', '#ffb74d', '#ffe0b2'] },
  { id: 'greys', name: 'Grays', colors: ['#212121', '#616161', '#9e9e9e', '#e0e0e0', '#f5f5f5'] },
  { id: 'spectral', name: 'Spectral', colors: ['#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598'] }
];

// Format dates for consistent display
const formatDateForDisplay = (dateStr: string) => {
  try {
    // Handle MM/DD/YY format (already formatted)
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
      return dateStr; // Already in our target format
    } 
    // Handle MM/DD/YYYY format
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/').map(Number);
      // Return in MM/DD/YY format
      return `${month}/${day}/${year.toString().substr(2)}`;
    } 
    // Handle ISO date format (YYYY-MM-DD) with timezone handling
    else {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear() % 100; // Just the last two digits
      return `${month}/${day}/${year}`;
    }
  } catch (error) {
    console.error(`Error formatting date: ${dateStr}`, error);
    return dateStr; // Return original if parsing fails
  }
};

// Helper to sort dates chronologically
const sortDatesChronologically = (dateStrings: string[]): string[] => {
  return [...dateStrings].sort((a, b) => {
    // First, try parsing as MM/DD/YY
    const parseDate = (dateStr: string) => {
      const [month, day, year] = dateStr.split('/').map(Number);
      const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
      return new Date(fullYear, month - 1, day);
    };
    
    try {
      return parseDate(a).getTime() - parseDate(b).getTime();
    } catch (error) {
      console.error('Error sorting dates:', error);
      return 0; // Keep original order if parsing fails
    }
  });
};

// Main scatter plot visualization component
export default function NivoScatterViewThemed() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [, navigate] = useLocation();
  const [dataType, setDataType] = useState<string>('symptom');
  const [colorTheme, setColorTheme] = useState<string>('blues');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExpandedViewOpen, setIsExpandedViewOpen] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'png'>('excel');
  const chartRef = useRef<HTMLDivElement>(null);
  const [scatterData, setScatterData] = useState<ScatterGroupData[]>([{ id: 'default', data: [] }]);
  
  // If no patientId, use "1" as default
  const effectivePatientId = patientId || "1";
  
  // Fetch the pivot data
  const { data, isLoading, error, refetch } = useQuery<PivotData>({
    queryKey: ['/api/pivot', API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS], effectivePatientId],
    staleTime: 1000 * 60 * 5, // 5 min
  });
  
  // Process the data for the scatter plot
  useEffect(() => {
    if (!data) return;
    
    const processedData: ScatterGroupData[] = [{ id: 'primary', data: [] }];
    
    // Sort dates chronologically for the x-axis
    const sortedColumns = sortDatesChronologically(data.columns);
    
    // Calculate frequency (number of dates with entries) for each row
    const rowFrequencies: Record<string, number> = {};
    const rowTotals: Record<string, number> = {};
    
    data.rows.forEach(row => {
      const rowData = data.data[row] || {};
      
      // Count columns with entries > 0
      const frequency = data.columns.filter(col => 
        (rowData[col] || 0) > 0
      ).length;
      
      rowFrequencies[row] = frequency;
      
      // Calculate total occurrences for sorting
      const total = data.columns.reduce((sum, col) => sum + (rowData[col] || 0), 0);
      rowTotals[row] = total;
    });
    
    // Sort rows by frequency and total (descending), then alphabetically
    const sortedRows = [...data.rows].sort((a, b) => {
      // Sort by total occurrences (descending)
      if (rowTotals[b] !== rowTotals[a]) return rowTotals[b] - rowTotals[a];
      
      // For equal totals, sort by frequency (descending)
      if (rowFrequencies[b] !== rowFrequencies[a]) return rowFrequencies[b] - rowFrequencies[a];
      
      // For equal frequency, sort alphabetically
      return a.localeCompare(b);
    });
    
    // Group rows into intensity categories (by total value)
    const rowCategories: string[] = [];
    let rowCounter = 0;
    
    // Create data points for each combination
    sortedRows.forEach((row, rowIndex) => {
      const rowData = data.data[row] || {};
      const rowFrequency = rowFrequencies[row];
      
      // Add row title with total count in parentheses
      const totalCount = rowTotals[row];
      const rowTitle = `${row} (${totalCount})`;
      
      sortedColumns.forEach((column, colIndex) => {
        const value = rowData[column] || 0;
        
        // Skip zeros
        if (value === 0) return;
        
        console.log("Calculating node size for data:", {
          x: formatDateForDisplay(column),
          y: rowTitle,
          size: value,
          frequency: rowFrequency,
          color: ''
        });
        
        // Add data point
        processedData[0].data.push({
          x: formatDateForDisplay(column),
          y: rowTitle,
          size: value,
          frequency: rowFrequency,
          // Color will be handled by the color theme
        });
      });
    });
    
    setScatterData(processedData);
  }, [data, dataType]);
  
  // Generate title based on data type and patient ID
  const generateTitle = () => {
    const dataTypeLabel = DATA_TYPES.find(type => type.id === dataType)?.name || 'Data';
    return `Patient: ${effectivePatientId} - ${dataTypeLabel} Bubble Chart`;
  };
  
  // Export the scatter data as Excel spreadsheet
  const exportToExcel = useCallback(() => {
    if (!data) return;
    
    // Prepare data for Excel export
    const sortedColumns = sortDatesChronologically(data.columns);
    const formattedColumns = sortedColumns.map(formatDateForDisplay);
    
    // Map of rows with their totals for sorting
    const rowTotals = data.rows.reduce<Record<string, number>>((acc, row) => {
      const rowData = data.data[row] || {};
      const total = sortedColumns.reduce((sum, col) => sum + (rowData[col] || 0), 0);
      acc[row] = total;
      return acc;
    }, {});
    
    // Sort rows by total (descending)
    const sortedRows = [...data.rows].sort((a, b) => rowTotals[b] - rowTotals[a]);
    
    // Prepare the table data
    const tableData = sortedRows.map(row => {
      const rowData = data.data[row] || {};
      const result: Record<string, any> = {
        Item: `${row} (${rowTotals[row]})` // Row with total count
      };
      
      formattedColumns.forEach(col => {
        result[col] = rowData[sortedColumns[formattedColumns.indexOf(col)]] || '';
      });
      
      return result;
    });
    
    // Convert table data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${dataType} Data`);
    
    // Generate filename and export
    const filename = `patient_${effectivePatientId}_${dataType}_bubble_chart.xlsx`;
    XLSX.writeFile(workbook, filename);
    
  }, [data, effectivePatientId, dataType]);
  
  // Export the scatter plot as PNG
  const exportToPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setExportInProgress(true);
      
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      // Convert to PNG and download
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `patient_${effectivePatientId}_${dataType}_bubble_chart.png`;
      link.href = image;
      link.click();
      
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [effectivePatientId, dataType, chartRef]);
  
  // Export the scatter plot as PDF
  const exportToPDF = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setExportInProgress(true);
      
      // Create new PDF document (landscape for better fit)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(generateTitle(), 40, 40);
      
      // Get dimensions for better fit in PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 50; // Margins
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      // Capture as canvas for quality
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      // Scale the image to fit the content area while maintaining aspect ratio
      const imgData = canvas.toDataURL("image/png", 1.0);
      
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      
      // Check if image height exceeds available content height
      if (imgHeight > contentHeight) {
        // Adjust to fit height instead
        const scaleFactor = contentHeight / imgHeight;
        pdf.addImage(
          imgData,
          'PNG',
          margin + (contentWidth - (imgWidth * scaleFactor)) / 2, 
          margin + 30,
          imgWidth * scaleFactor,
          imgHeight * scaleFactor
        );
      } else {
        // Center the image horizontally
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin + 30 + (contentHeight - imgHeight) / 2,
          imgWidth,
          imgHeight
        );
      }
      
      // Save the PDF
      pdf.save(`patient_${effectivePatientId}_${dataType}_bubble_chart.pdf`);
      
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [effectivePatientId, dataType, generateTitle, chartRef]);
  
  // Handle the export based on selected format
  const handleExport = useCallback(() => {
    switch (exportFormat) {
      case 'excel':
        exportToExcel();
        break;
      case 'png':
        exportToPNG();
        break;
      case 'pdf':
        exportToPDF();
        break;
    }
    setIsExportModalOpen(false);
  }, [exportFormat, exportToExcel, exportToPNG, exportToPDF]);
  
  // Get color theme to use for the chart
  const getCurrentColorTheme = () => {
    return COLOR_THEMES.find(theme => theme.id === colorTheme) || COLOR_THEMES[0];
  };
  
  // Calculate point color based on intensity
  const getNodeColor = ({ node }: { node: any }) => {
    const theme = getCurrentColorTheme();
    const value = node.data.size;
    
    // Use theme colors based on node size (larger = deeper color)
    // This implementation ensures each circle gets an appropriate color
    // from the theme based on its value
    if (value >= 5) return theme.colors[0]; // Highest intensity
    if (value >= 4) return theme.colors[1];
    if (value >= 3) return theme.colors[2];
    if (value >= 2) return theme.colors[3];
    return theme.colors[4]; // Lowest intensity
  };
  
  // Get unique x values (dates) for sorting
  const getXValues = () => {
    if (!data) return [];
    return sortDatesChronologically(data.columns).map(formatDateForDisplay);
  };
  
  // Get unique y values (rows) for sorting
  const getYValues = () => {
    if (!data || !scatterData[0]?.data?.length) return [];
    
    // Extract unique Y values from scatterData in the order they appear
    const yValues: string[] = [];
    const seen = new Set<string>();
    
    scatterData[0].data.forEach(point => {
      if (!seen.has(point.y)) {
        seen.add(point.y);
        yValues.push(point.y);
      }
    });
    
    return yValues;
  };
  
  const hasData = scatterData[0]?.data?.length > 0;
  
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{generateTitle()}</h1>
            <p className="text-slate-500 mt-1">
              Interactive bubble chart visualization of patient health data
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={colorTheme} onValueChange={setColorTheme}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Color Theme" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_THEMES.map(theme => (
                  <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => setIsExpandedViewOpen(true)}
              className="gap-1"
            >
              Expanded View
            </Button>
            
            <Button
              variant="outline" 
              onClick={() => setIsExportModalOpen(true)}
              className="gap-1 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
            >
              Export
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => refetch()}
              className="gap-1"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Main chart */}
        <div 
          ref={chartRef} 
          className="bg-white rounded-lg shadow-sm overflow-hidden"
          style={{ height: '650px' }}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500">Error loading data.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                <RotateCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : !hasData ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No data available for this patient.</p>
            </div>
          ) : (
            <ResponsiveScatterPlot
              data={scatterData}
              margin={{ top: 60, right: 140, bottom: 90, left: 220 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'point' }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legendPosition: 'middle',
                legendOffset: 60,
                legend: 'Date'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legendPosition: 'middle',
                legendOffset: -50,
                legend: DATA_TYPES.find(type => type.id === dataType)?.name || ''
              }}
              xFormat={value => value.toString()}
              yFormat={value => value.toString()}
              nodeSize={{ key: 'size', values: [5, 20], sizes: [24, 48] }} // Apply scaling to node sizes
              colors={getNodeColor}
              colorBy="id"
              animate={true}
              motionConfig="gentle"
              tooltip={({ node }) => (
                <div className="bg-white shadow-lg rounded p-2 border border-gray-200 text-sm">
                  <div><strong>{node.data.y}</strong></div>
                  <div>Date: {node.data.x}</div>
                  <div>Count: {node.data.size}</div>
                  <div>Frequency: {node.data.frequency} sessions</div>
                </div>
              )}
              theme={{
                axis: {
                  ticks: {
                    text: {
                      fontSize: 12,
                    },
                  },
                  legend: {
                    text: {
                      fontSize: 14,
                      fontWeight: 'bold',
                    },
                  },
                },
                grid: {
                  line: {
                    stroke: '#eee',
                    strokeWidth: 1,
                  },
                },
              }}
              legends={[
                {
                  anchor: 'right',
                  direction: 'column',
                  justify: false,
                  translateX: 130,
                  translateY: 0,
                  itemWidth: 100,
                  itemHeight: 12,
                  itemsSpacing: 5,
                  itemDirection: 'left-to-right',
                  symbolSize: 12,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
            />
          )}
          
          {exportInProgress && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
              <div className="bg-white p-3 rounded-full shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
        
        {/* Expanded view dialog */}
        <Dialog open={isExpandedViewOpen} onOpenChange={setIsExpandedViewOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{generateTitle()}</DialogTitle>
              <DialogDescription>
                Expanded view for detailed analysis
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 h-full overflow-hidden pt-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-red-500">Error loading data.</p>
                </div>
              ) : !hasData ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">No data available for this patient.</p>
                </div>
              ) : (
                <div className="h-[calc(100%-60px)]">
                  <ResponsiveScatterPlot
                    data={scatterData}
                    margin={{ top: 60, right: 140, bottom: 100, left: 220 }}
                    xScale={{ type: 'point' }}
                    yScale={{ type: 'point' }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                      legendPosition: 'middle',
                      legendOffset: 80,
                      legend: 'Date'
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 10,
                      tickRotation: 0,
                      legendPosition: 'middle',
                      legendOffset: -60,
                      legend: DATA_TYPES.find(type => type.id === dataType)?.name || '',
                      truncateTickAt: 100
                    }}
                    xFormat={value => value.toString()}
                    yFormat={value => value.toString()}
                    nodeSize={{ key: 'size', values: [5, 20], sizes: [28, 56] }} // Larger bubbles in expanded view
                    colors={getNodeColor}
                    colorBy="id"
                    animate={true}
                    motionConfig="gentle"
                    tooltip={({ node }) => (
                      <div className="bg-white shadow-lg rounded p-3 border border-gray-200">
                        <div className="font-semibold text-base">{node.data.y}</div>
                        <div className="mt-1">Date: {node.data.x}</div>
                        <div>Count: {node.data.size}</div>
                        <div>Frequency: {node.data.frequency} sessions</div>
                      </div>
                    )}
                    theme={{
                      axis: {
                        ticks: {
                          text: {
                            fontSize: 12,
                          },
                        },
                        legend: {
                          text: {
                            fontSize: 14,
                            fontWeight: 'bold',
                          },
                        },
                      },
                      grid: {
                        line: {
                          stroke: '#eee',
                          strokeWidth: 1,
                        },
                      },
                    }}
                    legends={[
                      {
                        anchor: 'right',
                        direction: 'column',
                        justify: false,
                        translateX: 130,
                        translateY: 0,
                        itemWidth: 100,
                        itemHeight: 12,
                        itemsSpacing: 5,
                        itemDirection: 'left-to-right',
                        symbolSize: 12,
                        symbolShape: 'circle',
                        effects: [
                          {
                            on: 'hover',
                            style: {
                              itemOpacity: 1
                            }
                          }
                        ]
                      }
                    ]}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsExportModalOpen(true)}
                className="gap-1 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
              >
                <FileImage className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setIsExpandedViewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Export options dialog */}
        <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Options</DialogTitle>
              <DialogDescription>
                Choose a format to export the current visualization.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="excel-format" 
                    name="export-format" 
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    checked={exportFormat === 'excel'}
                    onChange={() => setExportFormat('excel')}
                  />
                  <label htmlFor="excel-format" className="flex items-center">
                    <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                    <span>Excel (.xlsx)</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="pdf-format" 
                    name="export-format" 
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    checked={exportFormat === 'pdf'}
                    onChange={() => setExportFormat('pdf')}
                  />
                  <label htmlFor="pdf-format" className="flex items-center">
                    <File className="h-5 w-5 mr-2 text-blue-600" />
                    <span>PDF Document (.pdf)</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="png-format" 
                    name="export-format" 
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    checked={exportFormat === 'png'}
                    onChange={() => setExportFormat('png')}
                  />
                  <label htmlFor="png-format" className="flex items-center">
                    <FileImage className="h-5 w-5 mr-2 text-blue-600" />
                    <span>Image (.png)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Export
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}