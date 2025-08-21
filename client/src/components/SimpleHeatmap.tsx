import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Loader2, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pivotToHeatmapData, PivotTable } from "../utils/pivotTableUtils";
import ChartExportWidget from './chart-export-widget';

// We need to handle both types of pivot tables
interface SimplePivotTable {
  rows: string[];
  [key: string]: any;
}

// Type for the heatmap data
interface HeatmapData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

interface SimpleHeatmapProps {
  // Original props for API-based mode
  patientId?: string;
  dataType?: 'symptoms' | 'diagnoses' | 'diagnosticCategories' | 'hrsnCodes';
  // New props for direct pivot table mode
  pivotTable?: SimplePivotTable;
  title: string;
  description?: string;
}

// Format date for display - assuming date format is YYYY-MM-DD
const formatDateLabel = (date: string) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year.slice(2)}`;
};

// Helper function to generate color based on value and max value
const getHeatmapColor = (value: number, maxValue: number) => {
  if (value === 0) return 'bg-slate-50';
  
  const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
  
  // Define different color schemes based on intensity
  if (intensity < 0.25) {
    return 'bg-blue-100';
  } else if (intensity < 0.5) {
    return 'bg-blue-200';
  } else if (intensity < 0.75) {
    return 'bg-blue-300';
  } else {
    return 'bg-blue-500 text-white';
  }
};

const SimpleHeatmap: React.FC<SimpleHeatmapProps> = ({
  patientId,
  dataType,
  pivotTable,
  title,
  description
}) => {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Process a direct pivot table if provided - handles our specific PivotTable format
  useEffect(() => {
    if (pivotTable) {
      try {
        console.log(`Processing direct pivot table with ${pivotTable.rows.length} rows and ${pivotTable.columns.length} columns`);
        
        // Log the first few rows and columns to verify format
        console.log("First few rows:", pivotTable.rows.slice(0, 3));
        console.log("First few columns:", pivotTable.columns.slice(0, 3));
        
        // Use the pivotToHeatmapData utility to directly convert to the format we need
        const heatmapData = pivotToHeatmapData(pivotTable as PivotTable);
        console.log("Converted to heatmap data:", heatmapData);
        
        // Convert the heatmap data format to our component's expected format
        const rows = pivotTable.rows;
        const columns = pivotTable.columns;
        const values: Record<string, Record<string, number>> = {};
        let highestValue = 0;
        
        // Convert the heatmap data back to our component's expected format
        // This is a temporary adaptation - in the future we should standardize these formats
        heatmapData.forEach(rowData => {
          values[rowData.id] = {};
          rowData.data.forEach(point => {
            const value = point.y;
            values[rowData.id][point.x] = value;
            if (value > highestValue) {
              highestValue = value;
            }
          });
        });
        
        console.log(`Processed pivot table with max value: ${highestValue}`);
        
        setMaxValue(highestValue);
        setData({
          rows,
          columns,
          values
        });
        setLoading(false);
      } catch (err) {
        console.error('Error processing direct pivot table:', err);
        setError('Failed to process pivot table data.');
        setLoading(false);
      }
    }
  }, [pivotTable]);

  // Fetch pivot data from API if no direct pivot table is provided
  useEffect(() => {
    // Skip if we have a direct pivot table
    if (pivotTable || !patientId || !dataType) {
      return;
    }
    
    const fetchPivotData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the pivot data from the API
        const response = await fetch(`/simple-pivot-debug?patientId=${patientId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch pivot data');
        }
        
        const pivotData = await response.json();
        
        // Depending on dataType, select the correct pivot table
        let fetchedPivotTable;
        console.log(`Received pivot data for ${dataType}:`, pivotData);
        
        if (dataType === 'symptoms') {
          fetchedPivotTable = pivotData.symptomPivotTable;
        } else if (dataType === 'diagnoses') {
          fetchedPivotTable = pivotData.diagnosisPivotTable;
        } else if (dataType === 'diagnosticCategories') {
          fetchedPivotTable = pivotData.diagnosticCategoryPivotTable;
        } else if (dataType === 'hrsnCodes') {
          console.log("Looking for hrsnPivotTable:", pivotData.hrsnPivotTable);
          fetchedPivotTable = pivotData.hrsnPivotTable;
        }
        
        if (!fetchedPivotTable || !fetchedPivotTable.rows) {
          throw new Error(`No data found for ${dataType}`);
        }
        
        // Transform the pivot table into heatmap data
        const rows = fetchedPivotTable.rows;
        
        // Extract column headers (dates) and sort them chronologically
        const columns = Object.keys(fetchedPivotTable)
          .filter(key => key !== 'rows')
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        // Create values object for heatmap
        const values: Record<string, Record<string, number>> = {};
        let highestValue = 0;
        
        rows.forEach((row: string) => {
          values[row] = {};
          columns.forEach(column => {
            const value = fetchedPivotTable[column]?.[row] || 0;
            values[row][column] = value;
            if (value > highestValue) {
              highestValue = value;
            }
          });
        });
        
        setMaxValue(highestValue);
        setData({
          rows,
          columns,
          values
        });
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPivotData();
  }, [patientId, dataType, pivotTable]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[400px] bg-red-50 rounded-md">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600 mb-2">Visualization Error</p>
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-sm text-red-400 mt-2">Please try again or contact support if the problem persists.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.rows.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-md">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-500 mb-2">No Data Available for this Visualization</p>
            <p className="text-sm text-gray-400">There is no data to display for the selected criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate export data 
  const getExportData = () => {
    if (!data) return [];
    
    const exportData = [];
    for (const row of data.rows) {
      const rowData: Record<string, any> = { Item: row };
      for (const column of data.columns) {
        rowData[formatDateLabel(column)] = data.values[row][column] || 0;
      }
      exportData.push(rowData);
    }
    return exportData;
  };
  
  // Generate detailed export data with additional information
  const getDetailedExportData = () => {
    if (!data) return [];
    
    const detailedData = getExportData().map(item => ({
      ...item,
      PatientId: patientId || 'N/A',
      DataType: dataType || 'N/A',
      ExportTimestamp: new Date().toISOString()
    }));
    return detailedData;
  };

  // Generate unique chart ID for the export widget
  const chartId = `heatmap-${patientId || Math.random().toString(36).substring(2, 9)}`;

  // Function to render the heatmap table
  const renderHeatmapTable = (fullscreen = false) => {
    const tableClassName = fullscreen ? "w-full" : "rounded-md border";
    const scrollAreaHeight = fullscreen ? "h-[85vh]" : "h-[500px]";
    
    return (
      <ScrollArea className={scrollAreaHeight}>
        <div className={tableClassName}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  {dataType === 'symptoms' ? 'Symptom' : 
                    dataType === 'diagnoses' ? 'Diagnosis' : 
                    dataType === 'diagnosticCategories' ? 'Diagnostic Category' : 
                    pivotTable ? 'HRSN Z-Code' : 'Item'}
                </TableHead>
                {data.columns.map(column => (
                  <TableHead key={column} className="text-center whitespace-nowrap">
                    {formatDateLabel(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map(row => (
                <TableRow key={row}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10">
                    {row}
                  </TableCell>
                  {data.columns.map(column => (
                    <TableCell 
                      key={`${row}-${column}`} 
                      className={`text-center ${getHeatmapColor(data.values[row][column], maxValue)}`}
                    >
                      {/* Display the cell value (or empty string if no value) */}
                      {data.values[row][column] || ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    );
  };

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col landscape-chart-dialog">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">{title} - Patient {patientId}</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFullscreen(false)}
              className="ml-auto"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-grow overflow-auto p-4">
            {renderHeatmapTable(true)}
          </div>
        </div>
      )}
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            <ChartExportWidget
              chartId={chartId}
              chartTitle={title}
              data={getExportData()}
              showDetailedExport={true}
              getDetailedData={getDetailedExportData}
              iconSize={16}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              title="Expand chart to full screen"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderHeatmapTable()}
        </CardContent>
      </Card>
    </>
  );
};

export default SimpleHeatmap;