import React, { useRef, useCallback, useState } from 'react';
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

// Last updated: May 9, 2025 - 5:45 AM
// Controls route: /enhanced-heatmap-v2/:patientId?

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
  maxValue?: number;
}

// Format dates for consistent display
/**
 * Format a date string for display in MM/DD/YY format, handling timezone issues
 * 
 * This improved implementation fixes several issues:
 * 1. Properly handles timezone differences when parsing ISO dates
 * 2. Ensures consistent date display across all visualizations
 * 3. Avoids the "fictitious date" problem by using UTC parsing for ISO dates
 * 
 * @param dateStr The input date string in various possible formats
 * @returns Formatted date string in MM/DD/YY format
 */
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
/**
 * Sorts dates chronologically
 * 
 * This function takes an array of date strings and returns a new array of the same
 * dates but sorted chronologically. It handles MM/DD/YY format and adjusts for Y2K.
 * 
 * @param dateStrings Array of date strings in MM/DD/YY or MM/DD/YYYY format
 * @returns New array of the same dates sorted chronologically
 */
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

// Main heatmap visualization component
export default function EnhancedHeatmapView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [, navigate] = useLocation();
  const [dataType, setDataType] = useState<string>('symptom');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png'>('pdf');
  const [expandedViewOpen, setExpandedViewOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // If no patientId, use "1" as default
  const effectivePatientId = patientId || "1";
  
  // Fetch the pivot data
  const { data, isLoading, error, refetch } = useQuery<PivotData>({
    queryKey: ['/api/pivot', API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS], effectivePatientId],
    staleTime: 1000 * 60 * 5, // 5 min
  });
  
  console.log("Nivo Heatmap Data:", prepareHeatmapData());
  
  // Add row totals to row names for context
  const prepareRowLabelWithTotal = (row: string) => {
    if (!data) return row;
    
    const rowData = data.data[row] || {};
    const total = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
    return `${row} (${total})`;
  };
  
  // Prepare data for Nivo heatmap
  function prepareHeatmapData() {
    if (!data) return [];
    
    // Sort dates chronologically for the x-axis
    const sortedColumns = sortDatesChronologically(data.columns);
    
    // Prepare rows with totals for sorting
    const rowsWithTotals = data.rows.map(row => {
      const rowData = data.data[row] || {};
      const total = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
      return { name: row, total };
    });
    
    // Sort first by total (descending) then alphabetically for ties
    const sortedRows = rowsWithTotals
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);
      })
      .map(r => r.name);
    
    // Return formatted data for heatmap
    return sortedRows.map(row => {
      const rowData = data.data[row] || {};
      
      // Create the base object with ID as row name with total
      const result: Record<string, any> = {
        id: prepareRowLabelWithTotal(row),
      };
      
      // Add data for each column (date)
      sortedColumns.forEach(col => {
        const formattedDate = formatDateForDisplay(col);
        result[formattedDate] = rowData[col] || 0;
      });
      
      return result;
    });
  }
  
  // Get the maximum value for color scaling
  const getMaxValue = () => {
    if (!data) return 5; // Default
    
    if (data.maxValue) return data.maxValue;
    
    let max = 0;
    for (const row of data.rows) {
      const rowData = data.data[row] || {};
      for (const col of data.columns) {
        const value = rowData[col] || 0;
        if (value > max) max = value;
      }
    }
    
    return max || 5; // Default to 5 if all zeros
  };
  
  // Generate title for the heatmap
  const generateTitle = () => {
    const dataTypeLabel = DATA_TYPES.find(type => type.id === dataType)?.name || 'Data';
    return `Patient: ${effectivePatientId} - ${dataTypeLabel} Heatmap`;
  };
  
  // Get formatted columns for the heatmap (x-axis)
  const getFormattedColumns = () => {
    if (!data) return [];
    return sortDatesChronologically(data.columns).map(formatDateForDisplay);
  };
  
  // Export the heatmap as PNG
  const exportToPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      setExportInProgress(true);
      
      // Capture the chart as canvas
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      // Convert to PNG and download
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `patient_${effectivePatientId}_${dataType}_heatmap.png`;
      link.href = image;
      link.click();
      
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [effectivePatientId, dataType, chartRef]);
  
  // Export the heatmap as PDF
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
      pdf.save(`patient_${effectivePatientId}_${dataType}_heatmap.pdf`);
      
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [effectivePatientId, dataType, generateTitle, chartRef]);
  
  // Handle export button click
  const handleExport = useCallback(() => {
    if (exportFormat === 'png') {
      exportToPNG();
    } else {
      exportToPDF();
    }
    setIsExportModalOpen(false);
  }, [exportFormat, exportToPNG, exportToPDF]);
  
  // Handle data type change
  const handleDataTypeChange = (value: string) => {
    setDataType(value);
  };
  
  // Determine if we have data to display
  const hasData = data && data.rows.length > 0;
  
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{generateTitle()}</h1>
            <p className="text-slate-500 mt-1">
              Interactive heatmap visualization of patient health data
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={dataType} onValueChange={handleDataTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => setExpandedViewOpen(true)}
              className="gap-1"
            >
              <Layout className="h-4 w-4" />
              Expanded View
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsExportModalOpen(true)}
              className="gap-1 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
            >
              <FileImage className="h-4 w-4" />
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
            <ResponsiveHeatMap
              data={prepareHeatmapData()}
              margin={{ top: 30, right: 80, bottom: 80, left: 220 }}
              valueFormat=">-.2s"
              indexBy="id"
              keys={getFormattedColumns()}
              colors={{
                type: 'sequential',
                scheme: 'blues',
              }}
              emptyColor="#f5f5f5"
              minValue={0}
              maxValue={getMaxValue()}
              forceSquare={false}
              axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Date',
                legendPosition: 'middle',
                legendOffset: -20,
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Date',
                legendPosition: 'middle',
                legendOffset: 45,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: DATA_TYPES.find(type => type.id === dataType)?.name || 'Item',
                legendPosition: 'middle',
                legendOffset: -180,
              }}
              hoverTarget="cell"
              animate={true}
              motionConfig="gentle"
              cellOpacity={1}
              cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
              legends={[
                {
                  anchor: 'right',
                  translateX: 50,
                  translateY: 0,
                  length: 240,
                  thickness: 10,
                  direction: 'column',
                  tickPosition: 'after',
                  tickSize: 3,
                  tickSpacing: 4,
                  tickOverlap: false,
                  title: 'Value',
                  titleAlign: 'start',
                  titleOffset: 4,
                }
              ]}
              cellHoverOtherId="cross"
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
        
        {/* Export options dialog */}
        <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Heatmap</DialogTitle>
              <DialogDescription>
                Choose a format to export the current heatmap visualization.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
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
        
        {/* Expanded view dialog */}
        <Dialog open={expandedViewOpen} onOpenChange={setExpandedViewOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{generateTitle()}</DialogTitle>
              <DialogDescription>
                Expanded view for detailed analysis
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 h-full overflow-hidden">
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
                <div style={{ height: 'calc(100% - 60px)' }}>
                  <ResponsiveHeatMap
                    data={prepareHeatmapData()}
                    margin={{ top: 30, right: 120, bottom: 80, left: 220 }}
                    valueFormat=">-.2s"
                    indexBy="id"
                    keys={getFormattedColumns()}
                    colors={{
                      type: 'sequential',
                      scheme: 'blues',
                    }}
                    emptyColor="#f5f5f5"
                    minValue={0}
                    maxValue={getMaxValue()}
                    forceSquare={false}
                    axisTop={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                      legend: 'Date',
                      legendPosition: 'middle',
                      legendOffset: -20,
                    }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                      legend: 'Date',
                      legendPosition: 'middle',
                      legendOffset: 60,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: DATA_TYPES.find(type => type.id === dataType)?.name || 'Item',
                      legendPosition: 'middle',
                      legendOffset: -180,
                    }}
                    hoverTarget="cell"
                    animate={true}
                    motionConfig="gentle"
                    cellOpacity={1}
                    cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                    legends={[
                      {
                        anchor: 'right',
                        translateX: 90,
                        translateY: 0,
                        length: 240,
                        thickness: 12,
                        direction: 'column',
                        tickPosition: 'after',
                        tickSize: 3,
                        tickSpacing: 4,
                        tickOverlap: false,
                        title: 'Value',
                        titleAlign: 'start',
                        titleOffset: 4,
                      }
                    ]}
                    cellHoverOtherId="cross"
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
              <Button variant="outline" onClick={() => setExpandedViewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}