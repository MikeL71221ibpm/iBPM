import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FallbackHeatmap from './FallbackHeatmap';

// Add loggedSymptomData to window type
declare global {
  interface Window {
    loggedSymptomData?: boolean;
  }
}

// Type definitions
interface FinalSymptomHeatmapProps {
  data: any[];
  title?: string;
}

// Type for heatmap data
interface HeatmapDataPoint {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
}

// Helper function to normalize whitespace
const normalizeWhitespace = (str: string): string => {
  return typeof str === 'string' ? str.trim().replace(/\s+/g, ' ') : String(str);
};

// Helper function to parse and format a date consistently
const formatDate = (dateStr: string): string => {
  try {
    // First normalize the date format to avoid timezone issues
    // We're trying to just get MM/DD/YY format consistently
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
  } catch (e) {
    console.error("Date parsing error:", e);
    return dateStr;
  }
};

// Main component
const FinalSymptomHeatmap: React.FC<FinalSymptomHeatmapProps> = ({ data, title }) => {
  // State for the processed data in expected format for our FallbackHeatmap
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  
  // Process data for the heatmap
  useEffect(() => {
    if (!data || data.length === 0) {
      console.log("No symptom data provided");
      return;
    }
    
    console.log(`Processing ${data.length} symptoms for custom heatmap`);
    
    try {
      // Track symptom occurrences by date
      const symptomsByDate: Record<string, Record<string, number>> = {};
      
      // First pass: extract data about symptoms and their dates
      data.forEach(symptom => {
        // Extract symptom text
        let symptomText = null;
        if (symptom.symptom_segment) symptomText = normalizeWhitespace(symptom.symptom_segment);
        else if (symptom.symptomSegment) symptomText = normalizeWhitespace(symptom.symptomSegment);
        else if (symptom.sympProb) symptomText = normalizeWhitespace(symptom.sympProb);
        else if (symptom.symptomProblem) symptomText = normalizeWhitespace(symptom.symptomProblem);
        
        // Log sample data for debugging (first 2 items only)
        if (!window.loggedSymptomData && (symptom.id <= 3780)) {
          console.log("Symptom data structure:", JSON.stringify(symptom, null, 2));
          if (symptom.id === 3780) window.loggedSymptomData = true;
        }
        
        // Skip if no symptom text found
        if (!symptomText) return;
        
        // Apply additional cleanup to symptom text
        symptomText = symptomText.trim().replace(/^\s+/, '');
        
        // Extract date string
        let rawDateStr = null;
        if (symptom.dos_date) rawDateStr = symptom.dos_date;
        else if (symptom.dosDate) rawDateStr = symptom.dosDate;
        
        // Skip if no date found
        if (!rawDateStr) return;
        
        // Format date consistently as MM/DD/YY
        const formattedDate = formatDate(rawDateStr);
        
        // Initialize symptom record if needed
        if (!symptomsByDate[symptomText]) {
          symptomsByDate[symptomText] = {};
        }
        
        // Count occurrence
        if (!symptomsByDate[symptomText][formattedDate]) {
          symptomsByDate[symptomText][formattedDate] = 1;
        } else {
          symptomsByDate[symptomText][formattedDate]++;
        }
      });
      
      // Get unique symptoms and sort by total occurrences
      const symptoms = Object.keys(symptomsByDate)
        .map(symptom => ({
          symptom,
          total: Object.values(symptomsByDate[symptom]).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(item => item.symptom);
        
      // Take top symptoms (limit to 25 to prevent overwhelming the chart)
      const topSymptoms = symptoms.slice(0, 25);
      
      // Transform to format expected by our FallbackHeatmap component
      const heatmapItems: HeatmapDataPoint[] = topSymptoms.map(symptom => {
        const dates = symptomsByDate[symptom];
        
        // Create data points for each date
        const dataPoints = Object.entries(dates).map(([date, count]) => ({
          x: date,
          y: count
        }));
        
        return {
          id: symptom,
          data: dataPoints
        };
      });
      
      // Update state with processed data
      setHeatmapData(heatmapItems);
      
    } catch (error) {
      console.error("Error processing heatmap data:", error);
    }
  }, [data]);
  
  // Show loading or empty state
  if (!heatmapData || heatmapData.length === 0) {
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
  
  // Render the custom fallback heatmap
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title || "Symptom Heatmap"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <FallbackHeatmap 
            data={heatmapData}
            title=""  // Already have title in the card header
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalSymptomHeatmap;