// IBPM v3.1.0 - Created: May 17, 2025
// Controls component: HrsnHeatmap - used for displaying HRSN Z-code heatmaps
// Enhancement: Added global theme support

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useChartTheme } from '@/context/ChartThemeContext';

// Data structure for heatmap visualization
interface HeatmapData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

// Component props
export interface HrsnHeatmapProps {
  patientId: string;
  title?: string;
  description?: string;
  colorScheme?: string;
}

// Helper function to generate color based on value intensity
const getHeatmapColor = (value: number, maxValue: number, theme: string = 'default') => {
  if (value === 0) return 'bg-transparent';
  
  const colors = getColorMap(theme);
  const intensity = Math.min(Math.ceil((value / maxValue) * (colors.length - 1)), colors.length - 1);
  const index = Math.max(intensity, 0);
  
  // Return both background color and text color based on intensity
  const isDarkColor = index > colors.length * 0.6;
  return isDarkColor ? `${colors[index]} text-white` : colors[index];
};

// Get color map based on theme
const getColorMap = (theme: string): string[] => {
  switch (theme) {
    case 'blue':
      return [
        'bg-blue-50',
        'bg-blue-100',
        'bg-blue-200',
        'bg-blue-300',
        'bg-blue-400',
        'bg-blue-500',
        'bg-blue-600',
        'bg-blue-700',
        'bg-blue-800',
      ];
    case 'green':
      return [
        'bg-green-50',
        'bg-green-100',
        'bg-green-200',
        'bg-green-300',
        'bg-green-400',
        'bg-green-500',
        'bg-green-600',
        'bg-green-700',
        'bg-green-800',
      ];
    case 'purple':
      return [
        'bg-purple-50',
        'bg-purple-100',
        'bg-purple-200',
        'bg-purple-300',
        'bg-purple-400',
        'bg-purple-500',
        'bg-purple-600',
        'bg-purple-700',
        'bg-purple-800',
      ];
    case 'amber':
      return [
        'bg-amber-50',
        'bg-amber-100',
        'bg-amber-200',
        'bg-amber-300',
        'bg-amber-400',
        'bg-amber-500',
        'bg-amber-600',
        'bg-amber-700',
        'bg-amber-800',
      ];
    case 'red':
      return [
        'bg-red-50',
        'bg-red-100',
        'bg-red-200',
        'bg-red-300',
        'bg-red-400',
        'bg-red-500',
        'bg-red-600',
        'bg-red-700',
        'bg-red-800',
      ];
    case 'default':
    default:
      return [
        'bg-slate-50',
        'bg-slate-100',
        'bg-slate-200',
        'bg-slate-300',
        'bg-slate-400',
        'bg-slate-500',
        'bg-slate-600',
        'bg-slate-700',
        'bg-slate-800',
      ];
  }
};

const HrsnHeatmap: React.FC<HrsnHeatmapProps> = ({
  patientId,
  title = "HRSN Z-Code Heatmap",
  description = "Visualization of HRSN Z-code occurrences over time",
  colorScheme // Optional color scheme prop that can override the global theme
}) => {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  
  // Get global theme context
  const { currentTheme } = useChartTheme();
  
  // Use prop colorScheme if provided, otherwise map the global theme to appropriate color scheme
  const effectiveTheme = colorScheme || (() => {
    // Map from theme context to color scheme
    const mapping: Record<string, string> = {
      'vivid': 'orange',
      'pastel': 'blue', 
      'dark': 'purple',
      'muted': 'slate',
      'viridis': 'green'
    };
    return mapping[currentTheme] || 'blue';
  })();

  // Fetch data for the specified patient ID
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        
        // API call to get HRSN data for the specified patient
        const response = await fetch(`/api/patients/${patientId}/hrsn-heatmap`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch HRSN data: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.symptoms) {
          setSymptoms(result.symptoms);
        }
        
        if (result.heatmapData) {
          setData(result.heatmapData);
          
          // Calculate max value for color scaling
          let max = 0;
          Object.keys(result.heatmapData.values).forEach(row => {
            Object.keys(result.heatmapData.values[row]).forEach(col => {
              const value = result.heatmapData.values[row][col];
              max = Math.max(max, value);
            });
          });
          
          setMaxValue(max);
        } else {
          setData(null);
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching HRSN data:", err);
        setError(err.message || "Failed to load HRSN data");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  // Loading state
  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-3/4" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-1/2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              No HRSN Z-code data found for this patient.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Data visualization
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">HRSN Factor / Date</TableHead>
                {data.columns.map((column) => (
                  <TableHead key={column} className="text-center">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row}>
                  <TableCell className="font-medium">{row}</TableCell>
                  {data.columns.map((column) => {
                    const value = data.values[row][column] || 0;
                    return (
                      <TableCell 
                        key={`${row}-${column}`} 
                        className={`text-center ${getHeatmapColor(value, maxValue, effectiveTheme)}`}
                      >
                        {value || ''}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default HrsnHeatmap;