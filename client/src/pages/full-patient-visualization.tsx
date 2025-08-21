import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title} - Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No data available to display</div>
        </CardContent>
      </Card>
    );
  }

  // Filter to top 25 rows with highest sums for better visualization
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top 25
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 25)
    .map(r => r.row);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>{title} - Heatmap</CardTitle>
        <CardDescription>Heat intensity shows frequency/severity over time</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="border px-2 py-2 bg-gray-200 sticky left-0 z-20">Type</th>
                {data.columns.map(column => (
                  <th key={column} className="border px-4 py-2 whitespace-nowrap">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topRows.map(row => (
                <tr key={row}>
                  <td className="border px-4 py-2 font-medium bg-gray-50 sticky left-0 z-10 max-w-[200px] truncate">
                    {row}
                  </td>
                  {data.columns.map(column => {
                    const value = data.data[row]?.[column] || 0;
                    
                    // Color intensity based on value
                    let bgColor = "bg-white";
                    if (value > 0) {
                      if (value >= 30) bgColor = "bg-red-300";
                      else if (value >= 20) bgColor = "bg-red-200";
                      else if (value >= 10) bgColor = "bg-red-100";
                      else if (value >= 5) bgColor = "bg-red-50";
                      else bgColor = "bg-gray-50";
                    }
                    
                    return (
                      <td key={`${row}-${column}`} className={`border border-gray-300 px-2 py-2 text-center ${bgColor}`}>
                        {value > 0 ? value : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title} - Bubble Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No data available to display</div>
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
    .map(r => r.row);

  // Column width calculation for better layout
  const colWidth = `${Math.max(100, 100 / data.columns.length)}px`;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>{title} - Bubble Chart</CardTitle>
        <CardDescription>Bubble size represents frequency/severity over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Date headers at the top */}
            <div className="flex border-b border-gray-300 mb-4 pb-2">
              <div className="w-[200px] font-medium text-gray-600 pl-2">Item</div>
              {data.columns.map(col => (
                <div 
                  key={`header-${col}`} 
                  className="text-center font-medium text-gray-600"
                  style={{ width: colWidth }}
                >
                  {col}
                </div>
              ))}
            </div>
            
            {/* Bubble chart rows */}
            {topRows.map(row => (
              <div key={row} className="flex items-center mb-6 hover:bg-gray-50">
                <div className="w-[200px] text-sm font-medium pl-2 truncate" title={row}>
                  {row}
                </div>
                <div className="flex flex-1">
                  {data.columns.map(col => {
                    const value = data.data[row]?.[col] || 0;
                    const size = value > 0 ? Math.max(10, Math.min(50, (value / maxValue) * 50)) : 0;
                    
                    return (
                      <div 
                        key={`${row}-${col}`} 
                        className="flex items-center justify-center border-r border-gray-200 last:border-r-0"
                        style={{ width: colWidth }}
                      >
                        {value > 0 ? (
                          <div 
                            className="rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shadow-sm m-1"
                            style={{ 
                              width: `${size}px`, 
                              height: `${size}px`,
                              fontSize: size > 20 ? '10px' : '8px'
                            }}
                          >
                            {size > 15 ? value : ''}
                          </div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-100 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Date labels at the bottom for reference */}
            <div className="flex border-t border-gray-300 mt-2 pt-2">
              <div className="w-[200px]"></div>
              {data.columns.map(col => (
                <div 
                  key={`footer-${col}`} 
                  className="text-center text-xs text-gray-500"
                  style={{ width: colWidth }}
                >
                  {col}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component for full patient visualization
export default function FullPatientVisualization() {
  const { patientId } = useParams<PatientVisualizationParams>();
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
          <CardDescription>
            Comprehensive visualization of patient data over time
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
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Heatmap Visualizations</h2>
                {DATA_TYPES.map(type => (
                  <HeatmapVisualization 
                    key={`heatmap-${type.id}`}
                    data={dataQueries[type.id].data} 
                    title={type.label}
                  />
                ))}
              </div>
              
              <div>
                <h2 className="text-xl font-bold mb-4">Bubble Chart Visualizations</h2>
                {DATA_TYPES.map(type => (
                  <BubbleVisualization 
                    key={`bubble-${type.id}`}
                    data={dataQueries[type.id].data} 
                    title={type.label}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}