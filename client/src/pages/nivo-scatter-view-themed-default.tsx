import React from 'react';
import { useParams, useLocation } from 'wouter';

// Importing the multi-series grid view component
import NivoMultiSeries from './nivo-multi-series';

interface PatientVisualizationParams {
  patientId?: string;
}

export default function DefaultNivoScatterViewThemed() {
  const params = useParams<PatientVisualizationParams>();
  const patientId = params.patientId || '1';
  const [, setLocation] = useLocation();
  
  // Redirect to the multi-series grid view component
  React.useEffect(() => {
    setLocation(`/nivo-multi-series/${patientId}`);
  }, [patientId, setLocation]);
  
  // While redirecting, show a loading message
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Redirecting to visualization grid...</p>
      </div>
    </div>
  );
}