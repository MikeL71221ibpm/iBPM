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

// Helper function for color intensity
const getExactIridisColor = (normalizedValue: number, colorSet: any): string => {
  // Ensure we have valid inputs
  if (isNaN(normalizedValue) || normalizedValue === undefined || normalizedValue === null) {
    return colorSet?.LOWEST || '#F8F8FF'; // Default fallback color
  }
  
  // Ensure colorSet is valid
  if (!colorSet || typeof colorSet !== 'object') {
    // Fallback to a default color if colorSet is invalid
    return '#F8F8FF';
  }
  
  // Ensure extreme values are capped
  const capped = Math.max(0, Math.min(1, normalizedValue));
  
  // Apply logarithmic scaling for better distribution
  // This helps when there's a big gap between the max and other values
  const logScaled = Math.log(1 + capped * 9) / Math.log(10);
  
  // Using an even more dramatic threshold value scale for clearer visual differentiation
  if (logScaled >= 0.80 || capped >= 0.80) return colorSet.HIGHEST || '#6A0DAD';
  if (logScaled >= 0.60 || capped >= 0.60) return colorSet.HIGH || '#9370DB';
  if (logScaled >= 0.40 || capped >= 0.40) return colorSet.MEDIUM || '#B19CD9';
  if (logScaled >= 0.20 || capped >= 0.20) return colorSet.LOW || '#CCCCFF';
  return colorSet.LOWEST || '#F8F8FF';
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
      const targetElement = chartRef.current;
      
      // Capture the chart using html2canvas
      const canvas = await html2canvas(targetElement, {
        scale: 2, 
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
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
  }, [chartRef, dataType, patientId]);
  
  const downloadAsPDF = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Get inner visualization div which contains the actual chart
      const targetElement = chartRef.current;
      
      // Capture the chart using html2canvas
      const canvas = await html2canvas(targetElement, {
        scale: 2, 
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
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
  }, [chartRef, dataType, patientId]);

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

  // Generate a direct DOM-based heatmap
  const renderHeatmap = () => {
    if (!data || !data.rows || !data.columns) return null;
    
    const cellWidth = 40;
    const cellHeight = 30;
    const headerHeight = 120;
    const headerWidth = 180;
    
    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-10 bg-background min-w-[180px]" style={{ width: headerWidth }}></th>
              {data.columns.map((col) => (
                <th key={col} className="p-1 text-xs font-medium text-gray-500 rotate-[-45deg] origin-bottom-left" style={{ minWidth: cellWidth, height: headerHeight }}>
                  <div className="inline-block">
                    {col}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row}>
                <th className="sticky left-0 bg-background border-b border-r p-2 text-left text-xs font-medium text-gray-500" style={{ minWidth: headerWidth }}>
                  {row}
                </th>
                {data.columns.map((col) => {
                  const value = data.data[row]?.[col] || 0;
                  const normalizedValue = maxValue ? value / maxValue : 0;
                  const bgColor = getExactIridisColor(normalizedValue, colorSet);
                  const textColor = normalizedValue > 0.7 ? '#ffffff' : '#000000';
                  
                  return (
                    <td 
                      key={`${row}-${col}`} 
                      style={{ 
                        backgroundColor: bgColor,
                        color: textColor,
                        width: cellWidth,
                        height: cellHeight,
                        border: '1px solid white'
                      }}
                      className="text-center text-xs font-medium"
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
    );
  };

  const dialogTitle = `Patient ${patientId} ${displayName} - Heatmap Visualization`;

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

  return (
    <>
      <Card className="w-full h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">{displayName}</CardTitle>
            <CardDescription>
              {dataTypeInfo?.description || `${displayName} visualization for patient ${patientId}`}
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
        <CardContent className="pb-2 overflow-hidden" style={{ height: compact ? '400px' : '700px' }}>
          <div ref={chartRef} className="h-full overflow-auto">
            {renderHeatmap()}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              <div className="flex justify-between items-center mt-2">
                <div>
                  Patient ID: P{patientId.padStart(4, '0')}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAsExcel}
                    disabled={isDownloading}
                    title="Download Excel"
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
                  >
                    <File className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            <div className="h-full overflow-auto">
              {renderHeatmap()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function SimpleEnhancedHeatmap() {
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
    <div className="container mx-auto py-6 px-4">
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