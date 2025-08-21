import React, { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// Import standardized patient session utility functions
import { 
  setPatientIdInSession,
  getPatientIdFromSession,
  getPatientNameFromSession,
  getPatientIdentifier
} from "@/utils/patient-session-controlling-file-05_12_25";

// Define the parameters type
interface PatientVisualizationParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Nivo heatmap requires data in a specific format
interface CellData {
  id: string;
  [key: string]: any; // To allow for dynamic column keys
}

// All data types to display in order
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Helper function to get Iridis purple-green-yellow-red color scale
const getIridisColor = (value: number, maxValue: number): string => {
  if (value === 0) return "#ffffff"; // White for zero values
  
  // Define colors in Iridis scale from lowest to highest
  const colors = [
    "#dbeafe", // Light blue for lowest values
    "#c7d2fe", // Lavender 
    "#a5b4fc", // Purple
    "#99f6e4", // Mint green
    "#86efac", // Light green
    "#fef08a", // Yellow
    "#fca5a5", // Light red
    "#f87171"  // Bright red for highest values
  ];
  
  // Calculate normalized value between 0 and 1
  const normalizedValue = value / maxValue;
  
  // Map to color index
  const colorIndex = Math.min(
    Math.floor(normalizedValue * colors.length),
    colors.length - 1
  );
  
  return colors[colorIndex];
};

// Format pivot data for Nivo heatmap
const formatForNivoHeatmap = (
  pivotData: PivotData | undefined, 
  maxRowsToShow: number = 30
): { data: CellData[]; maxValue: number } => {
  if (!pivotData || !pivotData.rows || !pivotData.columns) {
    return { data: [], maxValue: 0 };
  }
  
  // Process all rows to calculate sums
  const rowsWithSums = pivotData.rows.map(row => {
    const sum = pivotData.columns.reduce(
      (acc, col) => acc + (pivotData.data[row]?.[col] || 0), 
      0
    );
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top rows based on maxRowsToShow
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, maxRowsToShow)
    .map((item) => item.row);
  
  // Find the maximum value for scaling the colors
  let maxValue = 0;
  topRows.forEach(row => {
    pivotData.columns.forEach(col => {
      const value = pivotData.data[row]?.[col] || 0;
      maxValue = Math.max(maxValue, value);
    });
  });
  
  // Format data for Nivo heatmap - create objects with dynamic keys
  const nivoData = topRows.map(row => {
    // Create an object with id + dynamic properties for each column
    const rowObj: CellData = {
      id: `${topRows.indexOf(row) + 1}. ${row}`
    };
    
    // Add the total count
    const totalCount = pivotData.columns.reduce(
      (acc, col) => acc + (pivotData.data[row]?.[col] || 0), 
      0
    );
    
    // Update the id to include total count
    rowObj.id = `${rowObj.id} (${totalCount})`;
    
    // Add each column value as a property
    pivotData.columns.forEach(col => {
      rowObj[col] = pivotData.data[row]?.[col] || 0;
    });
    
    return rowObj;
  });
  
  return { data: nivoData, maxValue };
};

// Converts the pivot data to an Excel workbook
const createExcelWorkbook = (data: PivotData | undefined, title: string): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  
  if (!data || !data.rows || !data.columns) {
    // Create an empty worksheet if no data
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, title);
    return wb;
  }
  
  // Process rows with their sums for sorting
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Sort by sum (descending)
  const sortedRows = rowsWithSums.sort((a, b) => b.sum - a.sum).map(item => item.row);
  
  // Create header row with empty first cell + date columns
  const headers = ['Item', ...data.columns];
  
  // Create data rows
  const rows = sortedRows.map((row, index) => {
    // First column: index + name + total count
    const totalCount = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    const firstCol = `${index + 1}. ${row} (${totalCount})`;
    
    // Data cells
    const values = data.columns.map(col => data.data[row]?.[col] || 0);
    
    return [firstCol, ...values];
  });
  
  // Create worksheet and append to workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const columnWidths = [
    { wch: 50 }, // First column width for item names
    ...data.columns.map(() => ({ wch: 12 })) // Date column widths
  ];
  ws['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, title);
  return wb;
};

// Component for individual heatmap section
const HeatmapSection = ({ 
  dataType, 
  patientId, 
  compact = false 
}: { 
  dataType: string; 
  patientId: string; 
  compact?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  
  // Endpoint for the data type
  const apiPath = dataType === 'category' ? 'diagnostic-category' : dataType;
  const endpoint = `/api/pivot/${apiPath}/${patientId}`;
  
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: true,
  });
  
  // Show all rows in both views
  const maxRowsToShow = 9999;
  
  // Format data for Nivo heatmap
  const { data: nivoData, maxValue } = formatForNivoHeatmap(data, maxRowsToShow);
  
  // Calculate height based on number of rows
  const chartHeight = compact 
    ? (dataType === 'hrsn' ? 200 : 400)
    : 600;
  
  // Handle downloads
  const handleDownload = (format: 'pdf' | 'png' | 'excel') => {
    if (!chartRef.current || !data) return;
    
    switch (format) {
      case 'pdf':
        html2canvas(chartRef.current, { 
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
        
      case 'png':
        html2canvas(chartRef.current, { 
          scale: 3, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `patient-${patientId}-${dataType}.png`;
          link.href = imgData;
          link.click();
        });
        break;
        
      case 'excel':
        const wb = createExcelWorkbook(data, displayName);
        XLSX.writeFile(wb, `patient-${patientId}-${dataType}.xlsx`);
        break;
    }
  };
  
  // Helper function for patient name using standardized utility
  const getPatientName = (id: string | number): string => {
    return getPatientIdentifier(id);
  };
  
  return (
    <div className="relative border rounded">
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
        <div>
          <h3 className="text-base font-medium">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {dataType === 'hrsn' 
              ? 'All 10 HRSN indicators (scrollable)' 
              : dataType === 'category' 
                ? 'All 34 categories (scrollable)'
                : dataType === 'diagnosis'
                  ? 'All 79 diagnoses (scrollable)'
                  : 'All 99 symptoms (scrollable)'
            }
          </p>
        </div>
        
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => handleDownload('excel')}>
            Export Grid
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleDownload('pdf')}>
            Export PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleDownload('png')}>
            Export PNG
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={chartRef}
        className="p-4 overflow-auto"
        style={{ 
          height: chartHeight, 
          maxHeight: chartHeight 
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            Error loading data. Please try again.
          </div>
        ) : nivoData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No data available to display
          </div>
        ) : (
          <ResponsiveHeatMap
            data={nivoData}
            margin={{ top: 10, right: 10, bottom: 50, left: 220 }}
            valueFormat={value => value === 0 ? '' : value.toString()} // Hide zeros
            indexBy="id"
            keys={data?.columns || []}
            cellOpacity={1}
            cellHeight={25}
            cellBorderWidth={1}
            cellBorderColor="#ffffff"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 36
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: '',
              legendPosition: 'middle',
              legendOffset: -40
            }}
            colors={(cell) => {
              // Get the value from the cell
              const value = cell.value as number;
              // Return transparent for zero values (effectively hiding them)
              if (value === 0) return 'transparent';
              return getIridisColor(value, maxValue);
            }}
            emptyColor="#ffffff"
            enableLabels={true}
            labelTextColor={(cell) => {
              const value = cell.value as number;
              // No text for zero values
              if (value === 0) return 'transparent';
              
              // Use white text for darker cells, black for lighter cells
              const threshold = maxValue * 0.5;
              return value > threshold ? '#ffffff' : '#333333';
            }}
            hoverTarget="cell"
            animate={false}
            theme={{
              axis: {
                ticks: {
                  text: {
                    fontSize: compact ? 8 : 10,
                  }
                },
                legend: {
                  text: {
                    fontSize: compact ? 10 : 12,
                    fontWeight: 'bold'
                  }
                }
              },
              labels: {
                text: {
                  fontSize: compact ? 9 : 11,
                }
              }
            }}
          />
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{displayName} - {getPatientIdentifier(patientId)}</DialogTitle>
          </DialogHeader>
          <div className="p-2 bg-slate-50 border-b mb-4">
            <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
            <p className="text-sm text-gray-500">
              Full visualization of all {displayName.toLowerCase()} for patient {patientId}.
            </p>
          </div>
          <div className="flex-1 overflow-auto" style={{ minHeight: '500px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">
                Error loading data. Please try again.
              </div>
            ) : nivoData.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No data available to display
              </div>
            ) : (
              <ResponsiveHeatMap
                data={nivoData}
                margin={{ top: 20, right: 20, bottom: 60, left: 220 }}
                valueFormat={value => value === 0 ? '' : value.toString()} // Hide zeros
                indexBy="id"
                keys={data?.columns || []}
                cellOpacity={1}
                cellHeight={30}
                cellBorderWidth={1}
                cellBorderColor="#ffffff"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Date',
                  legendPosition: 'middle',
                  legendOffset: 36
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: displayName,
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                colors={(cell) => {
                  // Get the value from the cell
                  const value = cell.value as number;
                  // Return transparent for zero values (effectively hiding them)
                  if (value === 0) return 'transparent';
                  return getIridisColor(value, maxValue);
                }}
                emptyColor="#ffffff"
                enableLabels={true}
                labelTextColor={(cell) => {
                  const value = cell.value as number;
                  // No text for zero values
                  if (value === 0) return 'transparent';
                  
                  // Use white text for darker cells, black for lighter cells
                  const threshold = maxValue * 0.5;
                  return value > threshold ? '#ffffff' : '#333333';
                }}
                hoverTarget="cell"
                animate={false}
                theme={{
                  axis: {
                    ticks: {
                      text: {
                        fontSize: 10,
                      }
                    },
                    legend: {
                      text: {
                        fontSize: 12,
                        fontWeight: 'bold'
                      }
                    }
                  },
                  labels: {
                    text: {
                      fontSize: 11,
                    }
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to get a patient name based on ID (using standardized utility)
const getPatientName = (patientId: string | number): string => {
  // Use our standardized formatted patient name utility
  return getPatientIdentifier(patientId);
};

// Main component - displays all four heatmaps in a grid layout
export default function HeatmapView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/heatmap-view/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              {getPatientIdentifier(patientToDisplay)}
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through heatmap visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <Button variant="outline" className="bg-gray-100" onClick={() => setPatientIdInSession(patientToDisplay)}>
                Set Session ID
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/pivot-view/${patientToDisplay}`)}
              >
                View Pivot Tables
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/scatter-view/${patientToDisplay}`)}
              >
                View Bubble Chart
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four heatmaps in a 2x2 grid - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <HeatmapSection 
                key={type.id} 
                dataType={type.id} 
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