// Population Health Page with Export Buttons
// This page wraps the population-health-charts-controlling-file-05_23_25.tsx component that has
// the export buttons directly visible in the chart headers

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PopulationHealthCharts from '@/components/population-health-charts-controlling-file-05_23_25';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PopulationHealthWithExports() {
  const [, setLocation] = useLocation();
  
  // Fetch visualization data for population health charts
  const { data, isLoading } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60000, // 1 minute
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Population Health Charts with Export Options</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm p-4 mb-6">
        <p className="text-muted-foreground">
          This page includes direct export buttons on each chart. Look for the CSV and Excel buttons in the top-right corner of each chart card.
        </p>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <PopulationHealthCharts data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}