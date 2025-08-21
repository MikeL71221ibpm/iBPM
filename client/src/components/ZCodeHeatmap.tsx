import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

// Log component mount to debug
console.log("ZCodeHeatmap component loaded");

interface ZCodeHeatmapProps {
  patientId: string;
}

interface ZCodeData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
  maxValue: number;
}

/**
 * ZCodeHeatmap Component
 * 
 * A specialized component for displaying Z-Codes from diagnosis codes
 * data over time as a heatmap visualization. This component:
 * 
 * 1. Makes API calls dedicated to Z-code data
 * 2. Formats data specifically for Z-code visualization
 * 3. Provides accessible table-based heatmap rendering
 */
const ZCodeHeatmap = ({ patientId }: ZCodeHeatmapProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zCodeData, setZCodeData] = useState<ZCodeData | null>(null);

  // Format date labels for better display (MM/DD/YY)
  const formatDateLabel = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Get CSS class for heatmap cell based on value intensity
  const getHeatmapColor = (value: number, maxValue: number): string => {
    if (!value) return '';
    
    // Calculate color intensity (1-5 scale)
    const intensityLevel = Math.ceil((value / maxValue) * 5);
    
    // Return Tailwind CSS classes for different intensity levels
    // Using orange/amber colors to differentiate from the blue HRSN heatmap
    switch (intensityLevel) {
      case 1: return 'bg-amber-100';
      case 2: return 'bg-amber-200';
      case 3: return 'bg-amber-300';
      case 4: return 'bg-amber-400';
      case 5: return 'bg-amber-500 text-white';
      default: return '';
    }
  };

  // Fetch Z-code data when patient changes
  useEffect(() => {
    console.log("ZCodeHeatmap component mounted with patientId:", patientId);
    
    const fetchZCodeData = async () => {
      if (!patientId) {
        setError('No patient selected');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching Z-code data for patient ${patientId}...`);
        
        // Get Z-code data from the API - using a different endpoint specifically for Z-codes
        const response = await apiRequest('POST', '/api/zcode-data', { 
          patientId,
          useAllDates: true 
        });
        const data = await response.json();
        console.log("API response for Z-code data:", data);
        
        // Get the Z-code pivot table from the response
        const zCodePivotTable = data?.zCodePivotTable;
        
        console.log("DEBUG - API response:", data);
        console.log("DEBUG - Z-code pivot table data:", zCodePivotTable);
        
        // If no data was received at all
        if (!data) {
          console.log("No data received from API");
          setError("No data received from API");
          setLoading(false);
          return;
        }
        
        // If no pivot table data was received, try to use the data directly
        if (!zCodePivotTable && data) {
          console.log("Attempting to use data directly as pivot table");
          if (data.rows && Array.isArray(data.rows)) {
            console.log("Using data directly as pivot table");
            // Direct assignment to state
            setZCodeData(data);
            setLoading(false);
            return;
          }
        }
        
        if (!zCodePivotTable || !zCodePivotTable.rows || !zCodePivotTable.rows.length) {
          console.log("No Z-code data found for this patient");
          setZCodeData(null);
          setLoading(false);
          return;
        }
        
        // Extract data for the heatmap
        const rows = zCodePivotTable.rows;
        console.log("DEBUG - Z-code rows:", rows);
        
        // Extract column headers (dates) and sort them chronologically
        const columns = Object.keys(zCodePivotTable)
          .filter(key => key !== 'rows')
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        console.log("DEBUG - Z-code date columns:", columns);
        
        // Create values object for heatmap
        const values: Record<string, Record<string, number>> = {};
        let highestValue = 0;
        
        rows.forEach((row: string) => {
          values[row] = {};
          columns.forEach(column => {
            const value = zCodePivotTable[column]?.[row] || 0;
            values[row][column] = value;
            highestValue = Math.max(highestValue, value);
          });
        });
        
        console.log("DEBUG - Z-code processed data:", {
          rows,
          columns,
          values,
          maxValue: highestValue || 1
        });
        
        setZCodeData({
          rows,
          columns,
          values,
          maxValue: highestValue || 1 // Avoid division by zero
        });
      } catch (err) {
        console.error('Error fetching Z-code heatmap data:', err);
        setError('Failed to load Z-code data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchZCodeData();
  }, [patientId]);
  
  // Loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Z-Code Diagnosis Heatmap</CardTitle>
          <CardDescription>Visualization of Z-code diagnoses over time</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading Z-code data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Z-Code Diagnosis Heatmap</CardTitle>
          <CardDescription>Visualization of Z-code diagnoses over time</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center min-h-[200px]">
          <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state (no data)
  if (!zCodeData || zCodeData.rows.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Z-Code Diagnosis Heatmap</CardTitle>
          <CardDescription>Visualization of Z-code diagnoses over time</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-16 text-muted-foreground">
          <p>No Z-code diagnosis data available for this patient.</p>
          <p className="text-sm mt-2">Z-codes are used to identify factors influencing health status (Z00-Z99 ICD-10 codes).</p>
        </CardContent>
      </Card>
    );
  }

  // Render heatmap when data is available
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Z-Code Diagnosis Heatmap</CardTitle>
        <CardDescription>Visualization of Z-code diagnoses over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Z-Code Diagnosis
                  </TableHead>
                  {zCodeData.columns.map((column: string) => (
                    <TableHead key={column} className="text-center whitespace-nowrap">
                      {formatDateLabel(column)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {zCodeData.rows.map((row: string) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      {row}
                    </TableCell>
                    {zCodeData.columns.map((column: string) => (
                      <TableCell 
                        key={`${row}-${column}`} 
                        className={`text-center ${getHeatmapColor(zCodeData.values[row][column], zCodeData.maxValue)}`}
                      >
                        {zCodeData.values[row][column] || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ZCodeHeatmap;