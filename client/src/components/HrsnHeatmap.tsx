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
import { ExtractedSymptom } from './DataProcessing';

// Type for the heatmap data
interface HeatmapData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

interface HrsnHeatmapProps {
  symptoms: ExtractedSymptom[];
  title: string;
  description?: string;
}

// Format date for display - trying different formats
const formatDateLabel = (date: string) => {
  if (!date) return '';
  
  // Log the raw date for debugging
  console.log("Raw date to format:", date);
  
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
const getHeatmapColor = (value: number, maxValue: number) => {
  if (value === 0) return 'bg-slate-50';
  
  const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
  
  // Use a different color scheme for HRSN to differentiate from regular symptoms
  if (intensity < 0.25) {
    return 'bg-amber-100';
  } else if (intensity < 0.5) {
    return 'bg-amber-200';
  } else if (intensity < 0.75) {
    return 'bg-amber-300';
  } else {
    return 'bg-amber-500 text-white';
  }
};

const HrsnHeatmap: React.FC<HrsnHeatmapProps> = ({
  symptoms,
  title,
  description
}) => {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);

  console.log("HrsnHeatmap component loaded with", symptoms?.length || 0, "symptoms");

  // Process symptoms to create HRSN heatmap
  useEffect(() => {
    // Check if symptoms data is available
    if (!symptoms || !Array.isArray(symptoms)) {
      console.log("No symptoms data available for HRSN heatmap");
      setLoading(false);
      return;
    }

    // Log a limited number of symptoms to understand data structure
    const sampleSymptoms = symptoms.slice(0, 3);
    console.log("Raw symptom data samples:", sampleSymptoms);
    
    // List all field names available in the first symptom 
    if (symptoms.length > 0) {
      console.log("Available fields in first symptom:", Object.keys(symptoms[0]));
      
      // Check if any symptom has Z codes in specific fields
      const hasZCodes = symptoms.some(symptom => {
        const diagCode = symptom.diagnosisIcd10Code || symptom.diagnosis_icd10_code;
        const symptomId = symptom.symptomId || symptom.symptom_id;
        
        return (
          (diagCode && typeof diagCode === 'string' && diagCode.toUpperCase().startsWith('Z')) ||
          (symptomId && typeof symptomId === 'string' && symptomId.toUpperCase().startsWith('Z'))
        );
      });
      console.log("Any symptom with Z-code as diagnosis or symptom ID:", hasZCodes);
      
      // Check for HRSN housing/food/financial fields
      const hasHrsnFields = symptoms.some(symptom => 
        symptom.housingStatus || symptom.foodStatus || symptom.financialStatus
      );
      console.log("Any symptom with housing/food/financial data:", hasHrsnFields);
    }
    if (!symptoms || symptoms.length === 0) {
      setLoading(false);
      console.log("No symptoms provided to HrsnHeatmap, exiting early");
      return;
    }

    try {
      // For HRSN data, we need to check multiple fields:
      // 1. ZCodeHrsn field for any non-empty, non-"Non HRSN" values
      // 2. Or check for Z-codes in the diagnosisIcd10Code field
      
      console.log("Looking for HRSN Z-code data...");
      
      // Count different types of data to verify what we have
      let hrsnCount = 0;
      let nonHrsnCount = 0;
      let zCodeCount = 0;
      
      symptoms.forEach(symptom => {
        const zCodeValue = symptom.zcode_hrsn;
        const diagnosisCode = symptom.diagnosis_icd10_code;
        const symptomId = symptom.symptom_id;
        
        // Check if ZCodeHrsn field contains a Z-code directly
        const hasDirectZCode = zCodeValue && 
                             typeof zCodeValue === 'string' && 
                             zCodeValue.toUpperCase().startsWith('Z');
                            
        // Check if diagnosis code is a Z-code (starts with Z)
        const hasZDiagnosisCode = diagnosisCode && 
                                typeof diagnosisCode === 'string' && 
                                diagnosisCode.toUpperCase().startsWith('Z');
                                
        // Check if symptom ID is a Z-code
        const hasZSymptomId = symptomId && 
                            typeof symptomId === 'string' && 
                            symptomId.toUpperCase().startsWith('Z');
        
        if (hasDirectZCode || hasZDiagnosisCode || hasZSymptomId) {
          hrsnCount++;
        } else {
          nonHrsnCount++;
        }
        
        // Also track how many have actual Z-code values
        if (hasDirectZCode) {
          zCodeCount++;
        }
      });
      
      console.log(`Counted: ${hrsnCount} HRSN/Z-code entries, ${nonHrsnCount} non-HRSN entries, ${zCodeCount} explicit Z-codes`);
      
      // Log a few example Z-codes to confirm their structure
      const sampleZCodes = symptoms
        .filter(s => {
          const zCodeValue = s.zcode_hrsn;
          const symptomId = s.symptom_id;
          const diagnosisCode = s.diagnosis_icd10_code;
          
          return (
            (zCodeValue && typeof zCodeValue === 'string' && zCodeValue.toUpperCase().startsWith('Z')) ||
            (symptomId && typeof symptomId === 'string' && symptomId.toUpperCase().startsWith('Z')) ||
            (diagnosisCode && typeof diagnosisCode === 'string' && diagnosisCode.toUpperCase().startsWith('Z'))
          );
        })
        .slice(0, 5);
        
      console.log("Sample Z-codes:", sampleZCodes.map(p => ({
        segment: p.symptom_segment,
        zcode_hrsn: p.zcode_hrsn,
        diagnosis_icd10_code: p.diagnosis_icd10_code
      })));
      
      // For HRSN Z-Codes visualization, we want all Problem records, identified by:
      // 1. sympProb="Problem" OR
      // 2. ZCode_HRSN="ZCode/HRSN" or starts with "Problem:" OR
      // 3. symptom_id starts with "Z" OR
      // 4. diagnosis_icd10_code starts with "Z"
      console.log(`HrsnHeatmap received ${symptoms.length} symptom records, filtering for Problems`);
      
      // Use either sympProb="Problem" OR zcode_hrsn="ZCode/HRSN" to identify HRSN issues
      const hrsnSymptoms = symptoms.filter(symptom => {
        // Check both snake_case and camelCase versions of the fields
        const sympProbValue = symptom.symp_prob || symptom.sympProb || '';
        const zcodeHrsnValue = symptom.zcode_hrsn || symptom.ZCode_HRSN || symptom.ZCodeHrsn || '';
        
        // Include records where sympProb is "Problem" OR zcode_hrsn is "ZCode/HRSN"
        return (typeof sympProbValue === 'string' && sympProbValue === 'Problem') ||
               (typeof zcodeHrsnValue === 'string' && zcodeHrsnValue === 'ZCode/HRSN');
      });

      console.log(`Found ${hrsnSymptoms.length} Problem records (sympProb="Problem") out of ${symptoms.length} total symptoms`);
      
      // Print some debug information to verify the data
      if (hrsnSymptoms.length > 0) {
        // Count unique symptom segments to show distribution
        const uniqueSegments = new Set();
        hrsnSymptoms.forEach(s => {
          const segment = s.symptom_segment;
          if (segment) uniqueSegments.add(segment);
        });
        
        console.log(`HRSN contains ${uniqueSegments.size} unique problem segments`);
        console.log("Sample HRSN problem segments:", Array.from(uniqueSegments).slice(0, 10));
        
        // Show examples of the problem records
        console.log("HRSN problem examples:", hrsnSymptoms.slice(0, 3).map(s => ({
          segment: s.symptom_segment,
          symp_prob: s.symp_prob,
          diagnosis: s.diagnosis
        })));
      }

      if (hrsnSymptoms.length === 0) {
        setLoading(false);
        return;
      }

      // Group by symptom segment and date
      const segmentsByDate: Record<string, Record<string, number>> = {};
      const allSegments = new Set<string>();
      const allDates = new Set<string>();

      hrsnSymptoms.forEach(symptom => {
        // Log field names for debugging
        if (symptoms.indexOf(symptom) === 0) {
          console.log("HRSN Data structure check:", Object.keys(symptom));
        }
        
        const date = symptom.dos_date || '';
        if (!date) {
          if (symptoms.indexOf(symptom) === 0) {
            console.error("Missing dos_date field in symptom:", symptom);
          }
          return; // Skip if no date
        }

        // For the HRSN Z-Code heatmap, we need to get the best description available
        // Try symptom_segment first, then check other fields
        let segment = symptom.symptom_segment || symptom.symptomSegment || '';
        
        // If symptom_segment is empty, try using diagnosis field
        if (!segment && (symptom.diagnosis || symptom.diagnosisName)) {
          segment = symptom.diagnosis || symptom.diagnosisName;
        }
        
        // If both are empty, check for Z-codes in various fields
        if (!segment) {
          const zCodeField = symptom.zcode_hrsn || symptom.ZCodeHrsn || symptom.ZCode_HRSN || '';
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
          const diagnosisCode = symptom.diagnosis_icd10_code || symptom.diagnosisIcd10Code || '';
          if (typeof diagnosisCode === 'string' && diagnosisCode.toUpperCase().startsWith('Z')) {
            segment = diagnosisCode;
          }
        }
        
        // Skip if no segment value could be found
        if (!segment) {
          if (symptoms.indexOf(symptom) === 0) {
            console.error("Could not determine HRSN segment from any field:", symptom);
          }
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

        // Debug logging for the first few records to understand our data
        if (hrsnSymptoms.indexOf(symptom) < 3) {
          console.log(`HRSN Debug: Segment=${segment}, Date=${date}, ZCodeHrsn=${symptom.zcode_hrsn}, sympProb=${symptom.symp_prob}`);
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

      if (rows.length > 0) {
        console.log(`HRSN Heatmap created with ${rows.length} rows and ${columns.length} columns`);
        console.log("Sample row:", rows[0]);
      }
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
                    HRSN Problem
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
                        {data.values[row][column] || ''}
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

export default HrsnHeatmap;