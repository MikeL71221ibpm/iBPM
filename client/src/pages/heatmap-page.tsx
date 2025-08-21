import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import SimpleHeatmapComponent from '@/components/SimpleHeatmapComponent';
import { getPatientIdFromSession } from "@/utils/patient-session-controlling-file-05_12_25";

// Data types available for heatmap visualization
const DATA_TYPES = [
  { id: 'symptom', label: 'Symptoms' },
  { id: 'diagnosis', label: 'Diagnoses' },
  { id: 'category', label: 'Diagnostic Categories' },
  { id: 'hrsn', label: 'HRSN Indicators' }
];

// Component for individual heatmap section using pivot data
const HeatmapSection = ({ 
  dataType, 
  patientId 
}: { 
  dataType: string; 
  patientId: string; 
}) => {
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Map dataType to API endpoint
  const getApiEndpoint = (dataType: string) => {
    switch(dataType) {
      case 'symptom': return `/api/pivot/symptom/${patientId}`;
      case 'diagnosis': return `/api/pivot/diagnosis/${patientId}`;
      case 'category': return `/api/pivot/diagnostic-category/${patientId}`;
      case 'hrsn': return `/api/pivot/hrsn/${patientId}`;
      default: return `/api/pivot/symptom/${patientId}`;
    }
  };
  
  // Fetch pivot data for the specific chart type
  const { data: pivotData, isLoading, error } = useQuery({
    queryKey: [getApiEndpoint(dataType)],
    enabled: !!patientId,
  });
  
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading {displayName}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading {displayName} data
      </div>
    );
  }

  if (!pivotData || !(pivotData as any).rows || !(pivotData as any).columns || !(pivotData as any).data) {
    return (
      <div className="text-center py-4 text-gray-500">
        No {displayName} data available
      </div>
    );
  }

  // Convert pivot data to the format expected by HeatmapComponent
  const convertedData: any[] = [];
  const rows = (pivotData as any).rows || [];
  const columns = (pivotData as any).columns || [];
  const data = (pivotData as any).data || {};

  // Create a synthetic data entry for each row-column combination
  rows.forEach((row: string) => {
    columns.forEach((col: string) => {
      const value = data[row]?.[col] || 0;
      if (value > 0) {
        // Create multiple entries based on the count to simulate frequency
        for (let i = 0; i < value; i++) {
          convertedData.push({
            id: convertedData.length + 1,
            dos_date: col,
            symptom_segment: dataType === 'symptom' ? row : null,
            diagnosis: dataType === 'diagnosis' ? row : null,
            diagnostic_category: dataType === 'category' ? row : null,
            hrsn_category: dataType === 'hrsn' ? row : null,
          });
        }
      }
    });
  });

  // Determine the indexBy field based on dataType
  const getIndexBy = (dataType: string) => {
    switch(dataType) {
      case 'symptom': return 'symptomSegment';
      case 'diagnosis': return 'diagnosis';  
      case 'category': return 'diagnosticCategory';
      case 'hrsn': return 'symptomSegment'; // Use symptomSegment as fallback
      default: return 'symptomSegment';
    }
  };

  return (
    <SimpleHeatmapComponent 
      title={`${displayName} Heat Map`}
      data={convertedData}
      indexBy={getIndexBy(dataType)}
      chartId={`heatmap-${dataType}`}
    />
  );
};

export default function NivoHeatmapView() {
  const [patientId, setPatientId] = useState<string>(getPatientIdFromSession() || '');

  // If no patient selected, show selection interface
  if (!patientId) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Heatmap Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-500">
              Please select a patient from the search page to view heatmap data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Heatmap Analysis</CardTitle>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setPatientId('')}
              size="sm"
            >
              Select Different Patient
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid layout with all 4 heatmap charts - matching pivot table layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symptoms Heatmap */}
        <div className="h-auto">
          <HeatmapSection dataType="symptom" patientId={patientId} />
        </div>

        {/* Diagnoses Heatmap */}
        <div className="h-auto">
          <HeatmapSection dataType="diagnosis" patientId={patientId} />
        </div>

        {/* Diagnostic Categories Heatmap */}
        <div className="h-auto">
          <HeatmapSection dataType="category" patientId={patientId} />
        </div>

        {/* HRSN Indicators Heatmap */}
        <div className="h-auto">
          <HeatmapSection dataType="hrsn" patientId={patientId} />
        </div>
      </div>
    </div>
  );
}