// IBPM v3.1.0 - Last updated: May 17, 2025
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
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { ExtractedSymptom } from "@shared/schema";
import { useChartTheme } from "@/context/ChartThemeContext";

// Add a console log to confirm this file is being loaded
console.log("HrsnHeatmap controlling file loaded at", new Date().toLocaleTimeString());

// Type for the heatmap data
interface HeatmapData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

export interface HrsnHeatmapProps {
  patientId: string;
  title?: string;
  description?: string;
  colorScheme?: string;
}

// Format date for display - trying different formats
const formatDateLabel = (date: string) => {
  if (!date) return '';
  
  try {
    // First try the standard YYYY-MM-DD format
    const [year, month, day] = date.split('-');
    if (year && month && day) {
      return `${month}/${day}/${year.slice(2)}`;
    }
    
    // If that fails, try creating a Date object
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      const year = dateObj.getFullYear().toString().slice(2);
      return `${month}/${day}/${year}`;
    }
  } catch (err) {
    console.error("Date formatting error:", err, "for date:", date);
  }
  
  // Return original if all else fails
  return date;
};

// Helper function to generate color based on value and max value
const getHeatmapColor = (value: number, maxValue: number, theme: string = 'vivid') => {
  if (value === 0) return 'bg-slate-50';
  
  // Theme-based color schemes
  const colorSchemes: Record<string, string[]> = {
    'vivid': ['bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800'],
    'pastel': ['bg-teal-100', 'bg-teal-200', 'bg-teal-300', 'bg-teal-400', 'bg-teal-500', 'bg-teal-600', 'bg-teal-700', 'bg-teal-800'],
    'dark': ['bg-purple-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700', 'bg-purple-800'],
    'muted': ['bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800'],
    'viridis': ['bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700', 'bg-emerald-800']
  };
  
  // Select the correct color scheme based on the theme
  const colors = colorSchemes[theme] || colorSchemes['vivid'];
  
  const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
  
  // Calculate color index based on intensity
  const index = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
  
  // Add text-white class for darker colors to ensure text is readable
  const isDarkColor = index > colors.length * 0.6;
  return isDarkColor ? `${colors[index]} text-white` : colors[index];
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
  const [symptoms, setSymptoms] = useState<ExtractedSymptom[]>([]);
  
  // Get global theme context
  const { currentTheme } = useChartTheme();
  
  // Use prop colorScheme if provided, otherwise use the global theme
  const effectiveTheme = colorScheme || currentTheme;

  // Fetch data for the specified patient ID
  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const response = await apiRequest("GET", `/api/patient/${patientId}/symptoms`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        setSymptoms(data.symptoms || []);
      } catch (err: any) {
        console.error("Error fetching patient HRSN data:", err);
        setError(`Error loading HRSN data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  // Process symptoms to create HRSN heatmap
  useEffect(() => {
    if (!symptoms || symptoms.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // For HRSN Z-Codes visualization, we want all Problem records, identified by:
      // 1. symp_prob="Problem" OR
      // 2. zcode_hrsn="ZCode/HRSN" or starts with "Problem:" OR
      // 3. symptom_id starts with "Z" OR
      // 4. diagnosis_icd10_code starts with "Z"
      
      // Use either symp_prob="Problem" OR zcode_hrsn="ZCode/HRSN" to identify HRSN issues
      const hrsnSymptoms = symptoms.filter(symptom => {
        // Only use snake_case versions of fields since those are the actual fields in the ExtractedSymptom type
        const sympProbValue = symptom.symp_prob || '';
        const zcodeHrsnValue = symptom.zcode_hrsn || '';
        
        // Include records where symp_prob is "Problem" OR zcode_hrsn is "ZCode/HRSN"
        return (typeof sympProbValue === 'string' && sympProbValue === 'Problem') ||
               (typeof zcodeHrsnValue === 'string' && zcodeHrsnValue === 'ZCode/HRSN');
      });

      if (hrsnSymptoms.length === 0) {
        setLoading(false);
        return;
      }

      // Group by symptom segment and date
      const segmentsByDate: Record<string, Record<string, number>> = {};
      const allSegments = new Set<string>();
      const allDates = new Set<string>();

      hrsnSymptoms.forEach(symptom => {
        const date = symptom.dos_date || '';
        if (!date) {
          return; // Skip if no date
        }

        // For the HRSN Z-Code heatmap, we need to get the best description available
        // Try symptom_segment field
        let segment = symptom.symptom_segment || '';
        
        // If symptom_segment is empty, try using diagnosis field
        if (!segment && symptom.diagnosis) {
          segment = symptom.diagnosis;
        }
        
        // If both are empty, check for Z-codes in zcode_hrsn field
        if (!segment) {
          const zCodeField = symptom.zcode_hrsn || '';
          // If it's a Z-code, use that
          if (typeof zCodeField === 'string' && zCodeField.startsWith('Z')) {
            segment = zCodeField;
          }
          // If it's a Problem: prefix, extract the actual problem description
          else if (typeof zCodeField === 'string' && zCodeField.startsWith('Problem:')) {
            segment = zCodeField.substring(8).trim();
          }
        }
        
        // If we still have no segment, try to use diagnosis_icd10_code field if it's a Z-code
        if (!segment) {
          const diagnosisCode = symptom.diagnosis_icd10_code || '';
          if (typeof diagnosisCode === 'string' && diagnosisCode.toUpperCase().startsWith('Z')) {
            segment = diagnosisCode;
          }
        }
        
        // Skip if no segment value could be found
        if (!segment) {
          return; // Skip if no segment
        }
        
        // Special case: Use a better description for common Z-codes
        if (segment === 'Z59.0' || segment.includes('Z59.0')) {
          segment = 'Homelessness';
        } else if (segment === 'Z59.1' || segment.includes('Z59.1')) {
          segment = 'Inadequate Housing';
        } else if (segment === 'Z59.4' || segment.includes('Z59.4')) {
          segment = 'Lack of Food';
        } else if (segment === 'Z59.5' || segment.includes('Z59.5')) {
          segment = 'Extreme Poverty';
        } else if (segment === 'Z59.6' || segment.includes('Z59.6')) {
          segment = 'Low Income';
        } else if (segment === 'Z60.2' || segment.includes('Z60.2')) {
          segment = 'Social Isolation';
        } else if (segment === 'Z56.0' || segment.includes('Z56.0')) {
          segment = 'Unemployment';
        } else if (segment === 'Z65.3' || segment.includes('Z65.3')) {
          segment = 'Legal Problems';
        }

        allSegments.add(segment);
        allDates.add(date);

        segmentsByDate[date] = segmentsByDate[date] || {};
        segmentsByDate[date][segment] = (segmentsByDate[date][segment] || 0) + 1;
      });

      // Create sorted arrays of segments and dates
      // First, calculate total values for each segment to sort by frequency
      const segmentTotals: Record<string, number> = {};
      
      Array.from(allSegments).forEach(segment => {
        segmentTotals[segment] = 0;
        Array.from(allDates).forEach(date => {
          segmentTotals[segment] += segmentsByDate[date]?.[segment] || 0;
        });
      });
      
      // Sort segments by total value in descending order (highest to lowest)
      const rows = Array.from(allSegments).sort((a, b) => segmentTotals[b] - segmentTotals[a]);
      
      // Sort dates chronologically
      const columns = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Create values object for heatmap
      const values: Record<string, Record<string, number>> = {};
      let highestValue = 0;

      rows.forEach(row => {
        values[row] = {};
        columns.forEach(column => {
          const value = segmentsByDate[column]?.[row] || 0;
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
      console.error('Error processing HRSN data:', err);
      setError('Failed to process HRSN data.');
    } finally {
      setLoading(false);
    }
  }, [symptoms]);
  
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
        <CardContent className="text-center text-destructive">
          {error}
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
        <CardContent className="text-center text-muted-foreground">
          No HRSN Z-code data available for this patient.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Z-Code / HRSN Category
                  </TableHead>
                  {data.columns.map((date) => (
                    <TableHead key={date} className="text-center min-w-[100px]">
                      {formatDateLabel(date)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      {row}
                    </TableCell>
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HrsnHeatmap;