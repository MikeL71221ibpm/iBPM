// Last updated: May 9, 2025 - 6:37 PM
// Controls route: /simplified-auto-pivot

import React, { useRef, useCallback, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileSpreadsheet, FileImage, File, RotateCw, TableProperties, Grid3X3, Layout } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Import ResponsiveHeatMap but we'll only use it conditionally if working
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { cn } from '@/lib/utils';
import { 
  getPatientIdFromSession,
  setPatientIdInSession,
  getFormattedPatientName,
  getFormattedPatientId,
  promptAndSetPatientId,
  clearAllSessionAndReload,
  debugSessionStorage,
  getPatientStatusFromSession,
  isPatientSelected,
  setPatientStatusInSession,
  getPatientIdentifier
} from '@/utils/patient-session-controlling-file-05_12_25';

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

// Helper function for displaying patient name that uses sessionStorage
const getPatientName = (patientId: string | number): string => {
  // Try to get the patient name from session storage first
  const storedPatientName = sessionStorage.getItem('selectedPatientName');
  
  // Add debug logging to help diagnose issues
  console.log("🧠 Pivot getPatientName called with:", patientId, "type:", typeof patientId);
  console.log("🧠 Session storage contains patient name:", storedPatientName);
  
  // If we have a stored patient name, use it
  if (storedPatientName) {
    return storedPatientName;
  }
  
  // Otherwise, use the Bob Test format as a fallback
  return `Bob Test${patientId}`;
};

// HeatmapSection component for displaying a specific data type
const HeatmapSection = ({ 
  dataType, 
  patientId,
  colorTheme,
  compact = true,
  forceUseProvidedPatientId = false
}: { 
  dataType: string; 
  patientId: string;
  colorTheme: string;
  compact?: boolean;
  forceUseProvidedPatientId?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Use our standardized utility functions for patient data consistency
  const patientIdFromSession = getPatientIdFromSession();
  const storedPatientStatus = getPatientStatusFromSession();
  
  console.log("Retrieved from sessionStorage in pivot view:", {
    patientId: patientIdFromSession,
    status: storedPatientStatus
  });
  
  // If forceUseProvidedPatientId is true, use the provided patientId prop
  // Otherwise, prioritize patient with "Selected" status from session storage
  // If no "Selected" patient, then fall back to other sources
  const effectivePatientId = forceUseProvidedPatientId 
    ? patientId 
    : (patientIdFromSession && storedPatientStatus === "Selected")
      ? patientIdFromSession
      : (patientId || patientIdFromSession);
      
  // If the status wasn't set but we have a patient ID, set it now
  if (patientIdFromSession && !storedPatientStatus) {
    setPatientStatusInSession("Selected");
    console.log("✅ Updated missing status for existing patient:", patientIdFromSession);
  }
  
  // Final patient ID to use throughout this component
  const patientToDisplay = effectivePatientId;
  
  console.log("🔍 SimplifiedAutoPivot using patient ID:", patientToDisplay, 
    "session ID:", patientIdFromSession,
    "URL param ID:", patientId); 
  
  // Use our standardized function to get formatted patient name
  const patientName = getFormattedPatientName(patientToDisplay);

  // Find the display name for the current data type
  const dataTypeInfo = DATA_TYPES.find(type => type.id === dataType);
  const displayName = dataTypeInfo?.name || dataType;
  
  // Get the active color set based on the current theme
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.iridis;
  
  // Fetch data from API using the effective patient ID from sessionStorage (prioritized)
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  
  // Use our standardized patientToDisplay for API requests
  console.log(`🔄 Making API request to /api/pivot/${apiEndpoint}/${patientToDisplay}`);
  
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientToDisplay}`],
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
      
      // Create worksheet with sorted rows
      const sortedRows = data.rows
        .map(row => ({
          name: row,
          totalValue: Object.values(data.data[row] || {}).reduce((sum, val) => sum + (val || 0), 0)
        }))
        .sort((a, b) => {
          // First sort by total value (descending)
          if (b.totalValue !== a.totalValue) {
            return b.totalValue - a.totalValue;
          }
          // Then sort alphabetically (ascending)
          return a.name.localeCompare(b.name);
        });
        
      const ws = XLSX.utils.aoa_to_sheet([
        ['', ...data.columns], // Header row with empty cell for row headers
        ...sortedRows.map(({name}) => [
          `${name} (${Object.values(data.data[name] || {}).reduce((sum, val) => sum + (val || 0), 0)})`,
          ...data.columns.map(col => data.data[name]?.[col] || 0)
        ])
      ]);
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patient Data');
      
      // Save file
      XLSX.writeFile(wb, `patient_${effectivePatientId}_${dataType}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [data, dataType, effectivePatientId]);
  
  // PNG export function commented out as requested
  const downloadAsPNG = useCallback(async () => {
    // Function body commented out since PNG export button has been removed
    console.log('PNG export disabled as requested');
  }, []);
  
  // Show preview modal before generating the PDF
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number>(1);
  const [paginatedPdf, setPaginatedPdf] = useState(false);

  // This function generates a preview of the PDF without DOM manipulation
  const generatePdfPreview = useCallback(async () => {
    if (!data || !chartRef.current) {
      console.error("Missing data or chart reference for PDF preview generation");
      return;
    }
    
    try {
      console.log(`Generating PDF preview for patient ${effectivePatientId} ${dataType} visualization`);
      setIsDownloading(true);
      
      // Create a larger virtual canvas to render the preview
      const canvas = document.createElement('canvas');
      
      // Determine PDF dimensions - landscape letter size in pixels (approximate at 96 DPI)
      const width = 1056;  // 11 inches at 96 DPI
      const height = 816;  // 8.5 inches at 96 DPI
      
      canvas.width = width;
      canvas.height = height;
      
      // Prepare data directly from our React state using dynamic ID
      const pdfPatientName = getFormattedPatientName(patientToDisplay); // Use standardized function for patient name
      
      // Sort rows in the same way as they appear in the UI
      const sortedRows = data.rows
        .map(row => ({
          name: row,
          totalValue: Object.values(data.data[row] || {}).reduce((sum, val) => sum + (val || 0), 0)
        }))
        .sort((a, b) => {
          // First sort by total value (descending)
          if (b.totalValue !== a.totalValue) {
            return b.totalValue - a.totalValue;
          }
          // Then sort alphabetically (ascending)
          return a.name.localeCompare(b.name);
        })
        .map(item => item.name);
      
      // Count rows and columns for pagination calculation
      const rowCount = sortedRows.length;
      const colCount = data.columns.length + 1; // +1 for row headers
      
      // Estimate page count
      const rowsPerPage = 40;  // Approximate
      const colsPerPage = 12;  // Approximate for landscape
      
      let estimatedPages = 1;
      
      if (paginatedPdf && (rowCount > rowsPerPage || colCount > colsPerPage)) {
        // If paginated, estimate total pages needed
        const verticalPages = Math.ceil(rowCount / rowsPerPage);
        const horizontalPages = Math.ceil(colCount / colsPerPage);
        estimatedPages = verticalPages * horizontalPages;
      } else {
        // If single-table approach, estimate based on total size
        const totalCells = rowCount * colCount;
        estimatedPages = Math.max(1, Math.ceil(totalCells / (rowsPerPage * colsPerPage)));
      }
      
      setPdfPages(estimatedPages);
      
      // Get the context and set basic styles
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get canvas context");
        return;
      }
      
      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      // Draw header
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      
      // Use standardized patient identifier format across all displays
      ctx.fillText(`${getPatientIdentifier(patientToDisplay, true)}`, width / 2, 40);
      
      ctx.font = '14px Arial';
      ctx.fillText(`${displayName} Visualization`, width / 2, 65);
      
      ctx.font = '11px Arial';
      ctx.fillText(`This is a preview of your PDF document. Estimated ${estimatedPages} page${estimatedPages !== 1 ? 's' : ''}.`, width / 2, 90);
      
      // Draw table outline as a preview
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 1;
      
      const tableTop = 120;
      const tableLeft = 50;
      const tableWidth = width - 100;
      const tableHeight = height - 170;
      
      ctx.strokeRect(tableLeft, tableTop, tableWidth, tableHeight);
      
      // Draw some sample table lines to illustrate the content
      // Vertical lines - limit to a reasonable number for preview
      const maxColsToShow = Math.min(colCount, 15);
      const colWidth = tableWidth / maxColsToShow; 
      
      for (let i = 1; i < maxColsToShow; i++) {
        ctx.beginPath();
        ctx.moveTo(tableLeft + i * colWidth, tableTop);
        ctx.lineTo(tableLeft + i * colWidth, tableTop + tableHeight);
        ctx.stroke();
      }
      
      // Horizontal lines - limit to a reasonable number for preview
      const maxRowsToShow = Math.min(rowCount, 25);
      const rowHeight = tableHeight / (maxRowsToShow + 1); // +1 for header
      
      for (let i = 1; i <= maxRowsToShow; i++) {
        ctx.beginPath();
        ctx.moveTo(tableLeft, tableTop + i * rowHeight);
        ctx.lineTo(tableLeft + tableWidth, tableTop + i * rowHeight);
        ctx.stroke();
      }
      
      // Draw header row with different background
      ctx.fillStyle = '#F1F5F9'; // Light gray for header
      ctx.fillRect(tableLeft, tableTop, tableWidth, rowHeight);
      
      // Draw first column with different background
      ctx.fillStyle = '#F1F5F9'; // Light gray for row headers
      ctx.fillRect(tableLeft, tableTop, colWidth, tableHeight);
      
      // Draw some sample data - Headers
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      
      // Header for first column
      ctx.fillText(displayName, tableLeft + colWidth / 2, tableTop + rowHeight / 2 + 4);
      
      // Column headers - limit display to what's visible
      const visibleCols = Math.min(data.columns.length, maxColsToShow - 1);
      
      for (let i = 0; i < visibleCols; i++) {
        const col = data.columns[i];
        const x = tableLeft + (i + 1) * colWidth + colWidth / 2;
        // Truncate long headers
        const displayText = col.length > 8 ? col.substring(0, 8) + '...' : col;
        ctx.fillText(displayText, x, tableTop + rowHeight / 2 + 4);
      }
      
      // Row headers and sample data
      ctx.textAlign = 'left';
      ctx.font = '11px Arial'; // Normal font for data
      
      // Only render a reasonable number of rows for the preview
      const visibleRows = Math.min(sortedRows.length, maxRowsToShow);
      
      for (let i = 0; i < visibleRows; i++) {
        const row = sortedRows[i];
        const y = tableTop + (i + 1) * rowHeight + rowHeight / 2 + 4;
        
        // Row header (first column)
        ctx.font = 'bold 11px Arial';
        const displayText = row.length > 20 ? row.substring(0, 20) + '...' : row;
        ctx.fillText(displayText, tableLeft + 4, y);
        
        // Sample data for visible columns
        ctx.font = '11px Arial'; // Normal font for data
        ctx.textAlign = 'center';
        
        for (let j = 0; j < visibleCols; j++) {
          const col = data.columns[j];
          const value = data.data[row]?.[col] || '';
          const x = tableLeft + (j + 1) * colWidth + colWidth / 2;
          
          // Only draw non-zero values
          if (value !== 0 && value !== '') {
            ctx.fillText(String(value), x, y);
          }
        }
      }
      
      // Indicate if table is truncated
      if (rowCount > maxRowsToShow || colCount > maxColsToShow) {
        ctx.font = 'italic 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('(Table truncated for preview - full data will be in PDF)', width / 2, height - 30);
      }
      
      // Final footer with page count
      ctx.font = '9px Arial';
      ctx.fillText(`Page 1 of ${estimatedPages} (preview only)`, width / 2, height - 15);
      
      // Convert to image and set as preview
      console.log("PDF preview generation complete");
      const previewImg = canvas.toDataURL('image/png');
      setPreviewContent(previewImg);
      setPreviewOpen(true);
      
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      // Display a more helpful error message
      console.log('PDF preview error details:', { 
        dataInfo: data ? `${data.rows?.length || 0} rows x ${data.columns?.length || 0} columns` : 'No data'
      });
    } finally {
      setIsDownloading(false);
    }
  }, [chartRef, dataType, effectivePatientId, dialogOpen, displayName, data]);

  // Function to actually generate the PDF with pagination support - uses direct canvas rendering
  const downloadAsPDF = useCallback(async () => {
    if (!data || !chartRef.current) {
      console.error("Missing data or chart reference for PDF generation");
      return;
    }
    
    try {
      setIsDownloading(true);
      
      console.log("Starting PDF generation process with direct rendering approach");
      
      // Create canvas for rendering the table
      const canvas = document.createElement('canvas');
      const patientName = getPatientName(effectivePatientId); // No need to parse, getPatientName handles both types
      
      // PDF dimensions - use landscape for wider tables
      const pageWidth = 842; // A4 landscape width in points (11.7 inches)
      const pageHeight = 595; // A4 landscape height in points (8.3 inches)
      const margin = 40;
      const headerHeight = 80;
      const footerHeight = 30;
      const availableHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
      
      // Sort rows consistently with the UI
      const sortedRows = data.rows
        .map(row => ({
          name: row,
          totalValue: Object.values(data.data[row] || {}).reduce((sum, val) => sum + (val || 0), 0)
        }))
        .sort((a, b) => {
          // First sort by total value (descending)
          if (b.totalValue !== a.totalValue) {
            return b.totalValue - a.totalValue;
          }
          // Then sort alphabetically (ascending)
          return a.name.localeCompare(b.name);
        })
        .map(item => item.name);
      
      // Calculate layout parameters
      const colWidth = 50; // Width of each data cell 
      const rowHeight = 25; // Height of each row
      const firstColWidth = 180; // Width of first column (row labels)
      
      // Pagination calculation
      const availableWidth = pageWidth - margin * 2;
      const maxColsPerPage = Math.max(1, Math.floor((availableWidth - firstColWidth) / colWidth));
      const maxRowsPerPage = Math.max(1, Math.floor(availableHeight / rowHeight));
      
      // Calculate total pages needed
      const totalRows = sortedRows.length;
      const totalCols = data.columns.length;
      
      const verticalPages = Math.ceil(totalRows / maxRowsPerPage);
      const horizontalPages = Math.ceil(totalCols / maxColsPerPage);
      const totalPages = verticalPages * horizontalPages;
      
      console.log(`PDF layout: ${maxRowsPerPage} rows x ${maxColsPerPage} cols per page`);
      console.log(`PDF pagination: ${verticalPages} vertical pages x ${horizontalPages} horizontal pages = ${totalPages} total pages`);
      
      // Create a PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      
      // Function to draw page header
      const drawHeader = (pageNum: number) => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, headerHeight + margin, "F");
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${getPatientIdentifier(patientToDisplay, true)}`, pageWidth / 2, margin, { align: 'center' });
        
        pdf.setFontSize(12);
        pdf.text(`${displayName} Visualization`, pageWidth / 2, margin + 20, { align: 'center' });
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, margin + 40, { align: 'center' });
        
        // Footer with page number
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      };
      
      // Generate each page
      let currentPage = 0;
      
      // Pages loop
      for (let vPage = 0; vPage < verticalPages; vPage++) {
        // Calculate row range for this page
        const startRow = vPage * maxRowsPerPage;
        const endRow = Math.min(startRow + maxRowsPerPage, totalRows);
        const pageRows = sortedRows.slice(startRow, endRow);
        
        for (let hPage = 0; hPage < horizontalPages; hPage++) {
          // Calculate column range for this page
          const startCol = hPage * maxColsPerPage;
          const endCol = Math.min(startCol + maxColsPerPage, totalCols);
          const pageCols = data.columns.slice(startCol, endCol);
          
          // Add a new page (except for the first one)
          if (currentPage > 0) {
            pdf.addPage();
          }
          currentPage++;
          
          // Draw header
          drawHeader(currentPage);
          
          // Set starting position for table
          const tableTop = margin + headerHeight;
          const tableLeft = margin;
          
          // Draw table header row
          pdf.setFillColor(241, 245, 249); // Light gray background for header
          pdf.rect(tableLeft, tableTop, firstColWidth + colWidth * pageCols.length, rowHeight, "F");
          
          // Draw first column header
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.text(displayName, tableLeft + 5, tableTop + rowHeight - 10);
          
          // Draw column headers
          for (let i = 0; i < pageCols.length; i++) {
            const col = pageCols[i];
            const x = tableLeft + firstColWidth + i * colWidth;
            
            // Draw header cell
            pdf.setFillColor(241, 245, 249);
            pdf.rect(x, tableTop, colWidth, rowHeight, "F");
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(x, tableTop, colWidth, rowHeight, "S");
            
            // Truncate long headers
            const displayText = col.length > 8 ? col.substring(0, 8) + "..." : col;
            pdf.text(displayText, x + colWidth / 2, tableTop + rowHeight - 10, { align: 'center' });
          }
          
          // Draw data rows
          for (let i = 0; i < pageRows.length; i++) {
            const rowName = pageRows[i];
            const y = tableTop + (i + 1) * rowHeight;
            
            // Draw row header (first column)
            pdf.setFillColor(241, 245, 249);
            pdf.rect(tableLeft, y, firstColWidth, rowHeight, "F");
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(tableLeft, y, firstColWidth, rowHeight, "S");
            
            // Truncate long row names if needed
            const displayText = rowName.length > 25 ? rowName.substring(0, 23) + "..." : rowName;
            const totalValue = Object.values(data.data[rowName] || {}).reduce((sum, val) => sum + (val || 0), 0);
            
            pdf.setFont("helvetica", "bold");
            pdf.text(`${displayText} (${totalValue})`, tableLeft + 5, y + rowHeight - 10);
            
            // Draw data cells
            pdf.setFont("helvetica", "normal");
            for (let j = 0; j < pageCols.length; j++) {
              const col = pageCols[j];
              const x = tableLeft + firstColWidth + j * colWidth;
              const value = data.data[rowName]?.[col] || 0;
              
              // Draw cell
              pdf.setFillColor(255, 255, 255);
              pdf.rect(x, y, colWidth, rowHeight, "F");
              pdf.setDrawColor(200, 200, 200);
              pdf.rect(x, y, colWidth, rowHeight, "S");
              
              // Draw value if non-zero
              if (value > 0) {
                pdf.text(String(value), x + colWidth / 2, y + rowHeight - 10, { align: 'center' });
              }
            }
          }
          
          // Add page indicators
          const colRangeText = `Columns: ${startCol + 1}-${endCol} of ${totalCols}`;
          const rowRangeText = `Rows: ${startRow + 1}-${endRow} of ${totalRows}`;
          
          pdf.setFontSize(8);
          pdf.text(colRangeText, margin, tableTop - 5);
          pdf.text(rowRangeText, pageWidth - margin - pdf.getTextWidth(rowRangeText), tableTop - 5);
        }
      }
      
      // Save the PDF
      console.log(`Saving PDF: patient_${effectivePatientId}_${dataType}_visualization.pdf`);
      try {
        const filename = `patient_${effectivePatientId}_${dataType}_visualization.pdf`;
        pdf.save(filename);
        console.log('PDF save successful');
      } catch (saveErr) {
        console.error('Error during PDF save operation:', saveErr);
      }
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      
      // Comprehensive error information for diagnosis
      const errorDetails = {
        dataInfo: data ? `${data.rows?.length || 0} rows x ${data.columns?.length || 0} columns` : 'No data',
        errorType: typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorName: err instanceof Error ? err.name : 'Unknown',
        errorStack: err instanceof Error ? err.stack : undefined,
      };
      
      console.log('PDF generation error details:', errorDetails);
      
      // Alert the user about the error so they get feedback
      alert(`Unable to generate PDF. Please try a different visualization or format. Error: ${errorDetails.errorMessage}`);
    } finally {
      setIsDownloading(false);
      setPreviewOpen(false);
    }
  }, [chartRef, dataType, effectivePatientId, dialogOpen, displayName, data, paginatedPdf]);

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

  const dialogTitle = `Patient ${patientId} ${displayName} - Pivot Table Visualization`;

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
            <div className="flex space-x-2">
              {/* Standardized session control buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => promptAndSetPatientId()}
                className="h-8 px-2 text-xs"
              >
                Set Session ID
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-8 px-2 text-xs"
              >
                Expand
              </Button>
            </div>
          </div>
          <CardDescription className="mt-0.5 text-xs">
            {dataTypeInfo?.description || `${displayName} visualization for ${getFormattedPatientName(patientToDisplay)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div style={{ height: `${height}px`, overflow: 'auto' }} ref={chartRef}>
            {/* Render a direct DOM-based heatmap instead of using Nivo HeatMap */}
            <div className="p-2">
              {/* Pivot tables don't need a legend */}
              
              {/* The actual heatmap table */}
              <div className="overflow-auto print:overflow-visible">
                <table className="border-collapse w-full print:w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-10 bg-background min-w-[180px] p-1 border border-slate-200">
                        <div className="text-xs font-semibold">{displayName}</div>
                      </th>
                      {data?.columns.map((col) => (
                        <th 
                          key={col} 
                          className="p-1 text-xs font-semibold text-gray-700 rotate-[-45deg] origin-bottom-left border border-slate-200"
                          style={{ 
                            minWidth: 38, 
                            height: 80,  
                            textAlign: 'center'
                          }}
                        >
                          <div className="inline-block mx-auto">
                            {col}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows
                      .map(row => ({
                        name: row,
                        totalValue: Object.values(data.data[row] || {}).reduce((sum, val) => sum + (val || 0), 0)
                      }))
                      .sort((a, b) => {
                        // First sort by total value (descending)
                        if (b.totalValue !== a.totalValue) {
                          return b.totalValue - a.totalValue;
                        }
                        // Then sort alphabetically (ascending)
                        return a.name.localeCompare(b.name);
                      })
                      .map(({ name, totalValue }) => (
                      <tr key={name}>
                        <th className="sticky left-0 bg-background border border-slate-200 p-2 text-left text-xs font-semibold text-gray-700 min-w-[180px]">
                          {name} <span className="font-normal">({totalValue})</span>
                        </th>
                        {data.columns.map((col) => {
                          const value = data.data[name]?.[col] || 0;
                          
                          // For pivot tables, use consistent cell size and centered values
                          return (
                            <td 
                              key={`${name}-${col}`} 
                              style={{ 
                                backgroundColor: '#FFFFFF',
                                color: '#000000',
                                width: 38,
                                height: 22, // Even more compact for card view
                                border: '1px solid #e0e0e0',
                                textAlign: 'center'
                              }}
                              className="text-center text-xs font-medium border border-slate-200"
                              title={`${name} on ${col}: ${value}`}
                            >
                              {value > 0 ? value : '\u00A0'}
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

      {/* Preview dialog for PDF preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] px-12">
          <DialogHeader>
            <DialogTitle>PDF Preview - Patient {patientId} {displayName}</DialogTitle>
            <DialogDescription>
              Preview of the PDF document. Estimated {pdfPages} page{pdfPages !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto border rounded-md max-h-[calc(90vh-160px)]">
            {previewContent && (
              <img 
                src={previewContent} 
                alt="PDF Preview" 
                className="w-full h-auto"
              />
            )}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="paginated-pdf" 
                checked={paginatedPdf}
                onCheckedChange={(checked) => setPaginatedPdf(checked as boolean)} 
              />
              <Label htmlFor="paginated-pdf">Use multi-page format for large tables</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  setPreviewOpen(false); // Close the preview dialog first
                  setTimeout(() => downloadAsPDF(), 100); // Small delay to ensure dialog is closed
                }}
                className=""
              >
                Generate PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Full view dialog */}
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
                {/* PNG export button removed as requested */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePdfPreview}
                  disabled={isDownloading}
                  title="Preview and Create PDF"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <File className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">Patient ID: P{String(effectivePatientId).padStart(4, '0')}</span>
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            <div style={{ height: 'calc(98vh - 100px)', overflow: 'auto', width: '100%' }}>
              {/* Render a direct DOM-based heatmap instead of using Nivo HeatMap */}
              <div className="p-4">
                {/* No legend in pivot table view */}
                
                {/* The actual heatmap table */}
                <div className="overflow-auto print:overflow-visible">
                  <table className="border-collapse w-full print:w-full">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-10 bg-background min-w-[200px] p-2 border border-slate-200">
                          <div className="text-sm font-semibold">{displayName}</div>
                        </th>
                        {data?.columns.map((col) => (
                          <th 
                            key={col} 
                            className="p-1 text-xs font-semibold text-gray-700 rotate-[-45deg] origin-bottom-left border border-slate-200"
                            style={{ 
                              minWidth: 50, // Wider columns for better spacing
                              maxWidth: 50, // Constrain width to prevent excessive space
                              height: 120,  // Taller header for rotated dates
                              textAlign: 'center'
                            }}
                          >
                            <div className="inline-block mx-auto">
                              {col}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.rows
                        .map(row => ({
                          name: row,
                          totalValue: Object.values(data.data[row] || {}).reduce((sum, val) => sum + (val || 0), 0)
                        }))
                        .sort((a, b) => {
                          // First sort by total value (descending)
                          if (b.totalValue !== a.totalValue) {
                            return b.totalValue - a.totalValue;
                          }
                          // Then sort alphabetically (ascending)
                          return a.name.localeCompare(b.name);
                        })
                        .map(({ name, totalValue }) => (
                        <tr key={name}>
                          <th className="sticky left-0 bg-background border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                            {name} <span className="font-normal">({totalValue})</span>
                          </th>
                          {data.columns.map((col) => {
                            const value = data.data[name]?.[col] || 0;
                            
                            // For pivot tables, use consistent spacing with centered values
                            return (
                              <td 
                                key={`${name}-${col}`} 
                                style={{ 
                                  padding: '8px',
                                  border: '1px solid #e5e7eb',
                                  textAlign: 'center'
                                }}
                                className="text-center font-medium border border-slate-200"
                                title={`${name} on ${col}: ${value}`}
                              >
                                {value > 0 ? value : '\u00A0'} {/* Use non-breaking space to maintain cell size */}
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

// Debug component to actively monitor session storage changes
// Will display in the corner of the screen
const SessionStorageDebugger = () => {
  const [sessionData, setSessionData] = React.useState({
    selectedPatientId: sessionStorage.getItem('selectedPatientId') || 'not set',
    selectedPatientName: sessionStorage.getItem('selectedPatientName') || 'not set'
  });
  
  React.useEffect(() => {
    // Update state every 500ms to detect changes
    const intervalId = setInterval(() => {
      setSessionData({
        selectedPatientId: sessionStorage.getItem('selectedPatientId') || 'not set',
        selectedPatientName: sessionStorage.getItem('selectedPatientName') || 'not set'
      });
    }, 500);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-amber-100 p-3 border border-amber-500 rounded shadow-lg z-50 text-xs">
      <div className="font-bold mb-1">Session Storage Monitor:</div>
      <div>Patient ID: {sessionData.selectedPatientId}</div>
      <div>Patient Name: {sessionData.selectedPatientName}</div>
    </div>
  );
};

export default function SimplifiedAutoPivot() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const [showDebugger, setShowDebugger] = React.useState(false); // Add back the missing state variable
  
  // Get the patient ID from sessionStorage if available, otherwise use URL param or default
  const storedPatientId = sessionStorage.getItem('selectedPatientId');
  
  // Prioritize sessionStorage value over URL parameter
  const patientToDisplay = storedPatientId || patientId || '1018';
  
  // Simple useEffect to handle scrolling and patient ID consistency
  React.useEffect(() => {
    // Simple scroll to top when component mounts - this is what works in other views
    window.scrollTo(0, 0);
    
    // If URL doesn't match stored ID, update URL for consistency
    if (storedPatientId && patientId !== storedPatientId) {
      setLocation(`/simplified-auto-pivot/${storedPatientId}`);
    }
  }, [patientId, storedPatientId, setLocation]);
  
  // Simple debug logging
  console.log("Pivot table showing patient:", patientToDisplay, 
              "from", storedPatientId ? "session storage" : "URL or default");
  
  // Force refresh sessionStorage value if needed to ensure consistency across components
  if (storedPatientId !== patientToDisplay) {
    console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
    sessionStorage.setItem('selectedPatientId', patientToDisplay);
  }
  
  // Extra debugging to verify sessionStorage state
  console.log("All sessionStorage keys:", Object.keys(sessionStorage));
  if (storedPatientId !== patientToDisplay) {
    console.warn("WARNING: Mismatch between sessionStorage and displayed patient ID");
  }
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
      pdf.save(`patient_${patientToDisplay}_all_pivot_tables.pdf`);
      
    } catch (err) {
      console.error('Error exporting grid as PDF:', err);
    } finally {
      setIsExporting(false);
    }
  }, [gridRef, patientToDisplay]);
  
  // PNG export function commented out as requested
  const exportGridAsPNG = useCallback(async () => {
    // Function body commented out since PNG export button has been removed
    console.log('PNG export disabled as requested');
  }, []);
  
  // Update the URL when the component loads to ensure it has patientId
  // Put scroll logic in a separate effect that runs on every render
  React.useEffect(() => {
    // DIRECT APPROACH: Force the window to scroll to top immediately on component mount
    // This must execute synchronously without any dependencies
    window.scrollTo(0, 0);
    
    // Add a fallback with timeout to handle any race conditions
    const scrollTimer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
      console.log("📏 Fallback scroll to top executed");
    }, 100);
    
    return () => clearTimeout(scrollTimer);
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // Separate effect for patient ID handling
  React.useEffect(() => {
    console.log("Patient ID handling effect running with:", {
      patientId,
      storedPatientId,
      patientToDisplay
    });
    
    if (!patientId) {
      console.log("Updating URL to include patient ID:", patientToDisplay);
      setLocation(`/simplified-auto-pivot/${patientToDisplay}`);
    }
    
    // CRITICAL FIX: ALWAYS USE SESSION STORAGE ID WHEN AVAILABLE
    // Even if it differs from URL - this ensures consistency across all visualizations
    if (storedPatientId && storedPatientId !== patientId) {
      console.log("⚠️ URL patientId doesn't match sessionStorage, redirecting:", storedPatientId);
      setLocation(`/simplified-auto-pivot/${storedPatientId}`);
      
      // Abort further processing to prevent any API calls with wrong ID
      return;
    }
  }, [patientId, patientToDisplay, setLocation, storedPatientId]);

  return (
    <div className="container mx-auto py-4 px-12 max-w-7xl">
      {showDebugger && <SessionStorageDebugger />}
      <div className="flex flex-col space-y-4">
        {/* Header section with patient info and color theme to the right */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Pivot Table Analysis
            </h1>
            <h2 className="text-xl font-semibold mb-1">
              {getPatientIdentifier(patientToDisplay, true)}
              {storedPatientId && storedPatientId !== patientToDisplay && (
                <span className="text-sm ml-2 text-amber-500">
                  (Note: Using ID {patientToDisplay} but session has ID {storedPatientId})
                </span>
              )}
            </h2>
            <div className="flex space-x-2 mt-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newId = prompt("Enter patient ID to save in sessionStorage:", patientToDisplay);
                  if (newId) {
                    sessionStorage.setItem('selectedPatientId', newId);
                    console.log("Manually set sessionStorage to:", newId);
                    
                    // Force refresh
                    setTimeout(() => window.location.reload(), 500);
                  }
                }}
              >
                Set Session ID
              </Button>

            </div>
            <p className="text-sm text-muted-foreground">
              Quick overview of all patient data through pivot table visualizations.
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
        
        {/* Export buttons moved to the left */}
        <div className="flex justify-start items-center mb-3">
          <div className="flex gap-1.5 items-center">
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={exportGridAsPDF}
              disabled={isExporting}
            >
              <File className="h-3 w-3 mr-1" />
              Export Grids to PDF
            </Button>
            
            {/* PNG export button removed as requested */}
            
            <Button 
              variant="outline" 
              className="whitespace-nowrap h-8 text-xs px-2"
              onClick={() => window.location.href = `/nivo-scatter-view-themed/${patientToDisplay}`}
            >
              <TableProperties className="h-3 w-3 mr-1" />
              View Bubble Charts
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
              onClick={() => window.location.reload()}
            >
              <RotateCw className="h-3 w-3 mr-1" />
              Refresh Data
            </Button>
            
            {isExporting && <Loader2 className="h-4 w-4 animate-spin text-gray-500 ml-2" />}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6" ref={gridRef}>
          {DATA_TYPES.map((dataType) => (
            <HeatmapSection
              key={dataType.id}
              dataType={dataType.id}
              patientId={patientToDisplay}
              colorTheme={currentTheme}
              forceUseProvidedPatientId={true} /* Force the component to use the patientId prop value we provide */
            />
          ))}
        </div>
      </div>
    </div>
  );
}