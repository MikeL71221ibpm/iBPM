import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractedSymptom } from '@shared/schema';

// This is a simplified debugging version of the heatmap to understand format issues
const DebugHeatmap = ({ data }: { data: any[] }) => {
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      console.log("No data provided to DebugHeatmap");
      return;
    }

    // Extract and log all symptom_segment values directly
    console.log("=========== SYMPTOM SEGMENT DEBUG ============");
    const segmentMap: Record<string, number> = {};
    
    const firstItem = data[0];
    console.log("First item structure:", {
      id: firstItem.id,
      patient_id: firstItem.patient_id,
      patientId: firstItem.patientId,
      symptom_segment: firstItem.symptom_segment,
      symptomSegment: firstItem.symptomSegment,
      dosDate: firstItem.dosDate,
      dos_date: firstItem.dos_date,
      allKeys: Object.keys(firstItem).join(', ')
    });

    data.forEach((symptom, index) => {
      // Extract the symptom segment value, whichever form it's in
      const segmentValue = symptom.symptom_segment ?? symptom.symptomSegment ?? 'MISSING';
      
      // Count unique values
      segmentMap[segmentValue] = (segmentMap[segmentValue] || 0) + 1;
      
      // Log a sample of the symptoms
      if (index < 5) {
        console.log(`Symptom ${index}:`, {
          raw: symptom,
          extracted: segmentValue
        });
      }
    });
    
    // List all unique symptom segments
    console.log("All unique symptom segments:", Object.keys(segmentMap));
    console.log("Counts per segment:", segmentMap);
    
    // Process into a simple table for display
    const tableData = Object.entries(segmentMap)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([segment, count]) => ({ segment, count }));
    
    setProcessedData(tableData);
    
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Symptom Segments Debug</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-gray-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symptom Segments Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symptom Segment
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {item.segment}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {item.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugHeatmap;