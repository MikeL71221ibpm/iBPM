// Population Health Charts Page with Category Selector
// This wraps the component in a proper page structure for direct viewing

import React from 'react';
import PopulationHealthCharts from '@/components/population-health-charts-controlling-file-05_23_25';
import { useQuery } from '@tanstack/react-query';

export default function PopulationHealthCharts05_23_25() {
  // Fetch visualization data for population health charts
  const { data, isLoading } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60000, // 1 minute
  });

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Population Health Charts with Category Selector</h1>
      <p className="text-muted-foreground mb-6">
        This version adds centralized category selection across all charts and enhanced export functionality.
      </p>
      
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <PopulationHealthCharts data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}