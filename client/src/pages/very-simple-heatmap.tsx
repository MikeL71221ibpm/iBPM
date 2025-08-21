import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart } from "lucide-react";

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

// Component for displaying heatmap visualization
const HeatmapVisualization = ({ data, title }: { data: PivotData | undefined, title: string }) => {
  // Create a very simple color scale
  const getColor = (value: number) => {
    if (value === 0) return "bg-white";
    if (value === 1) return "bg-blue-100";
    if (value <= 3) return "bg-blue-300";
    if (value <= 5) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  };

  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">No data available to display</div>
        </CardContent>
      </Card>
    );
  }

  // Process all rows to calculate sums
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    // Replace empty labels with default value
    const displayRow = row.trim() === '' ? 'Unlabeled Item' : row;
    return { row: displayRow, originalRow: row, sum };
  });
  
  // Sort by sum (descending) and take top 30
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 30);

  // Create specific IDs for the tables to avoid CSS conflicts
  const tableId = `heatmap-${title.replace(/\s+/g, '-').toLowerCase()}`;
  
  // CSS for the date headers at the bottom
  const customStyles = `
    #${tableId}-container {
      position: relative;
      height: 450px;
      overflow: auto;
    }
    
    #${tableId} {
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    #${tableId} tfoot {
      position: sticky !important;
      bottom: 0 !important;
      z-index: 100 !important;
      background: white !important;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1) !important;
    }
    
    #${tableId} .date-header {
      height: 60px;
      width: 40px;
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
              {topRows.map(({row, originalRow, sum}) => (
                <tr key={row} className="border-b border-gray-200">
                  <td className="p-1 text-xs font-medium cell-sticky border-r border-gray-200" 
                      style={{ width: '180px', maxWidth: '180px' }}>
                    <div className="truncate">
                      {row} ({sum})
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
            <tfoot>
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

// Main component for full patient visualization
export default function VerySimpleHeatmap() {
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}