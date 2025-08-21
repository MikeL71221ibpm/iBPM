// Last updated: May 10, 2025 - Fixed forEach error
// Controls route: /nivo-heatmap-view-fixed

import React, { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowUpRight
} from "lucide-react";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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

// All data types to display in order
const DATA_TYPES = [
  { id: 'symptom', label: 'Symptoms', endpoint: '/api/pivot/symptom/' },
  { id: 'diagnosis', label: 'Diagnoses', endpoint: '/api/pivot/diagnosis/' },
  { id: 'category', label: 'Diagnostic Categories', endpoint: '/api/pivot/diagnostic-category/' },
  { id: 'hrsn', label: 'HRSN Indicators', endpoint: '/api/pivot/hrsn/' },
];

// Color schemes
const getIridisColor = (value: number, max: number): string => {
  // Calculate percentage
  const pct = Math.min(100, Math.floor((value / max) * 100));
  
  // Colors from iridis color scheme (purple to teal)
  const colors = [
    '#f7fcfd', '#e0ecf4', '#bfd3e6', '#9ebcda', '#8c96c6',
    '#8c6bb1', '#88419d', '#810f7c', '#4d004b'
  ];
  
  // Map percentage to color index
  const colorIndex = Math.min(
    colors.length - 1, 
    Math.floor((pct / 100) * colors.length)
  );
  
  return colors[colorIndex];
};

// Component for empty state
const EmptyHeatmap = ({ message = "No data available" }: { message?: string }) => (
  <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-lg p-8">
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-500">{message}</h3>
      <p className="text-sm text-gray-400 mt-2">Check your data source or selection criteria.</p>
    </div>
  </div>
);

// Format pivot data for Nivo heatmap
const formatForNivoHeatmap = (
  pivotData: PivotData | undefined, 
  maxRowsToShow: number = 30
): { data: any[]; maxValue: number } => {
  // Safety check - return empty data if no pivot data
  if (!pivotData || !pivotData.rows || !pivotData.columns || !pivotData.data) {
    return { 
      data: [], 
      maxValue: 0 
    };
  }
  
  // Process all rows to calculate sums
  const rowsWithSums = pivotData.rows.map(row => {
    let sum = 0;
    // Safely calculate sum with null checks
    if (pivotData.data[row]) {
      for (const col of pivotData.columns) {
        if (pivotData.data[row][col]) {
          sum += pivotData.data[row][col];
        }
      }
    }
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top rows based on maxRowsToShow
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, maxRowsToShow)
    .map(item => item.row);

  // Format the data for Nivo heatmap, with one object per row
  const result = [];
  let maxValue = 0;
  
  // Only process if we have rows and columns
  if (topRows.length > 0 && pivotData.columns.length > 0) {
    for (const row of topRows) {
      if (!pivotData.data[row]) continue;
      
      // Create a data object for this row
      const rowData = { id: row };
      
      // Fill with values from each column
      for (const col of pivotData.columns) {
        const value = pivotData.data[row][col] || 0;
        rowData[col] = value;
        // Keep track of max value for the color scale
        if (value > maxValue) maxValue = value;
      }
      
      result.push(rowData);
    }
  }
  
  return { data: result, maxValue };
};

// Convert workbook to Excel file and trigger download
const downloadExcel = (
  wb: XLSX.WorkBook, 
  filename: string = 'heatmap-data.xlsx'
) => {
  XLSX.writeFile(wb, filename);
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
    refetchOnWindowFocus: false,
  });
  
  // Maximum rows to show in the heatmap
  const maxRowsToShow = dataType === 'hrsn' ? 20 : 
    (dataType === 'category' ? 35 : 
      (compact ? 15 : 50));
  
  // Format data for the Nivo heatmap component
  const { data: nivoData, maxValue } = formatForNivoHeatmap(data, maxRowsToShow);
  
  // Calculate height based on number of rows
  const chartHeight = compact 
    ? (dataType === 'hrsn' ? 200 : 400)
    : 600;
  
  // Handle downloads
  const handleDownload = (format: 'pdf' | 'png' | 'excel') => {
    if (!chartRef.current || !data) return;
    
    const title = `${displayName} for Patient ${patientId}`;
    
    if (format === 'excel') {
      // Create Excel workbook from the data
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(nivoData);
      XLSX.utils.book_append_sheet(wb, ws, title);
      downloadExcel(wb, `${displayName.replace(/\s+/g, '-')}-Patient-${patientId}.xlsx`);
    } else {
      // Render as image and download
      html2canvas(chartRef.current).then(canvas => {
        if (format === 'png') {
          // Download as PNG
          const link = document.createElement('a');
          link.download = `${displayName.replace(/\s+/g, '-')}-Patient-${patientId}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } else if (format === 'pdf') {
          // Download as PDF
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
          });
          
          // Add title
          pdf.setFontSize(16);
          pdf.text(title, 14, 15);
          
          // Calculate PDF dimensions to maintain aspect ratio
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          // Add the image
          pdf.addImage(imgData, 'PNG', 10, 20, pdfWidth - 20, pdfHeight - 10);
          pdf.save(`${displayName.replace(/\s+/g, '-')}-Patient-${patientId}.pdf`);
        }
      });
    }
  };
  
  // Show card with the heatmap
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{displayName}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setOpen(true)}
            className="ml-auto"
          >
            <ArrowUpRight className="w-4 h-4 mr-1" />
            Expand
          </Button>
        </CardTitle>
        <CardDescription>
          Showing top {maxRowsToShow} items by frequency
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <EmptyHeatmap message="Error loading data" />
        ) : nivoData.length === 0 ? (
          <EmptyHeatmap />
        ) : (
          <div 
            style={{ height: chartHeight, width: '100%' }} 
            ref={chartRef}
          >
            <HeatmapVisualization data={nivoData} maxValue={maxValue} compact={compact} />
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-10 z-50 bg-background shadow-lg rounded-lg flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {displayName} for Patient {patientId}
                </h2>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDownload('pdf')}
                  >
                    Download PDF
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDownload('png')}
                  >
                    Download PNG
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDownload('excel')}
                  >
                    Download Excel
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              <div 
                className="flex-1 overflow-auto" 
                style={{ 
                  height: '75vh',
                  maxHeight: '75vh'
                }}
                ref={chartRef}
              >
                <div style={{
                  height: Math.max(25 * nivoData.length, 
                    dataType === 'hrsn' ? 400 : (
                      dataType === 'category' ? 1000 : (
                        dataType === 'diagnosis' ? 2000 : 2500
                      )
                    )
                  ) + 'px',
                  minHeight: '600px',
                  width: '100%'
                }}>
                  <HeatmapVisualization 
                    data={nivoData} 
                    maxValue={maxValue}
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Visualization component
const HeatmapVisualization = ({ 
  data, 
  maxValue, 
  compact = false 
}: { 
  data: any[]; 
  maxValue: number; 
  compact?: boolean 
}) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <EmptyHeatmap message="No data available" />;
  }

  // Calculate margins and sizes based on compact mode
  const margin = compact 
    ? { top: 10, right: 20, bottom: 60, left: 180 } 
    : { top: 15, right: 40, bottom: 90, left: 220 };
  
  const cellHeight = compact ? 20 : 30;
  const titleRotation = -45;
  
  // Get column keys (all properties except 'id')
  const keys = Object.keys(data[0]).filter(key => key !== 'id');
  
  if (keys.length === 0) {
    return <EmptyHeatmap message="No data points available" />;
  }
  
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ResponsiveHeatMap
        data={data}
        keys={keys}
        indexBy="id"
        margin={margin}
        forceSquare={false}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: titleRotation,
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
        cellOpacity={1}
        cellBorderWidth={1}
        cellBorderColor="#ffffff"
        labelTextColor={(cell) => {
          if (!cell || cell.value === undefined || cell.value === null) return 'transparent';
          const value = cell.value as number;
          if (value === 0) return 'transparent';
          const threshold = maxValue * 0.5;
          return value > threshold ? '#ffffff' : '#333333';
        }}
        hoverTarget="cell"
        cellHeight={cellHeight}
        colors={(cell) => {
          if (!cell || cell.value === undefined || cell.value === null) return 'transparent';
          const value = cell.value as number;
          if (value === 0) return 'transparent';
          return getIridisColor(value, maxValue);
        }}
        emptyColor="#ffffff"
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
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  // For this application, we'll use "Bob Test" followed by the ID number
  return `Bob Test${patientId}`;
};

// Main component - displays all four heatmaps in a grid layout
export default function NivoHeatmapView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-heatmap-view-fixed/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through heatmap visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
              >
                View Pivot Tables
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