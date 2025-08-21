// Population Health Percentage View - May 21, 2025
// This is a dedicated percentage view that doesn't attempt to toggle

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Filter, RotateCcw, FileDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import PopulationHealthCharts from "../components/population-health-charts-fixed-toggle-05_21_25";
import NavigationButton from "@/components/NavigationButton";

export default function PopulationHealthPercentageOnly() {
  const [location, navigate] = useLocation();
  
  // Fetch visualization data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60 * 1000, // 1 minute
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics (Percentage View)</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive health analytics as percentages
            </p>
          </div>
          <NavigationButton href="/">Return to Count View</NavigationButton>
        </div>
        <div className="grid place-items-center h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading visualization data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics (Percentage View)</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive health analytics as percentages
            </p>
          </div>
          <NavigationButton href="/">Return to Count View</NavigationButton>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load visualization data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics (Percentage View)</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive health analytics as percentages
          </p>
        </div>
        <NavigationButton href="/">Return to Count View</NavigationButton>
      </div>
      
      {/* Use our chart component but force percentage mode */}
      <PopulationHealthCharts 
        data={data} 
        isLoading={isLoading}
        displayMode="percentage"
      />
    </div>
  );
}