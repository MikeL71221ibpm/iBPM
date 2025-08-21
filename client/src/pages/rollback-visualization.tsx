import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import "../styles/date-labels.css";

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
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "diagnostic-category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Function to get color class based on value
const getColor = (value: number, max: number = 10) => {
  if (value === 0) return "bg-gray-50";
  const normalizedValue = Math.min(value, max) / max;
  
  // Using viridis-inspired color palette (blue-green-yellow)
  if (normalizedValue < 0.2) return "bg-blue-100 text-blue-800";
  if (normalizedValue < 0.4) return "bg-blue-200 text-blue-800";
  if (normalizedValue < 0.6) return "bg-teal-200 text-teal-800";
  if (normalizedValue < 0.8) return "bg-green-200 text-green-800";
  return "bg-yellow-200 text-yellow-800";
};

// Component for displaying heatmap visualization
const HeatmapVisualization = ({ data, title }: { data: PivotData | undefined, title: string }) => {
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  // Filter to top 25 rows with highest sums for better visualization
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, originalRow: row, sum };
  });
  
  // Sort by sum (descending) and take top 25
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 25);

  // Generate a unique ID for this table
  const tableId = `heatmap-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Custom styles for this specific table
  const customStyles = `
    #${tableId} {
      border-collapse: collapse;
      width: auto;
      overflow-x: auto;
    }
    
    #${tableId} td {
      position: relative;
      padding: 0;
    }
    
    #${tableId} .date-label {
      position: absolute;
      transform: rotate(45deg);
      transform-origin: bottom left;
      left: 8px;
      bottom: 5px;
      font-size: 10px;
      white-space: nowrap;
      font-weight: 600;
    }
    
    #${tableId} .cell-sticky {
      position: sticky;
      left: 0;
      z-index: 10;
      background-color: white;
    }
    
    #${tableId}-container {
      overflow-x: auto;
      max-width: 100%;
    }
  `;

  return (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <style>{customStyles}</style>
        <div id={`${tableId}-container`}>
          <table id={tableId} className="w-auto">
            <colgroup>
              <col style={{ width: '180px' }} />
              {data.columns.map((col, idx) => (
                <col key={`col-${idx}`} style={{ width: '40px' }} />
              ))}
            </colgroup>
            <tbody>
              {topRows.map(({row, originalRow, sum}, rowIndex) => (
                <tr key={row} className="border-b border-gray-200">
                  <td className="p-1 text-xs font-medium cell-sticky border-r border-gray-200" 
                      style={{ width: '180px', maxWidth: '180px' }}>
                    <div className="truncate">
                      {rowIndex + 1}. {row} ({sum})
                    </div>
                  </td>
                  {data.columns.map((column, colIndex) => {
                    const value = data.data[originalRow]?.[column] || 0;
                    const colorClass = getColor(value);
                    
                    return (
                      <td key={`${row}-${colIndex}`} 
                          className={`text-center border-r border-gray-100 text-xs ${colorClass}`}
                          style={{ width: '40px', height: '28px' }}>
                        {value > 0 ? value : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {/* Date headers as sticky footer */}
            <tfoot className="sticky bottom-0 bg-white z-10">
              <tr>
                {/* Empty cell in the first column */}
                <td className="cell-sticky border-r border-gray-200" style={{ width: '180px' }}></td>
                
                {/* Date cells */}
                {data.columns.map((column, colIndex) => (
                  <td key={`date-${colIndex}`} className="date-header border-r border-gray-100 bg-white">
                    <div className="date-label">
                      {column}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Component for displaying bubble chart
const BubbleVisualization = ({ data, title }: { data: PivotData | undefined, title: string }) => {
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate the maximum value for scaling
  let maxValue = 0;
  data.rows.forEach(row => {
    data.columns.forEach(col => {
      const value = data.data[row]?.[col] || 0;
      if (value > maxValue) maxValue = value;
    });
  });

  // Filter to top 15 rows with highest sums for better visualization
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top 15
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 15)
    .map((r, index) => ({ row: r.row, index: index + 1, sum: r.sum }));

  // Column width calculation for better layout
  const colWidth = `${Math.max(100, 100 / data.columns.length)}px`;

  return (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="overflow-x-auto">
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: `180px repeat(${data.columns.length}, ${colWidth})`,
            minWidth: '100%',
            width: 'max-content',
          }}>
            {/* Row labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: `repeat(${topRows.length}, 40px)`,
              borderRight: '1px solid #e5e7eb',
              paddingRight: '8px'
            }}>
              {topRows.map(({ row, index, sum }) => (
                <div key={row} className="flex items-center h-10 text-xs font-medium truncate">
                  {index}. {row} ({sum})
                </div>
              ))}
            </div>
            
            {/* Columns with bubbles */}
            {data.columns.map((column, colIndex) => (
              <div key={column} style={{ position: 'relative' }}>
                {/* Column content */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateRows: `repeat(${topRows.length}, 40px)`,
                  borderRight: '1px solid #f3f4f6',
                  position: 'relative',
                }}>
                  {topRows.map(({ row }) => {
                    const value = data.data[row]?.[column] || 0;
                    // Size bubble based on value (min 0, max scaled relative to maxValue)
                    const size = value === 0 ? 0 : Math.max(6, Math.min(28, (value / maxValue) * 28));
                    
                    return (
                      <div key={`${row}-${column}`} className="flex items-center justify-center h-10">
                        {value > 0 && (
                          <div 
                            className="rounded-full flex items-center justify-center text-[9px] font-semibold bg-blue-500 text-white"
                            style={{ 
                              width: `${size}px`, 
                              height: `${size}px`,
                              opacity: 0.7 + ((value / maxValue) * 0.3) // More opacity for higher values
                            }}
                          >
                            {size > 14 ? value : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Date label at bottom */}
                <div 
                  className="text-xs font-medium text-gray-600 absolute bottom-[-25px] left-0"
                  style={{
                    transform: 'rotate(45deg)',
                    transformOrigin: 'bottom left',
                    width: 'max-content',
                    fontSize: '10px'
                  }}
                >
                  {column}
                </div>
              </div>
            ))}
          </div>
          
          {/* Space for rotated labels */}
          <div style={{ height: '40px' }}></div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component for full patient visualization
export default function RollbackVisualization() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [, setLocation] = useLocation();
  const selectedPatient = patientId || '1';
  
  // Fetch all pivot data types
  const symptomQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/symptom/${selectedPatient}`]
  });
  
  const diagnosisQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/diagnosis/${selectedPatient}`]
  });
  
  const categoryQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/diagnostic-category/${selectedPatient}`]
  });
  
  const hrsnQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/hrsn/${selectedPatient}`]
  });
  
  // Map data types to their queries
  const dataQueries: Record<string, any> = {
    symptom: symptomQuery,
    diagnosis: diagnosisQuery,
    'diagnostic-category': categoryQuery,
    hrsn: hrsnQuery
  };
  
  // Check if all data is loaded
  const isLoading = symptomQuery.isLoading || diagnosisQuery.isLoading || categoryQuery.isLoading || hrsnQuery.isLoading;
  
  // Check for any errors
  const hasError = symptomQuery.error || diagnosisQuery.error || categoryQuery.error || hrsnQuery.error;

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient {selectedPatient} Analysis Dashboard</CardTitle>
          <CardDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Comprehensive visualization of patient data over time</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/simplified-auto-pivot/${selectedPatient}`)}
              className="whitespace-nowrap"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Return to Pivot Tables
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading patient data...</span>
            </div>
          ) : hasError ? (
            <div className="text-center py-8 text-red-500">
              Error loading patient data. Please try again or contact support.
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold">Heatmap Visualizations</h3>
                {DATA_TYPES.map(type => (
                  <HeatmapVisualization 
                    key={`heatmap-${type.id}`}
                    data={dataQueries[type.id].data} 
                    title={type.label}
                  />
                ))}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bubble Chart Visualizations</h3>
                {DATA_TYPES.map(type => (
                  <BubbleVisualization 
                    key={`bubble-${type.id}`}
                    data={dataQueries[type.id].data} 
                    title={type.label}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}