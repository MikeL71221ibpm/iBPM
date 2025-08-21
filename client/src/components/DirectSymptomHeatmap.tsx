import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveHeatMap } from '@nivo/heatmap';

// Helper function to normalize whitespace in strings
const normalizeWhitespace = (str: string): string => {
  return typeof str === 'string' ? str.trim().replace(/\s+/g, ' ') : String(str);
};

// Date formatting helper
const formatDateForDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateStr;
  }
};

interface DirectSymptomHeatmapProps {
  title: string;
  data: any[];
}

/**
 * DirectSymptomHeatmap component - Directly formats the symptom data for heatmap visualization
 * Creates a heatmap with symptom segments on Y-axis and dates on X-axis
 */
const DirectSymptomHeatmap: React.FC<DirectSymptomHeatmapProps> = ({ title, data }) => {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  
  useEffect(() => {
    if (!data || data.length === 0) {
      console.log("No data provided to DirectSymptomHeatmap");
      return;
    }

    console.log(`Processing ${data.length} symptoms for direct heatmap visualization`);
    
    // Debug: Log the first few items
    data.slice(0, 3).forEach((item, idx) => {
      console.log(`Raw symptom data ${idx}:`, JSON.stringify(item, null, 2));
    });
    
    try {
      // Extract all symptoms and dates
      const symptomMap: Record<string, Record<string, number>> = {};
      const dateSet = new Set<string>();
      
      // Process each symptom record
      data.forEach(symptom => {
        // Extract symptom segment with fallbacks for different field names
        let symptomSegment = '';
        
        // Log the actual keys for this record to help debug issues
        console.log("Available keys for symptom:", Object.keys(symptom));
        
        if (symptom.symptom_segment !== undefined) {
          symptomSegment = normalizeWhitespace(symptom.symptom_segment);
          console.log("Found symptom_segment:", symptomSegment);
        } else if (symptom.symptomSegment !== undefined) {
          symptomSegment = normalizeWhitespace(symptom.symptomSegment);
          console.log("Found symptomSegment:", symptomSegment);
        } else {
          // Loop through all keys and log to check for possible matches
          for (const key of Object.keys(symptom)) {
            console.log(`Checking key: ${key}, value: ${symptom[key]}`);
            
            // Try to explicitly access fields that might contain symptom information
            if (key === "sympProb" && symptom[key]) {
              symptomSegment = normalizeWhitespace(symptom[key]);
              console.log(`Using sympProb for symptom: "${symptomSegment}"`);
              break;
            }
            
            if (key === "symptomProblem" && symptom[key]) {
              symptomSegment = normalizeWhitespace(symptom[key]);
              console.log(`Using symptomProblem for symptom: "${symptomSegment}"`);
              break;
            }
            
            if (key.toLowerCase().includes('symptom') && symptom[key]) {
              symptomSegment = normalizeWhitespace(symptom[key]);
              console.log(`Using field ${key} for symptom: "${symptomSegment}"`);
              break;
            }
          }
        }
        
        // If we still don't have a symptom segment, use a placeholder
        if (!symptomSegment) {
          console.warn("Could not find symptom segment for record:", symptom);
          return; // Skip this record
        }
        
        // Extract date with fallbacks for different field names
        let dateStr = '';
        console.log("Looking for date field in symptom:", symptom);
        
        if (symptom.dos_date !== undefined && symptom.dos_date !== null) {
          dateStr = symptom.dos_date;
          console.log("Using dos_date field:", dateStr);
        } else if (symptom.dosDate !== undefined && symptom.dosDate !== null) {
          dateStr = symptom.dosDate;
          console.log("Using dosDate field:", dateStr);
        } else if (symptom.date !== undefined && symptom.date !== null) {
          dateStr = symptom.date;
          console.log("Using date field:", dateStr);
        } else {
          // Look for any field that might contain date data
          for (const key of Object.keys(symptom)) {
            console.log(`Checking date field: ${key}, value: ${symptom[key]}`);
            if (key.toLowerCase().includes('date') && symptom[key] !== null && symptom[key] !== undefined) {
              dateStr = symptom[key];
              console.log(`Using detected field ${key} for date: "${dateStr}"`);
              break;
            }
          }
        }
        
        // If we still don't have a date, skip this record
        if (!dateStr) {
          console.warn("Could not find date for record:", symptom);
          return; // Skip this record
        }
        
        // Format date consistently
        const formattedDate = formatDateForDisplay(dateStr);
        dateSet.add(formattedDate);
        
        // Initialize symptom entry if needed
        if (!symptomMap[symptomSegment]) {
          symptomMap[symptomSegment] = {};
        }
        
        // Count occurrences of this symptom on this date
        symptomMap[symptomSegment][formattedDate] = 
          (symptomMap[symptomSegment][formattedDate] || 0) + 1;
      });
      
      // Sort dates chronologically
      const sortedDates = Array.from(dateSet).sort((a, b) => {
        try {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error("Error sorting dates:", a, b, e);
          return 0;
        }
      });
      
      console.log(`Found ${Object.keys(symptomMap).length} unique symptoms across ${sortedDates.length} dates`);
      
      // Create data in Nivo heatmap format
      const formattedData = Object.keys(symptomMap).map(symptom => {
        const row: any = { id: symptom };
        
        // For each date, add the count (or 0 if no occurrences)
        sortedDates.forEach(date => {
          row[date] = symptomMap[symptom][date] || 0;
        });
        
        return row;
      });
      
      // Log the formatted data structure
      if (formattedData.length > 0) {
        console.log("First formatted heatmap row sample:", formattedData[0]);
      }
      
      // Store the processed data
      setHeatmapData(formattedData);
      setDateKeys(sortedDates);
      
    } catch (error) {
      console.error("Error processing heatmap data:", error);
    }
  }, [data]);
  
  // Render loading or empty state
  if (!data || data.length === 0 || !heatmapData || heatmapData.length === 0 || dateKeys.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title || "Symptom Heatmap"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500">No data available for heatmap visualization</p>
        </CardContent>
      </Card>
    );
  }
  
  // Component height based on data size for better visualization
  const dynamicHeight = Math.max(450, heatmapData.length * 30);
  
  // Log what we're rendering
  console.log(`Rendering heatmap with ${heatmapData.length} rows and ${dateKeys.length} columns`);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title || "Symptom Heatmap"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <div style={{ height: dynamicHeight }}>
            <ResponsiveHeatMap
              data={heatmapData}
              keys={dateKeys as any}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 100, left: 200 }}
              forceSquare={false}
              axisTop={null}
              axisRight={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Frequency',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Date of Service',
                legendPosition: 'middle',
                legendOffset: 65
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Symptom',
                legendPosition: 'middle',
                legendOffset: -180
              }}
              colors={{
                type: 'sequential',
                scheme: 'blues'
              }}
              emptyColor="#ffffff"
              cellOpacity={1}
              cellBorderWidth={1}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
              tooltip={(props: any) => (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  borderRadius: '4px',
                }}>
                  <strong>{props.data?.id || 'Unknown'}</strong> <span style={{ color: '#666' }}>on</span> <strong>{props.xKey || 'Unknown date'}</strong>
                  <div>Frequency: <strong>{props.value || 0}</strong></div>
                </div>
              )}
              hoverTarget="cell"
              animate={true}
              motionConfig="gentle"
              legends={[
                {
                  anchor: 'right',
                  translateX: 50,
                  translateY: 0,
                  length: 100,
                  thickness: 12,
                  direction: 'column',
                  tickPosition: 'after',
                  tickSize: 3,
                  tickSpacing: 4,
                  tickOverlap: false,
                  title: 'Frequency',
                  titleAlign: 'start',
                  titleOffset: 4
                }
              ]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectSymptomHeatmap;