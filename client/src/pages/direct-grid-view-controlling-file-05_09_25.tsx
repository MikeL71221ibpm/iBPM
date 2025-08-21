import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUpRight } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// Define the auto pivot page parameter types
interface AutoPivotPageParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Converts the pivot data to an Excel workbook
const createExcelWorkbook = (data: PivotData, title: string): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  
  if (!data || !data.rows || !data.columns) {
    // Create an empty worksheet if no data
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, title);
    return wb;
  }
  
  // Create header row with date columns
  const headers = ['Item', ...data.columns];
  
  // Create data rows
  const rows = data.rows.map((row, index) => {
    // First column: index + row name
    const firstCol = `${index + 1}. ${row}`;
    
    // Data cells
    const values = data.columns.map(col => data.data[row]?.[col] || 0);
    
    return [firstCol, ...values];
  });
  
  // Create worksheet and append to workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const columnWidths = [
    { wch: 40 }, // First column width for item names
    ...data.columns.map(() => ({ wch: 12 })) // Date column widths
  ];
  ws['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, title);
  return wb;
};

// PivotTableSection component displays a single pivot table for a data type
const PivotTableSection = ({ 
  dataType, 
  patientId,
  compact = false
}: { 
  dataType: string; 
  patientId: string;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Endpoint for the data type
  const apiPath = dataType === 'category' ? 'diagnostic-category' : dataType;
  const endpoint = `/api/pivot/${apiPath}/${patientId}`;
  
  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: true,
  });
  
  // Get display name for the data type
  const getDisplayName = () => {
    switch(dataType) {
      case 'symptom': return 'Symptoms';
      case 'diagnosis': return 'Diagnoses';
      case 'category': return 'Diagnostic Categories';
      case 'hrsn': return 'HRSN Indicators';
      default: return dataType;
    }
  };
  
  const displayName = getDisplayName();
  
  // Handle table downloads
  const handleDownload = (format: 'pdf' | 'excel') => {
    if (!tableRef.current || !data) return;
    
    switch (format) {
      case 'pdf':
        html2canvas(tableRef.current, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm'
          });
          
          // Calculate aspect ratio to fit on page
          const imgWidth = 250;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          // Add title
          pdf.setFontSize(14);
          pdf.text(`${displayName} - Patient ${patientId}`, 10, 10);
          
          // Add image
          pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
          pdf.save(`patient-${patientId}-${dataType}.pdf`);
        });
        break;
        
      case 'excel':
        const wb = createExcelWorkbook(data, displayName);
        XLSX.writeFile(wb, `patient-${patientId}-${dataType}.xlsx`);
        break;
    }
  };
  
  if (isLoading) {
    return (
      <div className="relative border rounded">
        <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
          <h3 className="text-base font-medium">{displayName}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center" style={{ height: '300px' }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="relative border rounded">
        <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
          <h3 className="text-base font-medium">{displayName}</h3>
        </div>
        <div className="p-4 text-center text-red-500" style={{ height: '300px' }}>
          Error loading data. Please try again.
        </div>
      </div>
    );
  }
  
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="relative border rounded">
        <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
          <h3 className="text-base font-medium">{displayName}</h3>
        </div>
        <div className="p-4 text-center text-gray-500" style={{ height: '300px' }}>
          No data available to display
        </div>
      </div>
    );
  }
  
  // Get total for each row to sort by
  const rowsWithTotals = data.rows.map(row => {
    const total = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, total };
  });
  
  // Sort rows by total in descending order
  const sortedRows = rowsWithTotals
    .sort((a, b) => b.total - a.total)
    .map(item => item.row);
  
  // Use the global getPatientName helper function
  
  const tableMaxHeight = compact ? 300 : 500;
  
  return (
    <div className="relative border rounded">
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
        <div>
          <h3 className="text-base font-medium">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {dataType === 'hrsn' 
              ? 'Health-Related Social Needs Indicators' 
              : dataType === 'category' 
                ? 'Diagnostic Categories'
                : dataType === 'diagnosis'
                  ? 'Diagnoses'
                  : 'Symptoms'
            }
          </p>
        </div>
        
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => handleDownload('excel')}>
            Export Grid
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
            Export PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={tableRef}
        className="overflow-auto p-0"
        style={{ maxHeight: tableMaxHeight }}
      >
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border"
              >
                {displayName}
              </th>
              {data.columns.map((column, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRows.map((row, rowIdx) => {
              // Calculate total for this row
              const rowTotal = data.columns.reduce(
                (acc, col) => acc + (data.data[row]?.[col] || 0), 
                0
              );
              
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-sm text-gray-900 border">
                    {rowIdx + 1}. {row} ({rowTotal})
                  </td>
                  {data.columns.map((column, colIdx) => {
                    const value = data.data[row]?.[column] || 0;
                    return (
                      <td 
                        key={colIdx} 
                        className="px-3 py-2 text-sm text-center border" 
                        style={{ 
                          backgroundColor: value > 0 ? 'rgba(79, 129, 189, 0.1)' : undefined,
                          fontWeight: value > 0 ? 'bold' : undefined
                        }}
                      >
                        {value > 0 ? value : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{displayName} - {getPatientName(patientId)}</DialogTitle>
          </DialogHeader>
          <div className="p-2 bg-slate-50 border-b mb-4">
            <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
            <p className="text-sm text-gray-500">
              Full table of all {displayName.toLowerCase()} for patient {patientId}.
            </p>
          </div>
          <div className="flex-1 overflow-auto min-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border"
                  >
                    {displayName}
                  </th>
                  {data.columns.map((column, idx) => (
                    <th
                      key={idx}
                      scope="col"
                      className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRows.map((row, rowIdx) => {
                  // Calculate total for this row
                  const rowTotal = data.columns.reduce(
                    (acc, col) => acc + (data.data[row]?.[col] || 0), 
                    0
                  );
                  
                  return (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-sm text-gray-900 border">
                        {rowIdx + 1}. {row} ({rowTotal})
                      </td>
                      {data.columns.map((column, colIdx) => {
                        const value = data.data[row]?.[column] || 0;
                        return (
                          <td 
                            key={colIdx} 
                            className="px-3 py-2 text-sm text-center border" 
                            style={{ 
                              backgroundColor: value > 0 ? 'rgba(79, 129, 189, 0.1)' : undefined,
                              fontWeight: value > 0 ? 'bold' : undefined
                            }}
                          >
                            {value > 0 ? value : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: string | number): string => {
  console.log("🔍 Global getPatientName called with:", patientId, "type:", typeof patientId);
  const storedPatientName = sessionStorage.getItem('selectedPatientName');
  console.log("🔍 Session storage contains patient name:", storedPatientName);
  
  // If we have a stored patient name, use it
  if (storedPatientName) {
    return storedPatientName;
  }
  
  // Otherwise, use the Bob Test format as a fallback
  return `Bob Test${patientId}`;
};

// Main component that displays all four pivot tables in a grid layout
export default function DirectGridView() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [location, setLocation] = useLocation();
  const storedPatientId = sessionStorage.getItem('selectedPatientId');
  console.log("Retrieved from sessionStorage in grid view:", storedPatientId);
  
  // PRIORITIZE sessionStorage over URL parameters for consistency
  const patientToDisplay = storedPatientId || patientId || '1018';
  console.log("Using patient ID for grid view:", patientToDisplay, "type:", typeof patientToDisplay);
  
  // Update the URL when the component loads to ensure it has patientId
  useEffect(() => {
    if (!patientId) {
      setLocation(`/direct-grid-view/${patientToDisplay}`);
    }
    
    // Force refresh sessionStorage value if needed for consistency across views
    if (storedPatientId !== patientToDisplay) {
      console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
      sessionStorage.setItem('selectedPatientId', patientToDisplay);
    }
  }, [patientId, patientToDisplay, setLocation, storedPatientId]);
  
  // Datata types to display
  const dataTypes = ['symptom', 'diagnosis', 'category', 'hrsn'];
  
  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient: {getPatientName(patientToDisplay)} ID#: P{String(patientToDisplay).padStart(4, '0')}
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through pivot tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/scatter-view/${patientToDisplay}`)}
              >
                View Bubble Chart
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/heatmap-view/${patientToDisplay}`)}
              >
                View Heatmaps
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four pivot tables in a 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataTypes.map((type) => (
              <PivotTableSection 
                key={type} 
                dataType={type} 
                patientId={patientToDisplay}
                compact={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}