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

// Last updated: May 9, 2025 - 5:45 AM
// Controls route: /simplified-auto-pivot/:patientId?

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
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

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
const sortDatesChronologically = (dates: string[]) => {
  return [...dates].sort((a, b) => {
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

const PivotTablePage: React.FC = () => {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [, navigate] = useLocation();
  const [dataType, setDataType] = useState<string>('symptom');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'png'>('excel');
  const [visualizationType, setVisualizationType] = useState<'table' | 'heatmap'>('table');
  const [includeZeroValues, setIncludeZeroValues] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // If no patientId, use "1" as default
  const effectivePatientId = patientId || "1";
  
  // Fetch the pivot data
  const { data, isLoading, error, refetch } = useQuery<PivotData>({
    queryKey: ['/api/pivot', API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS], effectivePatientId],
    staleTime: 1000 * 60 * 5, // 5 min
  });
  
  // Prepare data for the pivot table view
  const prepareTableData = useCallback(() => {
    if (!data) return [];
    
    // Sort columns (dates) chronologically
    const sortedColumns = sortDatesChronologically(data.columns);
    
    // Prepare rows, sorting by total occurrences (descending)
    const rowsWithTotals = data.rows.map(row => {
      const rowData = data.data[row] || {};
      const total = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
      return { name: row, total };
    });
    
    // Sort first by total (descending) then alphabetically for ties
    const sortedRows = rowsWithTotals.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    }).map(r => r.name);
    
    // Build the pivot table data structure
    return sortedRows.map(row => {
      const rowData = data.data[row] || {};
      
      // Add parentheses with total for each row
      const rowTotal = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
      const rowLabel = `${row} (${rowTotal})`;
      
      // First column is the row label, followed by data points
      const tableRow: Record<string, any> = { 
        rowLabel 
      };
      
      sortedColumns.forEach(col => {
        const value = rowData[col] ?? 0;
        // Only include non-zero values if includeZeroValues is false
        if (includeZeroValues || value !== 0) {
          tableRow[formatDateForDisplay(col)] = value;
        }
      });
      
      return tableRow;
    });
  }, [data, includeZeroValues]);
  
  // Generate title based on data type and patient ID
  const generateTitle = () => {
    const dataTypeLabel = DATA_TYPES.find(type => type.id === dataType)?.name || 'Data';
    return `Patient: ${effectivePatientId} - ${dataTypeLabel} Pivot Table`;
  };
  
  // Export the table as Excel
  const exportToExcel = useCallback(() => {
    if (!data) return;
    
    // Format data for Excel
    const worksheet = XLSX.utils.json_to_sheet(prepareTableData());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pivot Data");
    
    // Generate filename
    const filename = `patient_${effectivePatientId}_${dataType}_pivot.xlsx`;
    
    // Create excel file and download
    XLSX.writeFile(workbook, filename);
  }, [data, effectivePatientId, dataType, prepareTableData]);
  
  // Export the table as PNG
  const exportToPNG = useCallback(async () => {
    if (!tableRef.current) return;
    
    try {
      setExportInProgress(true);
      
      // Capture the table as canvas
      const canvas = await html2canvas(tableRef.current, {
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      // Convert to PNG and download
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `patient_${effectivePatientId}_${dataType}_pivot.png`;
      link.href = image;
      link.click();
      
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [effectivePatientId, dataType, tableRef]);
  
  // Export the table as PDF
  const exportToPDF = useCallback(async () => {
    if (!tableRef.current || !data) return;
    
    try {
      setExportInProgress(true);
      
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });
      
      // Add title
      pdf.setFontSize(14);
      pdf.text(generateTitle(), 40, 40);
      
      // Format data for the table
      const tableData = prepareTableData();
      if (tableData.length === 0) {
        pdf.text("No data available", 40, 70);
        pdf.save(`patient_${effectivePatientId}_${dataType}_pivot.pdf`);
        return;
      }
      
      // Get all columns from the first row
      const columns = Object.keys(tableData[0]).map(key => ({ 
        header: key === 'rowLabel' ? dataType.charAt(0).toUpperCase() + dataType.slice(1) : key,
        dataKey: key 
      }));
      
      // Generate the table
      (pdf as any).autoTable({
        columns,
        body: tableData,
        startY: 60,
        margin: { top: 60 },
        styles: { overflow: 'linebreak', cellPadding: 4 },
        columnStyles: { 
          rowLabel: { cellWidth: 150, fontStyle: 'bold' } 
        },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        theme: 'grid'
      });
      
      // Save the PDF
      pdf.save(`patient_${effectivePatientId}_${dataType}_pivot.pdf`);
      
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setExportInProgress(false);
    }
  }, [data, effectivePatientId, dataType, generateTitle, prepareTableData]);
  
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
  
  // Generate a grid of all data types
  const handleViewAllGrids = useCallback(() => {
    setIsGridModalOpen(true);
  }, []);
  
  // Handle changing the data type
  const handleDataTypeChange = (value: string) => {
    setDataType(value);
  };
  
  // Prepare data for heatmap visualization
  const prepareHeatmapData = useCallback(() => {
    if (!data) return [];
    
    // Sort dates chronologically
    const sortedColumns = sortDatesChronologically(data.columns);
    
    // Prepare rows with totals for sorting
    const rowsWithTotals = data.rows.map(row => {
      const rowData = data.data[row] || {};
      const total = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
      return { name: row, total };
    });
    
    // Sort by total (descending)
    const sortedRows = rowsWithTotals
      .sort((a, b) => b.total - a.total)
      .map(r => r.name);
    
    // Return heatmap data format
    return sortedRows.map(row => {
      const rowData = data.data[row] || {};
      
      // Create base object with ID as row name (with total in parentheses)
      const rowTotal = Object.values(rowData).reduce((sum, val) => sum + (val || 0), 0);
      const result: Record<string, any> = {
        id: `${row} (${rowTotal})`
      };
      
      // Add data for each column (date)
      sortedColumns.forEach(col => {
        const formattedDate = formatDateForDisplay(col);
        result[formattedDate] = rowData[col] || 0;
      });
      
      return result;
    });
  }, [data]);
  
  // Find the max value for heatmap color scale
  const findMaxValue = useCallback(() => {
    if (!data) return 5; // Default max
    
    let max = 0;
    data.rows.forEach(row => {
      const rowData = data.data[row] || {};
      Object.values(rowData).forEach(value => {
        if (value > max) max = value;
      });
    });
    
    return max || 5; // Default to 5 if all values are 0
  }, [data]);
  
  // Create a simple 2x2 grid of all data types
  const renderAllGrids = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_TYPES.map(type => (
          <Card key={type.id} className="overflow-hidden">
            <CardHeader className="p-4 bg-slate-50">
              <CardTitle className="text-lg">{type.name}</CardTitle>
              <CardDescription>{type.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[300px] overflow-auto">
              <AllGridView 
                patientId={effectivePatientId} 
                dataType={type.id} 
                onSelect={() => {
                  setDataType(type.id);
                  setIsGridModalOpen(false);
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Component to render inside the 2x2 grid view
  const AllGridView = ({ 
    patientId, 
    dataType, 
    onSelect 
  }: { 
    patientId: string;
    dataType: string;
    onSelect: () => void;
  }) => {
    // Fetch data for this specific type
    const { data: gridData, isLoading, error } = useQuery<PivotData>({
      queryKey: ['/api/pivot', API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS], patientId],
      staleTime: 1000 * 60 * 5, // 5 min
    });
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error || !gridData) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          Error loading data
        </div>
      );
    }
    
    // Calculate totals for rows to sort them
    const rowsWithTotals = gridData.rows.map(row => {
      const rowData = gridData.data[row] || {};
      const total = Object.values(rowData).reduce((sum, value) => sum + (value || 0), 0);
      return { name: row, total };
    });
    
    // Sort by total (descending)
    const sortedRows = rowsWithTotals
      .sort((a, b) => b.total - a.total)
      .map(r => r.name)
      .slice(0, 10); // Just show top 10 for preview
    
    // Sort dates chronologically
    const sortedColumns = sortDatesChronologically(gridData.columns).slice(0, 10); // Just show first 10 for preview
    
    return (
      <div className="p-2">
        <div className="overflow-auto max-h-[250px]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border px-2 py-1 text-left font-medium">{dataType}</th>
                {sortedColumns.map(col => (
                  <th key={col} className="border px-2 py-1 text-center font-medium">
                    {formatDateForDisplay(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row} className="hover:bg-slate-50">
                  <td className="border px-2 py-1 font-medium">{row}</td>
                  {sortedColumns.map(col => {
                    const value = gridData.data[row]?.[col] || 0;
                    return (
                      <td 
                        key={`${row}-${col}`} 
                        className={cn(
                          "border px-2 py-1 text-center",
                          value > 0 && "bg-blue-100 font-medium"
                        )}
                      >
                        {value || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-center">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onSelect}
          >
            <TableProperties className="h-4 w-4 mr-1" />
            View Full Grid
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{generateTitle()}</h1>
            <p className="text-slate-500 mt-1">
              Interactive pivot table visualization of patient data
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
              onClick={handleViewAllGrids}
              className="gap-1"
            >
              <Grid3X3 className="h-4 w-4" />
              View All Grids
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsExportModalOpen(true)}
              className="gap-1"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Data
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
        
        {/* Toggle between table and heatmap views */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant={visualizationType === 'table' ? 'default' : 'outline'}
              onClick={() => setVisualizationType('table')}
              className="gap-1"
            >
              <TableProperties className="h-4 w-4" />
              Table View
            </Button>
            <Button 
              variant={visualizationType === 'heatmap' ? 'default' : 'outline'}
              onClick={() => setVisualizationType('heatmap')}
              className="gap-1"
            >
              <Layout className="h-4 w-4" />
              Heatmap View
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="show-zeros" 
              checked={includeZeroValues} 
              onCheckedChange={(checked) => setIncludeZeroValues(!!checked)} 
            />
            <Label htmlFor="show-zeros">Show zero values</Label>
          </div>
        </div>
        
        {/* Visualization section */}
        <div 
          ref={tableRef} 
          className={cn(
            "bg-white rounded-lg shadow-sm overflow-hidden",
            exportInProgress && "relative opacity-60"
          )}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
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
          ) : !data || data.rows.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No data available for this patient.</p>
            </div>
          ) : visualizationType === 'table' ? (
            // Table view
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border p-2 text-left font-semibold sticky left-0 bg-slate-50">
                      {DATA_TYPES.find(type => type.id === dataType)?.name || 'Item'}
                    </th>
                    
                    {data && sortDatesChronologically(data.columns).map(column => (
                      <th key={column} className="border p-2 text-center font-semibold">
                        {formatDateForDisplay(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prepareTableData().map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border p-2 font-medium sticky left-0 bg-inherit">
                        {row.rowLabel}
                      </td>
                      
                      {data && sortDatesChronologically(data.columns).map(column => {
                        const formattedColumn = formatDateForDisplay(column);
                        const value = row[formattedColumn];
                        return (
                          <td 
                            key={`${index}-${column}`} 
                            className={cn(
                              "border p-2 text-center",
                              value > 0 && "bg-blue-50 font-medium"
                            )}
                          >
                            {value !== undefined && value !== 0 ? value : (includeZeroValues ? '0' : '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Heatmap view
            <div style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
              <ResponsiveHeatMap
                data={prepareHeatmapData()}
                margin={{ top: 20, right: 90, bottom: 60, left: 220 }}
                valueFormat=">-.2s"
                indexBy="id"
                keys={data ? sortDatesChronologically(data.columns).map(formatDateForDisplay) : []}
                colors={{
                  type: 'sequential',
                  scheme: 'blues',
                }}
                emptyColor="#f5f5f5"
                minValue={0}
                maxValue={findMaxValue()}
                forceSquare={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Date',
                  legendPosition: 'middle',
                  legendOffset: 50
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: DATA_TYPES.find(type => type.id === dataType)?.name || 'Item',
                  legendPosition: 'middle',
                  legendOffset: -180
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
                    translateX: 60,
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
                    titleOffset: 4
                  }
                ]}
              />
            </div>
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
              <DialogTitle>Export Options</DialogTitle>
              <DialogDescription>
                Choose a format to export the current data view.
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
                    <File className="h-5 w-5 mr-2 text-red-600" />
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
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Grid view dialog */}
        <Dialog open={isGridModalOpen} onOpenChange={setIsGridModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>All Data Views</DialogTitle>
              <DialogDescription>
                Quick view of all data types for Patient {effectivePatientId}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {renderAllGrids()}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGridModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PivotTablePage;