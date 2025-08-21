import React from 'react';
import { useRoute } from 'wouter';
import PatientHeatmapCollection from '@/components/patient-heatmap-collection-controlling-file-05_24_25';

const HeatmapVisualizationPage: React.FC = () => {
  // Check if we're on a direct path with a patient ID
  const [, params] = useRoute('/heatmap-direct/:patientId');
  const directPatientId = params?.patientId;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pt-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Heatmap Visualizations</h1>
          <p className="text-muted-foreground mt-2">
            Explore patient data through interactive heatmaps that visualize symptoms, diagnoses, diagnostic categories, and HRSN Z-codes over time.
          </p>
        </div>
        
        <PatientHeatmapCollection initialPatientId={directPatientId} />
      </div>
    </div>
  );
};

export default HeatmapVisualizationPage;