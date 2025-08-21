import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HeatmapComponent from '@/components/heatmap-component-controlling-file-05_09_25';
// Function to get patient ID from URL params
const getPatientIdFromSession = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('patientId') || '';
};

// Data types available for heatmap visualization
const DATA_TYPES = [
  { id: 'symptom', label: 'Symptoms' },
  { id: 'diagnosis', label: 'Diagnoses' },
  { id: 'category', label: 'Diagnostic Categories' }
];

// Component for individual heatmap section
const HeatmapSection = ({ 
  dataType, 
  patientId 
}: { 
  dataType: string; 
  patientId: string; 
}) => {
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Fetch extracted symptoms data for the patient
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/patient/extracted-symptoms', patientId],
    enabled: !!patientId,
  });
  
  // Determine the indexBy field based on dataType
  const getIndexBy = (dataType: string) => {
    switch(dataType) {
      case 'symptom': return 'symptomSegment';
      case 'diagnosis': return 'diagnosis';  
      case 'category': return 'diagnosticCategory';
      default: return 'symptomSegment';
    }
  };
  
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

  if (!data || !Array.isArray(data)) {
    return (
      <div className="text-center py-4 text-gray-500">
        No {displayName} data available
      </div>
    );
  }

  return (
    <HeatmapComponent 
      title={`${displayName} Heat Map`}
      data={data}
      indexBy={getIndexBy(dataType)}
    />
  );
};

export default function NivoHeatmapView() {
  const [selectedDataType, setSelectedDataType] = useState<string>('symptom');
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
            <div className="flex items-center gap-2">
              <label htmlFor="dataType" className="text-sm font-medium">
                Data Type:
              </label>
              <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setPatientId('')}
              size="sm"
            >
              Select Different Patient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <HeatmapSection 
            dataType={selectedDataType}
            patientId={patientId}
          />
        </CardContent>
      </Card>
    </div>
  );
}