import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowUpRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Types
interface HeatmapViewParams {
  patientId?: string;
}

interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Define all data types that we will display
const DATA_TYPES = [
  { id: 'symptom', label: 'Symptom Heatmap' },
  { id: 'diagnosis', label: 'Diagnosis Heatmap' },
  { id: 'category', label: 'Diagnostic Category Heatmap' },
  { id: 'hrsn', label: 'HRSN Heatmap' }
];

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  // For this application, we'll use "Bob Test" followed by the ID number
  return `Bob Test${patientId}`;
};

// Individual heatmap section component
const HeatmapSection = ({ dataType, patientId }: { 
  dataType: string, 
  patientId: string
}) => {
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

  const [open, setOpen] = useState(false);
  
  // Max row count based on data type - control what shows in the compact view
  const getMaxRows = () => {
    switch(dataType) {
      case 'hrsn': return 10; // Show all HRSN indicators
      case 'category': return 15; // Show top 15 categories
      case 'diagnosis': return 15; // Show top 15 diagnoses
      case 'symptom': return 15; // Show top 15 symptoms
      default: return 15;
    }
  };
  
  // Process pivot data for visualization
  const processData = () => {
    if (!data || !data.rows || !data.columns) return { topRows: [], columns: [] };
    
    // Calculate sums for each row and prepare for display
    const rowsWithSums = data.rows.map(row => {
      const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
      return { row, sum };
    });
    
    // Sort by sum (descending) and take top rows based on data type
    const topRows = rowsWithSums
      .sort((a, b) => b.sum - a.sum)
      .slice(0, getMaxRows());
      
    return { topRows, columns: data.columns };
  };
  
  // Function to get appropriate color class based on value
  const getColorClass = (value: number) => {
    if (value === 0) return "bg-white";
    if (value === 1) return "bg-blue-100";
    if (value <= 3) return "bg-blue-300";
    if (value <= 5) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  };
  
  const { topRows, columns } = processData();
  
  // Create a unique ID for this table to avoid CSS conflicts
  const tableId = `heatmap-${dataType}-${patientId}`;
  
  // Custom CSS for the table layout and sticky elements
  const tableStyles = `
    #${tableId}-container {
      position: relative;
      height: ${dataType === 'hrsn' ? '230px' : '320px'};
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
    <div className="relative border rounded">
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
        <div>
          <h3 className="text-base font-medium">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {dataType === 'hrsn' 
              ? 'All 10 HRSN indicators' 
              : `Top ${getMaxRows()} items (click to see all)`
            }
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <ArrowUpRight className="h-4 w-4" />
              <span className="sr-only">Expand {displayName}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {displayName} - {getPatientName(parseInt(patientId))} (ID: P{patientId.padStart(4, '0')})
              </DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                Error loading {displayName.toLowerCase()} data. Please try again.
              </div>
            ) : (
              <div className="mt-2" style={{ 
                maxHeight: '70vh', 
                overflowY: 'auto', 
                padding: '8px'
              }}>
                <h3 className="text-lg font-medium mb-2">Complete {displayName}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Showing all {data?.rows.length || 0} items, with color intensity indicating frequency.
                </p>
                
                {/* Full data table */}
                <style>{tableStyles.replace(tableId, `${tableId}-full`)}</style>
                <div id={`${tableId}-full-container`} className="border rounded">
                  <table id={`${tableId}-full`} className="w-full">
                    <colgroup>
                      <col style={{ width: '180px' }} />
                      {columns.map((col, idx) => (
                        <col key={`col-${idx}`} style={{ width: '40px' }} />
                      ))}
                    </colgroup>
                    <tbody>
                      {data?.rows.map((row, rowIdx) => {
                        // Calculate sum for this row
                        const sum = columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
                        
                        return (
                          <tr key={`${row}-${rowIdx}`} className="border-b border-gray-200">
                            <td className="p-1 text-xs font-medium cell-sticky border-r border-gray-200" 
                                style={{ width: '180px', maxWidth: '180px' }}>
                              <div className="truncate">
                                {row} ({sum})
                              </div>
                            </td>
                            {columns.map((column, colIdx) => {
                              const value = data.data[row]?.[column] || 0;
                              const colorClass = getColorClass(value);
                              
                              return (
                                <td key={`${row}-${column}-${colIdx}`} 
                                    className={`text-center border-r border-gray-100 text-xs ${colorClass}`}
                                    style={{ width: '40px', height: '28px' }}>
                                  {value > 0 ? value : ''}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="cell-sticky border-r border-gray-200" style={{ width: '180px' }}></td>
                        {columns.map((column, colIdx) => (
                          <td key={`date-${colIdx}`} className="date-header border-r border-gray-100 bg-white">
                            <div className="date-label">
                              {column}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
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
          <>
            <style>{tableStyles}</style>
            <div id={`${tableId}-container`} className="border rounded">
              <table id={tableId} className="w-full">
                <colgroup>
                  <col style={{ width: '180px' }} />
                  {columns.slice(-10).map((col, idx) => (
                    <col key={`col-${idx}`} style={{ width: '40px' }} />
                  ))}
                </colgroup>
                <tbody>
                  {topRows.map(({ row, sum }, rowIdx) => (
                    <tr key={`${row}-${rowIdx}`} className="border-b border-gray-200">
                      <td className="p-1 text-xs font-medium cell-sticky border-r border-gray-200" 
                          style={{ width: '180px', maxWidth: '180px' }}>
                        <div className="truncate">
                          {row} ({sum})
                        </div>
                      </td>
                      {columns.slice(-10).map((column, colIdx) => {
                        const value = data?.data[row]?.[column] || 0;
                        const colorClass = getColorClass(value);
                        
                        return (
                          <td key={`${row}-${column}-${colIdx}`} 
                              className={`text-center border-r border-gray-100 text-xs ${colorClass}`}
                              style={{ width: '40px', height: '28px' }}>
                            {value > 0 ? value : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="cell-sticky border-r border-gray-200" style={{ width: '180px' }}></td>
                    {columns.slice(-10).map((column, colIdx) => (
                      <td key={`date-${colIdx}`} className="date-header border-r border-gray-100 bg-white">
                        <div className="date-label">
                          {column}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main component - displays all four heatmaps in a grid layout
export default function HeatmapView() {
  const { patientId } = useParams<HeatmapViewParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  useEffect(() => {
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
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Heatmap visualizations showing frequency patterns over time. Click the expand icon on any section to see more details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div>
              <Select 
                value={patientToDisplay} 
                onValueChange={(value) => setLocation(`/heatmap-view/${value}`)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      Patient {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
                dataType={type.id === 'category' ? 'category' : type.id} 
                patientId={patientToDisplay}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}