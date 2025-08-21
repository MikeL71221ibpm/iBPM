import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUpRight, FileText, Calendar, Stethoscope, ClipboardList } from "lucide-react";
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
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';

// Helper function to get patient name based on ID
const getPatientName = (patientId: number): string => {
  const storedName = sessionStorage.getItem('selectedPatientName');
  if (storedName) {
    console.log("Using patient name from sessionStorage:", storedName);
    return storedName;
  }
  return `Patient ${patientId}`;
};

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

// Patient statistics interface
interface PatientStats {
  patientId: number;
  noteCount: number;
  uniqueDatesCount: number;
  symptomCount: number;
  diagnosisCount: number;
  firstNoteDate: string;
  lastNoteDate: string;
  timeframeDisplay: string;
}

// Data types for visualization
const DATA_TYPES = [
  { id: "hrsn", label: "HRSN Indicators", icon: FileText },
  { id: "symptom", label: "Symptoms", icon: Stethoscope },
  { id: "diagnosis", label: "Diagnoses", icon: ClipboardList },
  { id: "category", label: "Diagnostic Categories", icon: Calendar }
];

// Patient statistics component
const PatientStatsSection: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { data: stats, isLoading, error } = useQuery<PatientStats>({
    queryKey: [`/api/patient-stats/${patientId}`],
    enabled: !!patientId
  });

  if (isLoading) {
    return (
      <div className="mb-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading patient statistics...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mb-4 p-4 border rounded-lg bg-red-50">
        <p className="text-sm text-red-600">Unable to load patient statistics</p>
      </div>
    );
  }

  return (
    <div className="mb-3 p-2 border rounded-lg bg-blue-50">
      <h3 className="text-sm font-medium text-gray-900 mb-1">Patient Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Notes Reviewed:</span>
          <div className="font-medium">{stats.uniqueDatesCount} sessions</div>
        </div>
        <div>
          <span className="text-gray-600">Timeframe:</span>
          <div className="font-medium">{stats.timeframeDisplay}</div>
        </div>
        <div>
          <span className="text-gray-600">Symptoms Extracted:</span>
          <div className="font-medium">{stats.symptomCount}</div>
        </div>
        <div>
          <span className="text-gray-600">Diagnoses Found:</span>
          <div className="font-medium">{stats.diagnosisCount}</div>
        </div>
      </div>
    </div>
  );
};

// Copy the exact HardCodedPivot implementation from all-pivots-page.tsx
const HardCodedPivot: React.FC<{
  data?: PivotData;
  dataType: string;
  compact?: boolean;
  fitToPage?: boolean;
  patientId: string;
}> = ({ data, dataType, compact = false, fitToPage = false, patientId }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableRef.current || !data || !data.rows || !data.columns) return;

    // Clear previous content
    tableRef.current.innerHTML = '';

    // Skip rows with no data
    const rowsWithData = data.rows.filter(row => {
      const rowData = data.data[row];
      return rowData && Object.values(rowData).some(value => value > 0);
    });

    if (rowsWithData.length === 0) {
      const noDataEl = document.createElement('div');
      noDataEl.textContent = 'No data available for this visualization.';
      noDataEl.style.textAlign = 'center';
      noDataEl.style.padding = '20px';
      noDataEl.style.color = '#6b7280';
      tableRef.current.appendChild(noDataEl);
      return;
    }

    // Calculate total frequency for each row and sort
    const sortedRows = rowsWithData.map(row => {
      const rowData = data.data[row];
      const sum = Object.values(rowData || {}).reduce((total, value) => total + (value || 0), 0);
      return { row, sum };
    }).sort((a, b) => b.sum - a.sum);

    // Limit rows for compact mode
    const MAX_ROWS = compact ? 50 : (fitToPage ? sortedRows.length : 100);
    const topRows = sortedRows.slice(0, MAX_ROWS);

    // Create styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .hard-coded-table-container {
        font-family: ui-sans-serif, system-ui;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background-color: white;
        position: relative;
        ${compact ? 'max-height: 280px;' : ''}
        overflow: hidden;
      }
      
      .hard-coded-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
        ${fitToPage ? 'font-size: 9px;' : (compact ? 'font-size: 8px;' : 'font-size: 10px;')}
      }
      
      .sticky-col {
        position: sticky !important;
        left: 0 !important;
        z-index: 10 !important;
        background-color: #fafafa !important;
        border-right: 1px solid #e5e7eb !important;
        padding: ${compact ? '1px 2px' : '2px 4px'} !important;
        text-align: left !important;
        font-size: ${compact ? '8px' : '9px'} !important;
        width: ${fitToPage ? '200px' : (compact ? '120px' : '150px')} !important;
        min-width: ${fitToPage ? '200px' : (compact ? '120px' : '150px')} !important;
        max-width: ${fitToPage ? '200px' : (compact ? '120px' : '150px')} !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      
      .sticky-col.frequency-2 {
        background-color: #dbeafe !important;
        color: #1e40af !important;
        font-weight: 500 !important;
      }
      
      .sticky-col.frequency-3 {
        background-color: #fef3c7 !important;
        color: #92400e !important;
        font-weight: 600 !important;
      }
      
      .sticky-col.frequency-4 {
        background-color: #fed7aa !important;
        color: #9a3412 !important;
        font-weight: 600 !important;
      }
      
      .sticky-col.frequency-5-plus {
        background-color: #fecaca !important;
        color: #991b1b !important;
        font-weight: bold !important;
      }
      
      .data-cell.frequency-2 {
        background-color: #dbeafe !important;
      }
      
      .data-cell.frequency-3 {
        background-color: #fef3c7 !important;
      }
      
      .data-cell.frequency-4 {
        background-color: #fed7aa !important;
      }
      
      .data-cell.frequency-5-plus {
        background-color: #fecaca !important;
      }
      
      .data-cell {
        border: 1px solid #e5e7eb;
        text-align: center;
        width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')};
        min-width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')};
        height: 12px;
        font-size: 8px;
      }
      
      .date-row {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        background-color: white !important;
        box-shadow: 0 -2px 4px rgba(0,0,0,0.1) !important;
      }
      
      .date-cell {
        position: relative !important;
        width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')} !important;
        min-width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')} !important;
        padding: 0 !important;
        border: none !important;
        background-color: white !important;
        height: 12px !important;
      }
      
      .date-label {
        position: absolute !important;
        transform: rotate(45deg) !important;
        transform-origin: bottom left !important;
        left: 4px !important;
        bottom: 2px !important;
        font-size: ${compact ? '7px' : '9px'} !important;
        white-space: nowrap !important;
        font-weight: 500 !important;
        color: #4b5563 !important;
      }
    `;
    tableRef.current.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.className = 'hard-coded-table-container';
    
    container.style.overflowY = 'auto';
    container.style.overflowX = 'auto';
    
    if (fitToPage) {
      container.style.height = 'auto';
      container.style.maxHeight = 'none';
      container.style.minHeight = 'fit-content';
      container.style.setProperty('height', 'auto', 'important');
      container.style.setProperty('max-height', 'none', 'important');
      container.style.setProperty('min-height', 'fit-content', 'important');
    }
    container.style.width = '100%';
    container.style.minWidth = 'fit-content';
    
    tableRef.current.appendChild(container);

    // Create table
    const table = document.createElement('table');
    table.className = 'hard-coded-table';
    table.style.width = 'max-content';
    table.style.minWidth = '100%';
    
    if (fitToPage) {
      table.style.height = 'auto';
      table.style.tableLayout = 'auto';
    }
    
    container.appendChild(table);

    if (fitToPage) {
      container.classList.add('fit-to-page');
    } else {
      container.classList.remove('fit-to-page');
    }

    // Create table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Add rows
    topRows.forEach(({row, sum}, rowIndex) => {
      const tr = document.createElement('tr');
      
      // Add row header (first column) with total count and color coding
      const firstCell = document.createElement('td');
      const totalCount = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
      
      // Apply color coding based on total count
      let cellClass = 'sticky-col';
      let rowFrequencyClass = '';
      if (totalCount === 2) {
        cellClass += ' frequency-2';
        rowFrequencyClass = 'frequency-2';
      } else if (totalCount === 3) {
        cellClass += ' frequency-3';
        rowFrequencyClass = 'frequency-3';
      } else if (totalCount === 4) {
        cellClass += ' frequency-4';
        rowFrequencyClass = 'frequency-4';
      } else if (totalCount >= 5) {
        cellClass += ' frequency-5-plus';
        rowFrequencyClass = 'frequency-5-plus';
      }
      
      firstCell.className = cellClass;
      firstCell.textContent = `${rowIndex + 1}. ${row} (${totalCount})`;
      firstCell.title = row; // Add tooltip for accessibility
      tr.appendChild(firstCell);
      
      // Add data cells with color coding matching the row
      data.columns.forEach(column => {
        const valueStr = data.data[row]?.[column] || '0';
        const value = parseInt(valueStr.toString());
        const td = document.createElement('td');
        
        // Apply row color theme to data cells
        let dataCellClass = 'data-cell';
        if (rowFrequencyClass && value > 0) {
          dataCellClass += ` ${rowFrequencyClass}`;
        }
        
        td.className = dataCellClass;
        td.textContent = value > 0 ? value.toString() : '';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    // Add date row to the table
    const dateRow = document.createElement('tr');
    dateRow.className = 'date-row';
    
    // Add an empty cell for the first column
    const emptyCell = document.createElement('td');
    emptyCell.className = 'sticky-col';
    emptyCell.style.height = '12px';
    emptyCell.style.backgroundColor = 'white';
    emptyCell.textContent = "Date →";
    emptyCell.style.fontWeight = 'bold';
    emptyCell.style.fontSize = '8px';
    emptyCell.style.color = '#374151';
    dateRow.appendChild(emptyCell);
    
    // Add date cells
    data.columns.forEach((column) => {
      const dateCell = document.createElement('td');
      dateCell.className = 'date-cell';
      
      const dateLabel = document.createElement('span');
      dateLabel.className = 'date-label';
      dateLabel.textContent = column;
      dateCell.appendChild(dateLabel);
      
      dateRow.appendChild(dateCell);
    });
    
    tbody.appendChild(dateRow);

  }, [data, dataType, compact, fitToPage, patientId]);

  return <div ref={tableRef} />;
};

// Individual pivot section component
const PivotSection: React.FC<{
  dataType: string;
  patientId: string;
}> = ({ dataType, patientId }) => {
  const [fitToPage, setFitToPage] = useState(false);
  
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.label || dataType;
  const Icon = DATA_TYPES.find(type => type.id === dataType)?.icon || FileText;
  
  // Fix the API endpoint for diagnostic categories
  const apiEndpoint = dataType === 'category' ? `/api/pivot/diagnostic-category/${patientId}` : `/api/pivot/${dataType}/${patientId}`;
  
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [apiEndpoint],
    enabled: !!patientId
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {displayName}
          {data?.rows && ` (${data.rows.length})`}
        </h3>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowUpRight className="h-4 w-4" />
              <span className="sr-only">Expand {displayName}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className={fitToPage ? "w-[98vw] h-auto max-w-[98vw] p-2 m-0 overflow-visible fit-to-page" : "fullpage-dialog"}>
            {!fitToPage && (
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
                  <span>Complete {displayName} Data</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFitToPage(!fitToPage)}
                    className="ml-4 mr-8"
                  >
                    Fit to Screen
                  </Button>
                </DialogTitle>
              </DialogHeader>
            )}
            {fitToPage && (
              <DialogHeader className="flex-shrink-0 p-1">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-sm font-bold text-gray-900">
                    {displayName} - Fit to Screen Mode
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFitToPage(!fitToPage)}
                    className="ml-4 mr-8"
                  >
                    Fit to Screen
                  </Button>
                </div>
              </DialogHeader>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                Error loading {displayName.toLowerCase()} data. Please try again.
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {!fitToPage && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-900">
                      Complete {displayName} Data
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Showing all {data?.rows?.length || 0} items sorted by total frequency across all dates. 
                      Items are ranked 1-N with #1 being the most frequent overall.
                    </p>
                  </div>
                )}
                
                <div className={fitToPage ? "pivot-content h-auto flex-1" : "pivot-content"}>
                  <HardCodedPivot 
                    data={data} 
                    dataType={dataType}
                    compact={false}
                    fitToPage={fitToPage}
                    patientId={patientId}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data
          </div>
        ) : (
          <div className="mt-1" style={{ 
            height: '300px',
            overflowY: 'scroll',
            overflowX: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '4px'
          }}>
            <HardCodedPivot 
              data={data} 
              dataType={dataType}
              compact={true}
              patientId={patientId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Main component - displays all four pivot tables in a grid layout
export default function Heatmaps2Page() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [location, setLocation] = useLocation();
  
  const storedPatientId = sessionStorage.getItem('selectedPatientId');
  console.log("Retrieved from sessionStorage in heatmaps2 view:", storedPatientId);
  
  const patientToDisplay = storedPatientId || patientId || '1';
  console.log("Using patient ID for heatmaps2 view:", patientToDisplay, typeof patientToDisplay);
  
  if (storedPatientId !== patientToDisplay) {
    console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
    sessionStorage.setItem('selectedPatientId', patientToDisplay);
  }
  
  useEffect(() => {
    if (!patientId) {
      setLocation(`/heatmaps2/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-4">
      <DatabaseStatsWidget />
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription className="text-sm">
            Interactive pivot table visualization showing dates across columns and items down rows. Click the expand icon on any section to see more details.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <PatientStatsSection patientId={patientToDisplay} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <PivotSection 
                key={type.id} 
                dataType={type.id} 
                patientId={patientToDisplay}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}