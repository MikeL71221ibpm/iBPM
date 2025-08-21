import React, { useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File, RotateCw, TableProperties, Grid3X3, Layout } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// Import ResponsiveHeatMap but we'll only use it conditionally if working
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { cn } from '@/lib/utils';

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
  category: 'diagnostic-category',
  hrsn: 'hrsn'
};

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
  const chartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Find the display name for the current data type
  const dataTypeInfo = DATA_TYPES.find(type => type.id === dataType);
  const displayName = dataTypeInfo?.name || dataType;
  
  // Get the active color set based on the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.iridis;
  
  // Fetch data from API
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: 3,
    retryDelay: 1000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  // Transform data for heatmap visualization
  const heatmapData = React.useMemo(() => {
    if (!data || !data.rows || !data.columns || !data.data) {
      return [];
    }

    // Convert data structure to Nivo's required format
    const nivoData = data.rows.map(row => {
      const rowData: any = { id: row };
      
      data.columns.forEach(column => {
        rowData[column] = data.data[row]?.[column] || 0;
      });
      
      return rowData;
    });

    console.log("Nivo Heatmap Data:", nivoData);
    return nivoData;
  }, [data]);

  // Export functions
  const downloadAsExcel = useCallback(() => {
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
  
  const downloadAsPNG = useCallback(async () => {
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
        scale: 2, // Higher resolution for better quality
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        onclone: (clonedDoc, clonedElement) => {
          // Expand any containers in the cloned element that would restrict its height
          const expandElements = (element: HTMLElement) => {
            if (element.style) {
              element.style.height = 'auto';
              element.style.maxHeight = 'none';
              element.style.overflow = 'visible';
            }
            
            // Process children recursively
            Array.from(element.children).forEach(child => {
              expandElements(child as HTMLElement);
            });
          };
          
          expandElements(clonedElement as HTMLElement);
        }
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
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `patient_${patientId}_${dataType}_visualization.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [chartRef, dataType, patientId, dialogOpen, displayName]);
  
  const downloadAsPDF = useCallback(async () => {
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
        scale: 2, // Higher resolution for better quality
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        onclone: (clonedDoc, clonedElement) => {
          // Expand any containers in the cloned element that would restrict its height
          const expandElements = (element: HTMLElement) => {
            if (element.style) {
              element.style.height = 'auto';
              element.style.maxHeight = 'none';
              element.style.overflow = 'visible';
            }
            
            // Process children recursively
            Array.from(element.children).forEach(child => {
              expandElements(child as HTMLElement);
            });
          };
          
          expandElements(clonedElement as HTMLElement);
        }
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
  }, [chartRef, dataType, patientId, dialogOpen, displayName]);

  // Find the maximum value for the current data
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

  // Configure color scheme
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

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-0 pt-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">{displayName}</CardTitle>
          </div>
          <CardDescription className="mt-0.5 text-xs">Loading visualization data...</CardDescription>
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
        <CardHeader className="pb-0 pt-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">{displayName}</CardTitle>
          </div>
          <CardDescription className="mt-0.5 text-xs">Error loading visualization</CardDescription>
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
        <CardHeader className="pb-0 pt-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">{displayName}</CardTitle>
          </div>
          <CardDescription className="mt-0.5 text-xs">No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No data available for this visualization
        </CardContent>
      </Card>
    );
  }

  const height = compact ? 400 : 700;

  return (
    <>
      <Card className="w-full h-full">
        <CardHeader className="pb-0 pt-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">{displayName}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-8 px-2 text-xs"
            >
              Expand
            </Button>
          </div>
          <CardDescription className="mt-0.5 text-xs">
            {dataTypeInfo?.description || `${displayName} visualization for patient ${patientId}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div style={{ height: `${height}px`, overflow: 'auto' }} ref={chartRef}>
            {/* Render a direct DOM-based heatmap instead of using Nivo HeatMap */}
            <div className="p-2">
              {/* Legend at the top */}
              <div className="flex justify-center items-center mb-2">
                <div className="flex items-center">
                  <div className="text-xs mr-2 font-semibold">Value:</div>
                  <div className="flex space-x-2">
                    {Object.entries(colorSet).reverse().map(([key, color], i) => (
                      <div key={key} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: color }}
                        ></div>
                        <div className="text-xs font-medium">
                          {i === 0 ? 'Highest' : 
                           i === 1 ? 'High' : 
                           i === 2 ? 'Medium' : 
                           i === 3 ? 'Low' : 'Lowest'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* The actual heatmap table */}
              <div className="overflow-auto">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-10 bg-background min-w-[180px]"></th>
                      {data?.columns.map((col) => (
                        <th key={col} className="p-1 text-xs font-semibold text-gray-700 rotate-[-45deg] origin-bottom-left" style={{ minWidth: 40, height: 100 }}>
                          <div className="inline-block">
                            {col}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows.map((row) => (
                      <tr key={row}>
                        <th className="sticky left-0 bg-background border-b border-r p-2 text-left text-xs font-semibold text-gray-700 min-w-[220px]">
                          {row} {(() => {
                            // Calculate total occurrences for this row
                            const total = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
                            return total > 0 ? `(${total})` : '';
                          })()}
                        </th>
                        {data.columns.map((col) => {
                          const value = data.data[row]?.[col] || 0;
                          const normalizedValue = maxValue ? value / maxValue : 0;
                          const percentValue = Math.round(normalizedValue * 100);
                          
                          // Helper function for color intensity
                          const getExactColor = (normalizedValue: number): string => {
                            if (normalizedValue >= 0.80) return colorSet.HIGHEST;
                            if (normalizedValue >= 0.60) return colorSet.HIGH;
                            if (normalizedValue >= 0.40) return colorSet.MEDIUM;
                            if (normalizedValue >= 0.20) return colorSet.LOW;
                            return colorSet.LOWEST;
                          };
                          
                          // Only apply background color for cells with values > 0
                          const bgColor = value > 0 ? getExactColor(normalizedValue) : '#FFFFFF';
                          const textColor = normalizedValue > 0.7 ? '#ffffff' : '#000000';
                          
                          return (
                            <td 
                              key={`${row}-${col}`} 
                              style={{ 
                                backgroundColor: bgColor,
                                color: textColor,
                                width: 38,
                                height: 28,
                                border: '1px solid #f0f0f0'
                              }}
                              className="text-center text-xs font-medium"
                              title={`${row} on ${col}: ${value} (${percentValue}%)`}
                            >
                              {value > 0 ? value : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="pb-0 pt-4">
            <DialogTitle className="text-base font-bold">{dialogTitle}</DialogTitle>
            <DialogDescription>
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs">
                  Patient ID: P{patientId.padStart(4, '0')}
                </div>
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
                    className="h-8"
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
                    className="h-8"
                  >
                    <File className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            <div style={{ height: '700px', overflow: 'auto' }}>
              {/* Render a direct DOM-based heatmap instead of using Nivo HeatMap */}
              <div className="p-4">
                {/* Legend at the top */}
                <div className="flex justify-center items-center mb-2">
                  <div className="flex items-center">
                    <div className="text-xs mr-2 font-semibold">Value:</div>
                    <div className="flex space-x-2">
                      {Object.entries(colorSet).reverse().map(([key, color], i) => (
                        <div key={key} className="flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: color }}
                          ></div>
                          <div className="text-xs font-medium">
                            {i === 0 ? 'Highest' : 
                            i === 1 ? 'High' : 
                            i === 2 ? 'Medium' : 
                            i === 3 ? 'Low' : 'Lowest'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* The actual heatmap table */}
                <div className="overflow-auto">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-10 bg-background min-w-[220px]"></th>
                        {data?.columns.map((col) => (
                          <th key={col} className="p-1 text-xs font-semibold text-gray-700 rotate-[-45deg] origin-bottom-left" style={{ minWidth: 40, height: 100 }}>
                            <div className="inline-block">
                              {col}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.rows.map((row) => (
                        <tr key={row}>
                          <th className="sticky left-0 bg-background border-b border-r p-2 text-left text-xs font-semibold text-gray-700 min-w-[220px]">
                            {row} {(() => {
                              // Calculate total occurrences for this row
                              const total = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
                              return total > 0 ? `(${total})` : '';
                            })()}
                          </th>
                          {data.columns.map((col) => {
                            const value = data.data[row]?.[col] || 0;
                            const normalizedValue = maxValue ? value / maxValue : 0;
                            const percentValue = Math.round(normalizedValue * 100);
                            
                            // Helper function for color intensity
                            const getExactColor = (normalizedValue: number): string => {
                              if (normalizedValue >= 0.80) return colorSet.HIGHEST;
                              if (normalizedValue >= 0.60) return colorSet.HIGH;
                              if (normalizedValue >= 0.40) return colorSet.MEDIUM;
                              if (normalizedValue >= 0.20) return colorSet.LOW;
                              return colorSet.LOWEST;
                            };
                            
                            // Only apply background color for cells with values > 0
                            const bgColor = value > 0 ? getExactColor(normalizedValue) : '#FFFFFF';
                            const textColor = normalizedValue > 0.7 ? '#ffffff' : '#000000';
                            
                            return (
                              <td 
                                key={`${row}-${col}`} 
                                style={{ 
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  width: 38,
                                  height: 28,
                                  border: '1px solid #f0f0f0'
                                }}
                                className="text-center text-xs font-medium"
                                title={`${row} on ${col}: ${value} (${percentValue}%)`}
                              >
                                {value > 0 ? value : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
    <div className="container mx-auto py-4 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header section with patient info and color theme to the right */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Heatmap Analysis
            </h1>
            <h2 className="text-xl font-semibold mb-1">
              Patient: {getPatientName(parseInt(patientToDisplay))} <span className="text-muted-foreground">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick overview of all patient data through heatmap visualizations.
            </p>
          </div>
          
          {/* Color theme selector to the right of patient info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium whitespace-nowrap">Color Theme:</span>
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
        </div>
        
        {/* Export buttons moved to the left with reduced spacing */}
        <div className="flex justify-start items-center mb-2">
          <div className="flex gap-1 flex-nowrap overflow-x-auto">
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-7 text-xs px-1.5"
              onClick={exportGridAsPDF}
              disabled={isExporting}
            >
              <File className="h-3 w-3 mr-0.5" />
              Export PDF
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-7 text-xs px-1.5"
              onClick={exportGridAsPNG}
              disabled={isExporting}
            >
              <FileImage className="h-3 w-3 mr-0.5" />
              Export PNG
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-7 text-xs px-1.5"
              onClick={() => window.location.href = `/pivot-tables/${patientToDisplay}`}
            >
              <TableProperties className="h-3 w-3 mr-0.5" />
              View Pivot Tables
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-7 text-xs px-1.5"
              onClick={() => window.location.href = `/enhanced-heatmap-v2/${patientToDisplay}`}
            >
              <Grid3X3 className="h-3 w-3 mr-0.5" />
              View Bubble Charts
            </Button>
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-7 text-xs px-1.5"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="h-3 w-3 mr-0.5" />
              Refresh Data
            </Button>
            
            {isExporting && <Loader2 className="h-3 w-3 animate-spin text-gray-500 ml-1" />}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6" ref={gridRef}>
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