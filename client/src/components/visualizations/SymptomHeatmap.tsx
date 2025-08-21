import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeHeatMap } from "../utils/NivoKeyFix";

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

interface SymptomHeatmapProps {
  title: string;
  data: any[];
}

/**
 * SymptomHeatmap component - Shows symptom tracking over time
 * Uses symptom_segment as rows and dates as columns
 */
const SymptomHeatmap: React.FC<SymptomHeatmapProps> = ({ title, data }) => {
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const [sortedDates, setSortedDates] = useState<string[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    console.log(`Processing ${data.length} symptoms for heatmap visualization`);
    
    // Debug: Log the first few symptom objects to see their structure
    console.log("Sample symptom data:", JSON.stringify(data.slice(0, 3), null, 2));
    
    // Maps for data processing
    const symptomDateCounts: Record<string, Record<string, number>> = {};
    const realDates = new Set<string>();
    const uniqueSymptoms = new Set<string>();
    
    // First pass: collect all dates and symptoms, and count occurrences
    data.forEach((symptom, index) => {
      if (!symptom) return;

      // Access fields safely with lots of debug info
      console.log("DEBUG RAW SYMPTOM:", symptom);
      
      // Guaranteed extraction of symptom segment with priority on snake_case format
      let symptomSegment: string | undefined;
      
      // Snake_case format from database fields
      if (symptom.symptom_segment !== undefined && symptom.symptom_segment !== null) {
        // Normalize whitespace in the symptom segment
        symptomSegment = typeof symptom.symptom_segment === 'string' 
          ? symptom.symptom_segment.trim().replace(/\s+/g, ' ')
          : String(symptom.symptom_segment);
        
        console.log(`Normalized snake_case symptom_segment from "${symptom.symptom_segment}" to "${symptomSegment}"`);
      } 
      // Camel case format from converted fields
      else if (symptom.symptomSegment !== undefined && symptom.symptomSegment !== null) {
        // Normalize whitespace in the symptom segment
        symptomSegment = typeof symptom.symptomSegment === 'string'
          ? symptom.symptomSegment.trim().replace(/\s+/g, ' ')
          : String(symptom.symptomSegment);
        
        console.log(`Normalized camelCase symptomSegment from "${symptom.symptomSegment}" to "${symptomSegment}"`);
      } 
      // Last resort: inspect all keys and try to find anything that might be a symptom
      else {
        // Get all available keys in the object
        const keys = Object.keys(symptom);
        
        // First try keys that have "symptom" in their name
        const symptomKeys = keys.filter(k => k.toLowerCase().includes('symptom') && 
                                       !k.toLowerCase().includes('id') && 
                                       symptom[k] !== null && 
                                       symptom[k] !== undefined);
        
        if (symptomKeys.length > 0) {
          // Prefer keys that specifically include "segment"
          const segmentKey = symptomKeys.find(k => k.toLowerCase().includes('segment'));
          if (segmentKey) {
            // Normalize whitespace in the symptom segment
            let rawSegment = symptom[segmentKey];
            symptomSegment = typeof rawSegment === 'string'
              ? rawSegment.trim().replace(/\s+/g, ' ')
              : String(rawSegment);
            
            console.log(`Normalized found symptom segment key ${segmentKey}: from "${rawSegment}" to "${symptomSegment}"`);
          } else {
            // Use the first symptom-related key we found
            let rawSegment = symptom[symptomKeys[0]];
            symptomSegment = typeof rawSegment === 'string'
              ? rawSegment.trim().replace(/\s+/g, ' ')
              : String(rawSegment);
            
            console.log(`Normalized alternative symptom key ${symptomKeys[0]}: from "${rawSegment}" to "${symptomSegment}"`);
          }
        } else {
          // If no symptom keys are found, check if there's a "text" or "name" field as last resort
          const textKey = keys.find(k => ['text', 'name', 'label', 'value'].includes(k.toLowerCase()));
          if (textKey && symptom[textKey]) {
            // Normalize whitespace in the fallback text field
            let rawSegment = symptom[textKey];
            symptomSegment = typeof rawSegment === 'string'
              ? rawSegment.trim().replace(/\s+/g, ' ')
              : String(rawSegment);
            
            console.log(`Normalized text field as fallback ${textKey}: from "${rawSegment}" to "${symptomSegment}"`);
          } else {
            // Absolute last resort
            symptomSegment = "Unknown Symptom";
            console.warn("No suitable symptom data found in object:", symptom);
          }
        }
      }
      
      // Extract date with robust handling
      let dateStr: string | undefined;
      
      // Try various possible date field names in order of preference
      if (symptom.dos_date !== undefined && symptom.dos_date !== null) {
        dateStr = symptom.dos_date;
      } 
      else if (symptom.dosDate !== undefined && symptom.dosDate !== null) {
        dateStr = symptom.dosDate;
      } 
      else if (symptom.date !== undefined && symptom.date !== null) {
        dateStr = symptom.date;
      }
      else if (symptom.serviceDate !== undefined && symptom.serviceDate !== null) {
        dateStr = symptom.serviceDate;
      }
      else {
        // Final fallback using any key that might contain a date
        const keys = Object.keys(symptom);
        const dateKey = keys.find(k => 
          k.toLowerCase().includes('date') && 
          symptom[k] !== null && 
          symptom[k] !== undefined
        );
        
        if (dateKey) {
          dateStr = symptom[dateKey];
          console.log(`Using fallback date field: ${dateKey} = "${dateStr}"`);
        } else {
          console.warn("No date field found in object:", symptom);
          // Without a date, the symptom can't be placed on the timeline
          dateStr = undefined;
        }
      }
      
      // Debug: Log some sample symptoms to verify fields are extracted correctly
      if (index < 5) {
        console.log(`Symptom ${index}:`, { 
          raw: symptom,
          extracted: { symptomSegment, dateStr }
        });
      }
      
      // Skip if missing critical data
      if (!symptomSegment || !dateStr) {
        console.warn(`Skipping symptom due to missing data:`, symptom);
        return;
      }
      
      // Format date consistently
      const formattedDate = formatDateForDisplay(dateStr);
      
      // Track the date and symptom
      realDates.add(formattedDate);
      uniqueSymptoms.add(symptomSegment);
      
      // Initialize if needed
      if (!symptomDateCounts[symptomSegment]) {
        symptomDateCounts[symptomSegment] = {};
      }
      
      // Count occurrences 
      symptomDateCounts[symptomSegment][formattedDate] = 
        (symptomDateCounts[symptomSegment][formattedDate] || 0) + 1;
    });
    
    // Sort the dates chronologically
    const dates = Array.from(realDates);
    const sorted = dates.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
    
    setSortedDates(sorted);
    console.log("Sorted dates for chart:", sorted);

    // Build data in the format expected by Nivo
    // The key difference in this format is that the symptom is the row ID 
    // and each column is a date with a value for frequency
    const heatmapData: any[] = [];
    
    // Go through each unique symptom and create a row for it
    const allSymptoms = Array.from(uniqueSymptoms);
    
    // Sort symptoms alphabetically for better readability
    allSymptoms.sort();
    
    allSymptoms.forEach(symptom => {
      // Create a row object with the symptom as the ID
      const row: any = {
        id: symptom
      };
      
      // For each date, add a count value (0 if no occurrences)
      sorted.forEach(date => {
        row[date] = symptomDateCounts[symptom][date] || 0;
      });
      
      // Add this row to our dataset
      heatmapData.push(row);
    });
    
    setFormattedData(heatmapData);
  }, [data]);

  if (!data || data.length === 0 || !formattedData || formattedData.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500">No data available for visualization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] overflow-auto">
          {/* Increase height based on number of symptoms to ensure visibility */}
          <div style={{ height: Math.max(600, formattedData.length * 40) }}>
            <SafeHeatMap
              data={formattedData}
              keys={sortedDates}
              indexBy="id"
              margin={{ top: 20, right: 120, bottom: 80, left: 250 }}
              forceSquare={false}
              axisTop={null}
              axisRight={{
                legend: 'Frequency',
                legendPosition: 'middle',
                legendOffset: 50
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: -45,
                legend: 'Date of Service',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: 0,
                legend: 'Symptom',
                legendPosition: 'middle',
                legendOffset: -200
              }}
              cellOpacity={1}
              cellBorderWidth={1}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
              colors={{
                type: 'sequential',
                scheme: 'blues'
              }}
              emptyColor="#ffffff" 
              borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              hoverTarget="cell"
              tooltip={({ data, value, xKey, yKey, color }) => (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  borderRadius: '4px',
                }}>
                  <strong>{data.id}</strong> <span style={{ color: '#666' }}>on</span> <strong>{xKey}</strong>
                  <div>Frequency: <strong>{value}</strong></div>
                </div>
              )}
              animate={true}
              motionConfig="gentle"
              legends={[
                {
                  anchor: 'right',
                  translateX: 40,
                  translateY: 0,
                  length: 200,
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

export default SymptomHeatmap;